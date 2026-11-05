import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { MAX_FILES, ticketUploadOptions } from '../../common/utils/upload.util';
import { BulkUpdateTicketDto } from './dto/bulk-update-ticket.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { NotifyTicketDto } from './dto/notify-ticket.dto';
import { TicketQueryDto } from './dto/ticket-query.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketService } from './ticket.service';

@Controller('tickets')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Get()
  list(@Query() query: TicketQueryDto, @CurrentUser() user: AuthUser) {
    return this.ticketService.list(query, user);
  }

  /** Counts for the quick-view tabs: open, mine, unassigned, overdue… */
  @Get('counts')
  counts(@CurrentUser() user: AuthUser) {
    return this.ticketService.counts(user);
  }

  @Get('attachments/:attachmentId/download')
  async download(@Param('attachmentId', ParseIntPipe) attachmentId: number, @Res() res: Response, @CurrentUser() user: AuthUser) {
    const file = await this.ticketService.getAttachmentFile(attachmentId, user);
    res.download(file.path, file.fileName);
  }

  @Get(':key')
  findOne(@Param('key') key: string, @CurrentUser() user: AuthUser) {
    return this.ticketService.findOne(key, user);
  }

  @Post()
  create(@Body() dto: CreateTicketDto, @CurrentUser() user: AuthUser) {
    return this.ticketService.create(dto, user);
  }

  @Patch('bulk')
  bulkUpdate(@Body() dto: BulkUpdateTicketDto, @CurrentUser() user: AuthUser) {
    return this.ticketService.bulkUpdate(dto, user);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTicketDto, @CurrentUser() user: AuthUser) {
    return this.ticketService.update(id, dto, user);
  }

  @Post(':id/replies')
  addReply(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateReplyDto, @CurrentUser() user: AuthUser) {
    return this.ticketService.addReply(id, dto, user);
  }

  /** Inform user contacts by mail and / or WhatsApp, e.g. when the ticket is assigned or resolved. */
  @Post(':id/notify')
  notify(@Param('id', ParseIntPipe) id: number, @Body() dto: NotifyTicketDto, @CurrentUser() user: AuthUser) {
    return this.ticketService.notify(id, dto, user);
  }

  @Post(':id/attachments')
  @UseInterceptors(FilesInterceptor('files', MAX_FILES, ticketUploadOptions))
  addAttachments(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('replyId') replyId: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ticketService.addAttachments(id, files, user, replyId ? Number(replyId) : undefined);
  }
}
