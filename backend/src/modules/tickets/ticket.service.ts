import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { existsSync } from 'fs';
import { join } from 'path';
import { isAdminRole, Role } from '../../common/enums/role.enum';
import { StatusType } from '../../common/enums/status-type.enum';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { decodeFileName, resolveUploadDir } from '../../common/utils/upload.util';
import { addHours } from '../../common/utils/query.util';
import { ClientProductRepo } from '../masters/client-product/client-product.repo';
import { ClientProductService } from '../masters/client-product/client-product.service';
import { ContactRepo } from '../masters/contact/contact.repo';
import { EmployeeRepo } from '../masters/employee/employee.repo';
import { ModuleRepo } from '../masters/module/module.repo';
import { Priority } from '../masters/priority/priority.entity';
import { PriorityRepo } from '../masters/priority/priority.repo';
import { StatusRepo } from '../masters/status/status.repo';
import { TicketTypeRepo } from '../masters/ticket-type/ticket-type.repo';
import { MessagingService } from '../messaging/messaging.service';
import { BulkUpdateTicketDto } from './dto/bulk-update-ticket.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { NotifyTicketDto } from './dto/notify-ticket.dto';
import { TicketQueryDto } from './dto/ticket-query.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketHistory } from './ticket-history.entity';
import { TicketNotification } from './ticket-notification.entity';
import { Ticket } from './ticket.entity';
import { TicketRepo } from './ticket.repo';
import { canSeeTicket, inPairs, TicketScope } from './ticket-scope';

type Change = Pick<TicketHistory, 'field' | 'oldValue' | 'newValue'>;

const clip = (value: string | null | undefined): string | null =>
  value == null || value === '' ? null : value.length > 250 ? `${value.slice(0, 247)}...` : value;

const emptyToNull = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

/**
 * TKT-<client code>-<product code>-<mm>/<yy>/<number>, e.g. TKT-SAKKU-HRMS-11/26/00042.
 * The last part is the ticket's id, so it never repeats.
 */
export const formatTicketNo = (id: number, createdAt: Date, clientCode: string, productCode: string): string => {
  const mm = String(createdAt.getMonth() + 1).padStart(2, '0');
  const yy = String(createdAt.getFullYear() % 100).padStart(2, '0');
  return `TKT-${clientCode}-${productCode}-${mm}/${yy}/${String(id).padStart(5, '0')}`;
};

@Injectable()
export class TicketService {
  constructor(
    private readonly ticketRepo: TicketRepo,
    private readonly clientProductRepo: ClientProductRepo,
    private readonly clientProductService: ClientProductService,
    private readonly moduleRepo: ModuleRepo,
    private readonly ticketTypeRepo: TicketTypeRepo,
    private readonly priorityRepo: PriorityRepo,
    private readonly statusRepo: StatusRepo,
    private readonly employeeRepo: EmployeeRepo,
    private readonly contactRepo: ContactRepo,
    private readonly messaging: MessagingService,
  ) {}

  /** Super admins see everything; admins and employees see their client products' tickets and their own. */
  async scopeFor(user: AuthUser): Promise<TicketScope | null> {
    if (user.role === Role.SuperAdmin) return null;
    return { userId: user.id, pairs: await this.employeeRepo.pairsOf(user.id) };
  }

  private async assertCanSee(ticket: Ticket, user: AuthUser) {
    if (!canSeeTicket(ticket, await this.scopeFor(user))) {
      // same answer as a missing ticket, so numbers of other organizations' tickets are not revealed
      throw new NotFoundException(`Ticket ${ticket.ticketNo} not found`);
    }
  }

  async list(query: TicketQueryDto, user: AuthUser) {
    return this.ticketRepo.search(query, user.id, await this.scopeFor(user));
  }

  async counts(user: AuthUser) {
    return this.ticketRepo.viewCounts(user.id, await this.scopeFor(user));
  }

