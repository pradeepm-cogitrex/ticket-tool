import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Role } from '../../../../common/enums/role.enum';

export const MAX_ROLE_PRIORITY = 9;

/** One client product the employee works on, with their role priority there. */
export class AssignmentDto {
  @IsInt({ message: 'Choose a client' })
  clientId: number;

  @IsInt({ message: 'Choose a product' })
  productId: number;

  @IsInt()
  @Min(1, { message: 'Role priority starts at 1' })
  @Max(MAX_ROLE_PRIORITY, { message: `Role priority can be at most ${MAX_ROLE_PRIORITY}` })
  rolePriority: number;
}

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(100)
  name: string;

  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(150)
  email: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9+\-\s]{0,20}$/, { message: 'Mobile may only contain digits, spaces, + and -' })
  mobile?: string | null;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  @IsEnum(Role, { message: 'Access must be Super admin, Admin or Employee' })
  role: Role;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignmentDto)
  assignments?: AssignmentDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
