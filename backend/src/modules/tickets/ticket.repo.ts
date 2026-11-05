import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository, SelectQueryBuilder } from 'typeorm';
import { BaseRepo } from '../../common/repositories/base.repo';
import { parseIdList } from '../../common/utils/query.util';
import { TicketQueryDto, TicketSortField } from './dto/ticket-query.dto';
import { TicketAttachment } from './ticket-attachment.entity';
import { TicketHistory } from './ticket-history.entity';
import { TicketNotification } from './ticket-notification.entity';
import { TicketReply } from './ticket-reply.entity';
import { Ticket } from './ticket.entity';
import { applyScope, scopeSql, TicketScope } from './ticket-scope';

const SORT_COLUMNS: Record<TicketSortField, string> = {
  createdAt: 't.createdAt',
  ticketNo: 't.id',
  dueAt: 't.dueAt',
  priority: 'priority.sortOrder',
  status: 'status.sortOrder',
  client: 'client.name',
  product: 'product.name',
  ticketType: 'ticketType.sortOrder',
  username: 't.username',
  subject: 't.subject',
  assignee: 'assignedTo.name',
};

export interface TicketViewCounts {
  all: number;
  open: number;
  closed: number;
  mine: number;
  unassigned: number;
  overdue: number;
}

@Injectable()
export class TicketRepo extends BaseRepo<Ticket> {
  constructor(
    @InjectRepository(Ticket) repo: Repository<Ticket>,
    @InjectRepository(TicketReply) private readonly replyRepo: Repository<TicketReply>,
    @InjectRepository(TicketHistory) private readonly historyRepo: Repository<TicketHistory>,
    @InjectRepository(TicketAttachment) private readonly attachmentRepo: Repository<TicketAttachment>,
    @InjectRepository(TicketNotification) private readonly notificationRepo: Repository<TicketNotification>,
  ) {
    super(repo);
  }

  /** Ticket with every lookup it shows in lists (all many-to-one, so limit/offset stay exact). */
  private baseQuery(): SelectQueryBuilder<Ticket> {
    return this.repo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.client', 'client')
      .leftJoinAndSelect('t.product', 'product')
      .leftJoinAndSelect('t.module', 'module')
      .leftJoinAndSelect('t.ticketType', 'ticketType')
      .leftJoinAndSelect('t.priority', 'priority')
      .leftJoinAndSelect('t.status', 'status')
      .leftJoinAndSelect('t.assignedTo', 'assignedTo')
      .leftJoinAndSelect('t.raisedBy', 'raisedBy')
      .leftJoinAndSelect('t.contact', 'contact')
      .leftJoinAndSelect('t.createdBy', 'createdBy');
  }

  async search(query: TicketQueryDto, userId: number, scope: TicketScope | null) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const qb = this.baseQuery();
    this.applyFilters(qb, query, userId);
    applyScope(qb, scope);