  /** key = numeric id or ticket number (TKT-SAKKU-HRMS-11/26/00128). Pass the user to check they may see it. */
  async findOne(key: string, user?: AuthUser) {
    const ticket = /^\d+$/.test(key)
      ? await this.ticketRepo.findDetail(Number(key))
      : await this.ticketRepo.findDetailByNo(key.toUpperCase());
    if (!ticket) throw new NotFoundException(`Ticket ${key} not found`);
    if (user) await this.assertCanSee(ticket, user);

    const [replies, attachments, history, notifications] = await Promise.all([
      this.ticketRepo.findReplies(ticket.id),
      this.ticketRepo.findAttachments(ticket.id),
      this.ticketRepo.findHistory(ticket.id),
      this.ticketRepo.findNotifications(ticket.id),
    ]);
    return {
      ...ticket,
      replies,
      attachments,
      history,
      notifications,
      messaging: { email: this.messaging.mailReady, whatsapp: this.messaging.whatsappReady },
    };
  }

  private async getTicket(id: number, user: AuthUser): Promise<Ticket> {
    const ticket = await this.ticketRepo.findDetail(id);
    if (!ticket) throw new NotFoundException('Ticket not found');
    await this.assertCanSee(ticket, user);
    return ticket;
  }

  async create(dto: CreateTicketDto, user: AuthUser) {
    const mapping = await this.clientProductRepo.findPair(dto.clientId, dto.productId);
    if (!mapping) throw new BadRequestException('This product is not mapped to the selected client');
    if (!mapping.isActive || !mapping.client.isActive || !mapping.product.isActive) {
      throw new BadRequestException(`${mapping.product.name} for ${mapping.client.name} is inactive`);
    }

    // admins and employees with assignments may only raise tickets for those client products
    const scope = await this.scopeFor(user);
    if (scope?.pairs.length && !inPairs(scope.pairs, mapping.clientId, mapping.productId)) {
      throw new BadRequestException('You can only raise tickets for the client products you are assigned to');
    }

    if (dto.moduleId) await this.ensureModule(dto.moduleId, mapping.productId);
    const ticketType = await this.resolveTicketType(dto.ticketTypeId);

    const priority = dto.priorityId
      ? await this.priorityRepo.findById(dto.priorityId)
      : await this.priorityRepo.findDefault();
    if (!priority) throw new BadRequestException('No priority found. Add priorities in Masters › Priority.');

    const status = await this.statusRepo.findDefault();
    if (!status) throw new BadRequestException('No default status. Set one in Masters › Status.');

    if (dto.assignedToId) await this.ensureAssignable(dto.assignedToId, mapping.clientId, mapping.productId);
    // the person raising the ticket is the logged-in employee
    const raiser = await this.ensureEmployee(user.id);

    const now = new Date();
    const sla = await this.clientProductService.slaFor(mapping.clientId, mapping.productId, priority);
    const ticket = await this.ticketRepo.create({
      clientId: mapping.clientId,
      productId: mapping.productId,
      moduleId: dto.moduleId ?? null,
      ticketTypeId: ticketType.id,
      raisedById: raiser.id,
      username: raiser.name,
      email: raiser.email,
      phone: raiser.mobile,
      subject: dto.subject.trim(),
      description: dto.description.trim(),
      priorityId: priority.id,
      slaResponseHrs: sla.responseHrs,
      slaResolveHrs: sla.resolveHrs,
      statusId: status.id,
      assignedToId: dto.assignedToId ?? null,
      createdById: user.id,
      dueAt: addHours(now, sla.resolveHrs),
    });

    await this.ticketRepo.update(ticket.id, {
      ticketNo: formatTicketNo(ticket.id, now, mapping.client.code, mapping.product.code),
    });
    await this.ticketRepo.addHistory([
      { ticketId: ticket.id, action: 'created', changedById: user.id, newValue: status.name },
    ]);
    return this.findOne(String(ticket.id));
  }

