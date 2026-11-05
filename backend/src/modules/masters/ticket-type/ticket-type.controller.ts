import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';
import { SetActiveDto } from '../../../common/dto/set-active.dto';
import { Role } from '../../../common/enums/role.enum';
import { CreateTicketTypeDto } from './dto/create-ticket-type.dto';
import { UpdateTicketTypeDto } from './dto/update-ticket-type.dto';
import { TicketTypeService } from './ticket-type.service';

@Controller('masters/ticket-types')
export class TicketTypeController {
  constructor(private readonly ticketTypeService: TicketTypeService) {}

  @Get()
  findAll(@Query() query: ListQueryDto) {
    return this.ticketTypeService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ticketTypeService.findOne(id);
  }

  @Post()
  @Roles(Role.SuperAdmin)
  create(@Body() dto: CreateTicketTypeDto) {
    return this.ticketTypeService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.SuperAdmin)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTicketTypeDto) {
    return this.ticketTypeService.update(id, dto);
  }

  @Patch(':id/active')
  @Roles(Role.SuperAdmin)
  setActive(@Param('id', ParseIntPipe) id: number, @Body() dto: SetActiveDto) {
    return this.ticketTypeService.setActive(id, dto.isActive);
  }
}
