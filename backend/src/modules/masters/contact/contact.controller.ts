import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { SetActiveDto } from '../../../common/dto/set-active.dto';
import { Role } from '../../../common/enums/role.enum';
import { ContactService } from './contact.service';
import { ContactQueryDto } from './dto/contact-query.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Controller('masters/contacts')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Get()
  findAll(@Query() query: ContactQueryDto) {
    return this.contactService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.contactService.findOne(id);
  }

  @Post()
  @Roles(Role.SuperAdmin)
  create(@Body() dto: CreateContactDto) {
    return this.contactService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.SuperAdmin)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateContactDto) {
    return this.contactService.update(id, dto);
  }

  @Patch(':id/active')
  @Roles(Role.SuperAdmin)
  setActive(@Param('id', ParseIntPipe) id: number, @Body() dto: SetActiveDto) {
    return this.contactService.setActive(id, dto.isActive);
  }
}