  async update(id: number, dto: UpdateTicketDto, user: AuthUser) {
    const ticket = await this.getTicket(id, user);
    if (ticket.status?.locksTicket) {
      const onlyStatus = Object.keys(dto).every((k) => k === 'statusId' || k === 'resolutionNote');
      if (!(isAdminRole(user.role) && onlyStatus && dto.statusId !== undefined)) {
        throw new BadRequestException(`Ticket ${ticket.ticketNo} is ${ticket.status.name} and can no longer be changed`);
      }
    }
    const patch: Partial<Ticket> = {};
    const changes: Change[] = [];
    const record = (field: string, oldValue?: string | null, newValue?: string | null) =>
      changes.push({ field, oldValue: clip(oldValue), newValue: clip(newValue) });

    // Client and product (the pair must be mapped; clears the module when the product changes)
    const nextClientId = dto.clientId ?? ticket.clientId;
    const nextProductId = dto.productId ?? ticket.productId;
    const pairChanged = nextClientId !== ticket.clientId || nextProductId !== ticket.productId;
    if (pairChanged) {
      if (!nextClientId) throw new BadRequestException('Select a client');
      const mapping = await this.clientProductRepo.findPair(nextClientId, nextProductId);
      if (!mapping) throw new BadRequestException('This product is not mapped to the selected client');
      const scope = await this.scopeFor(user);
      if (scope && !inPairs(scope.pairs, mapping.clientId, mapping.productId)) {
        throw new BadRequestException('You can only move a ticket to a client product you are assigned to');
      }
      if (nextClientId !== ticket.clientId) {
        patch.clientId = mapping.clientId;
        record('Client', ticket.client?.name, mapping.client.name);
      }
      // a contact belongs to one client product
      if (ticket.contactId && dto.contactId === undefined) {
        patch.contactId = null;
        record('Contact', ticket.contact?.name, null);
      }
      if (nextProductId !== ticket.productId) {
        patch.productId = mapping.productId;
        record('Product', ticket.product?.name, mapping.product.name);
        if (ticket.moduleId && dto.moduleId === undefined) {
          patch.moduleId = null;
          record('Module', ticket.module?.name, null);
        }
      }
    }

    // Module
    if (dto.moduleId !== undefined && dto.moduleId !== ticket.moduleId) {
      const module = dto.moduleId ? await this.ensureModule(dto.moduleId, nextProductId) : null;
      patch.moduleId = module?.id ?? null;
      record('Module', ticket.module?.name, module?.name ?? null);
    }

    // Ticket type
    if (dto.ticketTypeId !== undefined && dto.ticketTypeId !== ticket.ticketTypeId) {
      const type = await this.ticketTypeRepo.findById(dto.ticketTypeId);
      if (!type) throw new BadRequestException('Ticket type not found');
      patch.ticketTypeId = type.id;
      record('Ticket type', ticket.ticketType?.name, type.name);
    }

    // Plain text fields
    const textFields: { key: 'username' | 'email' | 'phone' | 'subject'; label: string }[] = [
      { key: 'username', label: 'Username' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'subject', label: 'Subject' },
    ];
    for (const { key, label } of textFields) {
      if (dto[key] === undefined) continue;
      const next = emptyToNull(dto[key]);
      if ((key === 'username' || key === 'subject') && !next) throw new BadRequestException(`${label} cannot be empty`);
      if (next !== ticket[key]) {
        (patch as Record<string, unknown>)[key] = next;
        record(label, ticket[key], next);
      }
    }

    // Priority, or a client product with other agreed SLA hours: moves the due date
    const priorityChanged = dto.priorityId !== undefined && dto.priorityId !== ticket.priorityId;
    if (priorityChanged || pairChanged) {
      let priority: Priority | null = ticket.priority;
      if (priorityChanged) {
        priority = await this.priorityRepo.findById(dto.priorityId as number);
        if (!priority) throw new BadRequestException('Priority not found');
        patch.priorityId = priority.id;
        record('Priority', ticket.priority?.name, priority.name);
      }
      const sla = await this.clientProductService.slaFor(nextClientId, nextProductId, priority);
      patch.slaResponseHrs = sla.responseHrs;
      patch.slaResolveHrs = sla.resolveHrs;
      patch.dueAt = addHours(new Date(ticket.createdAt), sla.resolveHrs);
    }

    // Assignee
    if (dto.assignedToId !== undefined && dto.assignedToId !== ticket.assignedToId) {
      const employee = dto.assignedToId ? await this.ensureAssignable(dto.assignedToId, nextClientId, nextProductId) : null;
      patch.assignedToId = employee?.id ?? null;
      record('Assigned to', ticket.assignedTo?.name ?? 'Unassigned', employee?.name ?? 'Unassigned');
    } else if (pairChanged && ticket.assignedToId) {
      // moved to another client product: the current assignee must work on it too
      await this.ensureAssignable(ticket.assignedToId, nextClientId, nextProductId);
    }

    // User contact
    if (dto.contactId !== undefined && dto.contactId !== ticket.contactId) {
      const contact = dto.contactId ? await this.contactRepo.findById(dto.contactId) : null;
      if (dto.contactId && (!contact || contact.clientId !== nextClientId || contact.productId !== nextProductId)) {
        throw new BadRequestException("The contact does not belong to this ticket's client product");
      }
      patch.contactId = contact?.id ?? null;
      record('Contact', ticket.contact?.name, contact?.name ?? null);
    }

    // Resolution note
    if (dto.resolutionNote !== undefined && emptyToNull(dto.resolutionNote) !== ticket.resolutionNote) {
      patch.resolutionNote = emptyToNull(dto.resolutionNote);
      record('Resolution note', ticket.resolutionNote, patch.resolutionNote);
    }

    // Status (checks the note and sets the resolved date)
    if (dto.statusId !== undefined && dto.statusId !== ticket.statusId) {
      const status = await this.statusRepo.findById(dto.statusId);
      if (!status) throw new BadRequestException('Status not found');
      const note = patch.resolutionNote !== undefined ? patch.resolutionNote : ticket.resolutionNote;
      if (status.requiresNote && !note) {
        throw new BadRequestException(`Add a resolution note before moving the ticket to ${status.name}`);
      }
      patch.statusId = status.id;
      if (status.type === StatusType.Closed) {
        patch.resolvedAt = ticket.status?.type === StatusType.Closed && ticket.resolvedAt ? ticket.resolvedAt : new Date();
      } else {
        patch.resolvedAt = null;
      }
      record('Status', ticket.status?.name, status.name);
    }

    if (changes.length) {
      await this.ticketRepo.update(id, patch);
      await this.ticketRepo.addHistory(
        changes.map((c) => ({ ...c, ticketId: id, action: 'updated' as const, changedById: user.id })),
      );
    }
    return this.findOne(String(id));
  }

