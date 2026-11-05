import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { SetActiveDto } from '../../../common/dto/set-active.dto';
import { Role } from '../../../common/enums/role.enum';
import { CreateModuleDto } from './dto/create-module.dto';
import { ModuleQueryDto } from './dto/module-query.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { ModuleService } from './module.service';

@Controller('masters/modules')
export class ModuleController {
  constructor(private readonly moduleService: ModuleService) {}

  @Get()
  findAll(@Query() query: ModuleQueryDto) {
    return this.moduleService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.moduleService.findOne(id);
  }

  @Post()
  @Roles(Role.SuperAdmin)
  create(@Body() dto: CreateModuleDto) {
    return this.moduleService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.SuperAdmin)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateModuleDto) {
    return this.moduleService.update(id, dto);
  }

  @Patch(':id/active')
  @Roles(Role.SuperAdmin)
  setActive(@Param('id', ParseIntPipe) id: number, @Body() dto: SetActiveDto) {
    return this.moduleService.setActive(id, dto.isActive);
  }
}
