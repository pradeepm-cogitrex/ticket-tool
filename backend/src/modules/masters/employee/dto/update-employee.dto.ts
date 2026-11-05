import { PartialType } from '@nestjs/mapped-types';
import { CreateEmployeeDto } from './create-employee.dto';

/** Same fields as create; leave password out to keep the current one. Sending assignments replaces them all. */
export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}