  async bulkUpdate(dto: BulkUpdateTicketDto, user: AuthUser) {
    const { ids, ...changes } = dto;
    if (changes.statusId === undefined && changes.assignedToId === undefined && changes.priorityId === undefined) {
      throw new BadRequestException('Choose a status, priority or assignee to apply');
    }
    let updated = 0;
    const failed: { id: number; message: string }[] = [];
    for (const id of ids) {
      try {
        await this.update(id, changes, user);
        updated++;
      } catch (error) {
        failed.push({ id, message: error instanceof Error ? error.message : 'Update failed' });
      }
    }
    return { updated, failed };
  }

  async addReply(id: number, dto: CreateReplyDto, user: AuthUser) {
    const ticket = await this.getTicket(id, user);
    this.assertOpenForWork(ticket);
    const reply = await this.ticketRepo.addReply({ ticketId: id, authorId: user.id, body: dto.body.trim(), isInternal: false });

    if (!ticket.firstResponseAt) {
      await this.ticketRepo.update(id, { firstResponseAt: new Date() });
    }
    await this.ticketRepo.addHistory([
      { ticketId: id, action: 'replied', changedById: user.id, newValue: clip(dto.body.trim()) },
    ]);
    return reply;
  }

  /**
   * Sends the message to each chosen contact on each chosen channel and keeps a record of every send.
   * A contact without an email (or number) is skipped on that channel.
   */
  async notify(id: number, dto: NotifyTicketDto, user: AuthUser) {
    const ticket = await this.getTicket(id, user);
    const contacts = await this.contactRepo.findByIds(dto.contactIds);
    if (contacts.length !== dto.contactIds.length) throw new BadRequestException('One of the contacts no longer exists');
    const outsider = contacts.find((c) => c.clientId !== ticket.clientId || c.productId !== ticket.productId);
    if (outsider) throw new BadRequestException(`${outsider.name} is not a contact of this ticket's client product`);

    const subject = `[${ticket.ticketNo}] ${ticket.subject}`.slice(0, 200);
    const records: Partial<TicketNotification>[] = [];
    const skipped: string[] = [];

    for (const contact of contacts) {
      const message = dto.message.trim().replace(/\{name\}/gi, contact.name);
      for (const channel of dto.channels) {
        const to = channel === 'email' ? contact.email : contact.phone;
        if (!to) {
          skipped.push(`${contact.name} (no ${channel === 'email' ? 'email' : 'WhatsApp number'})`);
          continue;
        }
        const result =
          channel === 'email'
            ? await this.messaging.sendMail(to, subject, message)
            : await this.messaging.sendWhatsApp(to, {
                name: contact.name,
                ticket_no: ticket.ticketNo ?? '',
                subject: ticket.subject,
                status: ticket.status?.name ?? '',
                message,
              });
        records.push({
          ticketId: id,
          contactId: contact.id,
          recipientName: contact.name,
          channel,
          recipient: to,
          subject,
          message,
          status: result.status,
          error: result.error,
          sentById: user.id,
        });
      }
    }
    if (!records.length) throw new BadRequestException(`Nothing to send: ${skipped.join(', ')}`);

    const saved = await this.ticketRepo.addNotifications(records);
    const summary = saved.map((n) => `${n.recipientName} · ${n.channel === 'email' ? 'Email' : 'WhatsApp'}`).join(', ');
    await this.ticketRepo.addHistory([{ ticketId: id, action: 'notified', changedById: user.id, newValue: clip(summary) }]);

    return {
      sent: saved.filter((n) => n.status === 'sent').length,
      failed: saved.filter((n) => n.status === 'failed').length,
      notConfigured: saved.filter((n) => n.status === 'not_configured').length,
      skipped,
      notifications: await this.ticketRepo.findNotifications(id),
    };
  }