    qb.orderBy(SORT_COLUMNS[query.sortBy ?? 'createdAt'], query.sortDir ?? 'DESC')
      .addOrderBy('t.id', 'DESC')
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, pageSize };
  }

  private applyFilters(qb: SelectQueryBuilder<Ticket>, q: TicketQueryDto, userId: number) {
    if (q.search?.trim()) {
      qb.andWhere('(t.ticketNo LIKE :s OR t.username LIKE :s OR t.subject LIKE :s OR t.email LIKE :s OR client.name LIKE :s)', {
        s: `%${q.search.trim()}%`,
      });
    }

    const clientIds = parseIdList(q.clientIds);
    if (clientIds.length) qb.andWhere('t.clientId IN (:...clientIds)', { clientIds });
    const ticketTypeIds = parseIdList(q.ticketTypeIds);
    if (ticketTypeIds.length) qb.andWhere('t.ticketTypeId IN (:...ticketTypeIds)', { ticketTypeIds });
    const productIds = parseIdList(q.productIds);
    if (productIds.length) qb.andWhere('t.productId IN (:...productIds)', { productIds });
    const statusIds = parseIdList(q.statusIds);
    if (statusIds.length) qb.andWhere('t.statusId IN (:...statusIds)', { statusIds });
    const priorityIds = parseIdList(q.priorityIds);
    if (priorityIds.length) qb.andWhere('t.priorityId IN (:...priorityIds)', { priorityIds });

    if (q.assignee === 'me') qb.andWhere('t.assignedToId = :userId', { userId });
    else if (q.assignee === 'unassigned') qb.andWhere('t.assignedToId IS NULL');
    else if (q.assignee && /^\d+$/.test(q.assignee)) qb.andWhere('t.assignedToId = :assigneeId', { assigneeId: Number(q.assignee) });

    if (q.view === 'open') qb.andWhere(`status.type = 'open'`);
    if (q.view === 'closed') qb.andWhere(`status.type = 'closed'`);

    if (q.overdue === 'true') {
      qb.andWhere(`status.type = 'open' AND status.pausesSla = false AND t.dueAt < NOW()`);
    }

    if (q.from) qb.andWhere('t.createdAt >= :from', { from: `${q.from.slice(0, 10)} 00:00:00` });
    if (q.to) qb.andWhere('t.createdAt <= :to', { to: `${q.to.slice(0, 10)} 23:59:59` });
  }

  async viewCounts(userId: number, scope: TicketScope | null): Promise<TicketViewCounts> {
    const visible = scopeSql(scope);
    const [row] = await this.manager.query(
      `SELECT COUNT(*) AS \`all\`,
              COALESCE(SUM(s.type = 'open'), 0) AS \`open\`,
              COALESCE(SUM(s.type = 'closed'), 0) AS closed,
              COALESCE(SUM(s.type = 'open' AND t.assigned_to_id = ?), 0) AS mine,
              COALESCE(SUM(s.type = 'open' AND t.assigned_to_id IS NULL), 0) AS unassigned,
              COALESCE(SUM(s.type = 'open' AND s.pauses_sla = 0 AND t.due_at < NOW()), 0) AS overdue
         FROM tickets t
         JOIN statuses s ON s.id = t.status_id
        WHERE ${visible.sql}`,
      [userId, ...visible.params],
    );
    return {
      all: Number(row.all),
      open: Number(row.open),
      closed: Number(row.closed),
      mine: Number(row.mine),
      unassigned: Number(row.unassigned),
      overdue: Number(row.overdue),
    };
  }

  findDetail(id: number): Promise<Ticket | null> {
    return this.baseQuery().where('t.id = :id', { id }).getOne();
  }

  findDetailByNo(ticketNo: string): Promise<Ticket | null> {
    return this.baseQuery().where('t.ticketNo = :ticketNo', { ticketNo }).getOne();
  }

  recent(limit: number, scope: TicketScope | null, filter: { clientId?: number; productId?: number } = {}): Promise<Ticket[]> {
    const qb = this.baseQuery();
    applyScope(qb, scope);
    if (filter.clientId) qb.andWhere('t.clientId = :fClient', { fClient: filter.clientId });
    if (filter.productId) qb.andWhere('t.productId = :fProduct', { fProduct: filter.productId });
    return qb.orderBy('t.createdAt', 'DESC').addOrderBy('t.id', 'DESC').limit(limit).getMany();
  }

  // ---- replies ----
  findReplies(ticketId: number): Promise<TicketReply[]> {
    return this.replyRepo.find({ where: { ticketId }, relations: ['author'], order: { createdAt: 'ASC', id: 'ASC' } });
  }

  async addReply(data: DeepPartial<TicketReply>): Promise<TicketReply> {
    const saved = await this.replyRepo.save(this.replyRepo.create(data));
    return (await this.replyRepo.findOne({ where: { id: saved.id }, relations: ['author'] }))!;
  }

  // ---- history ----
  findHistory(ticketId: number): Promise<TicketHistory[]> {
    return this.historyRepo.find({ where: { ticketId }, relations: ['changedBy'], order: { id: 'DESC' } });
  }

  async addHistory(entries: DeepPartial<TicketHistory>[]): Promise<void> {
    if (entries.length) await this.historyRepo.save(entries.map((e) => this.historyRepo.create(e)));
  }

  // ---- attachments ----
  findAttachments(ticketId: number): Promise<TicketAttachment[]> {
    return this.attachmentRepo.find({ where: { ticketId }, relations: ['uploadedBy'], order: { id: 'ASC' } });
  }

  async addAttachments(entries: DeepPartial<TicketAttachment>[]): Promise<TicketAttachment[]> {
    return this.attachmentRepo.save(entries.map((e) => this.attachmentRepo.create(e)));
  }

  /** Includes the on-disk name, hidden elsewhere. */
  findAttachmentWithFile(id: number): Promise<TicketAttachment | null> {
    return this.attachmentRepo
      .createQueryBuilder('a')
      .addSelect('a.storedName')
      .where('a.id = :id', { id })
      .getOne();
  }

  // ---- user notifications (mail / WhatsApp) ----
  findNotifications(ticketId: number): Promise<TicketNotification[]> {
    return this.notificationRepo.find({ where: { ticketId }, relations: ['sentBy'], order: { id: 'DESC' } });
  }

  async addNotifications(entries: DeepPartial<TicketNotification>[]): Promise<TicketNotification[]> {
    return entries.length ? this.notificationRepo.save(entries.map((e) => this.notificationRepo.create(e))) : [];
  }
}
