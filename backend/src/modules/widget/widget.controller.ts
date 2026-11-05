import { Body, Controller, Get, Post, Query, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Public } from '../../common/decorators/public.decorator';
import { MAX_FILES, ticketUploadOptions } from '../../common/utils/upload.util';
import { WidgetTicketDto } from './dto/widget-ticket.dto';
import { WidgetService } from './widget.service';

/**
 * Used by helpx-bot.js inside customer applications. No login: the product's
 * appClientId from the embed script identifies where the ticket belongs.
 */
@Public()
@Controller('widget')
export class WidgetController {
  constructor(private readonly widgetService: WidgetService) {}

  @Get('config')
  config(@Query('appClientId') appClientId = '') {
    return this.widgetService.config(appClientId);
  }

  @Post('tickets')
  @UseInterceptors(FilesInterceptor('files', MAX_FILES, ticketUploadOptions))
  createTicket(@Body() dto: WidgetTicketDto, @UploadedFiles() files: Express.Multer.File[]) {
    return this.widgetService.createTicket(dto, files);
  }
}