  async addAttachments(id: number, files: Express.Multer.File[], user: AuthUser, replyId?: number) {
    this.assertOpenForWork(await this.getTicket(id, user));
    if (!files?.length) throw new BadRequestException('Choose at least one file');

    const saved = await this.ticketRepo.addAttachments(
      files.map((f) => ({
        ticketId: id,
        replyId: replyId ?? null,
        fileName: decodeFileName(f.originalname),
        storedName: f.filename,
        mimeType: f.mimetype,
        size: f.size,
        uploadedById: user.id,
      })),
    );
    await this.ticketRepo.addHistory([
      {
        ticketId: id,
        action: 'attached',
        changedById: user.id,
        newValue: clip(saved.map((a) => a.fileName).join(', ')),
      },
    ]);
    return this.ticketRepo.findAttachments(id);
  }

  async getAttachmentFile(attachmentId: number, user: AuthUser) {
    const attachment = await this.ticketRepo.findAttachmentWithFile(attachmentId);
    if (!attachment) throw new NotFoundException('Attachment not found');
    await this.getTicket(attachment.ticketId, user);
    const path = join(resolveUploadDir(), attachment.storedName);
    if (!existsSync(path)) throw new NotFoundException('The file is missing from the server');
    return { path, fileName: attachment.fileName, mimeType: attachment.mimeType };
  }

  /** Closed (locking) tickets take no more replies or files. */
  private assertOpenForWork(ticket: Ticket) {
    if (ticket.status?.locksTicket) {
      throw new BadRequestException(`Ticket ${ticket.ticketNo} is ${ticket.status.name}. Replies and files are turned off.`);
    }
  }

  private async ensureModule(moduleId: number, productId: number) {
    const module = await this.moduleRepo.findById(moduleId);
    if (!module || module.productId !== productId) throw new BadRequestException('The module does not belong to the selected product');
    return module;
  }

  private async resolveTicketType(ticketTypeId?: number) {
    const type = ticketTypeId ? await this.ticketTypeRepo.findById(ticketTypeId) : await this.ticketTypeRepo.findDefault();
    if (!type) throw new BadRequestException('No ticket type found. Add one in Masters › Ticket types.');
    if (!type.isActive) throw new BadRequestException(`Ticket type ${type.name} is inactive`);
    return type;
  }

  private async ensureEmployee(employeeId: number) {
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) throw new BadRequestException('Your employee record was not found. Sign in again.');
    return employee;
  }

  /** Only an active employee mapped to the ticket's client product can be assigned. */
  private async ensureAssignable(employeeId: number, clientId: number | null, productId: number) {
    const employee = await this.employeeRepo.findById(employeeId, ['assignments']);
    if (!employee?.isActive) throw new BadRequestException('Assign the ticket to an active employee');
    if (!employee.assignments?.some((a) => a.clientId === clientId && a.productId === productId)) {
      throw new BadRequestException(`${employee.name} is not mapped to this ticket's client product`);
    }
    return employee;
  }
}
