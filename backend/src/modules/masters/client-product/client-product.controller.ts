import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { SetActiveDto } from '../../../common/dto/set-active.dto';
import { Role } from '../../../common/enums/role.enum';
import { ClientProductService } from './client-product.service';
import { ClientProductQueryDto } from './dto/client-product-query.dto';
import { CreateClientProductDto } from './dto/create-client-product.dto';
import { UpdateClientProductDto } from './dto/update-client-product.dto';

@Controller('masters/client-products')
export class ClientProductController {
  constructor(private readonly clientProductService: ClientProductService) {}

  @Get()
  findAll(@Query() query: ClientProductQueryDto) {
    return this.clientProductService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clientProductService.findOne(id);
  }

  @Post()
  @Roles(Role.SuperAdmin)
  create(@Body() dto: CreateClientProductDto) {
    return this.clientProductService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.SuperAdmin)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateClientProductDto) {
    return this.clientProductService.update(id, dto);
  }

  @Patch(':id/active')
  @Roles(Role.SuperAdmin)
  setActive(@Param('id', ParseIntPipe) id: number, @Body() dto: SetActiveDto) {
    return this.clientProductService.setActive(id, dto.isActive);
  }
}
