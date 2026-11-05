import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { ListQueryDto } from '../../../../common/dto/list-query.dto';
import { Role } from '../../../../common/enums/role.enum';

export class EmployeeQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  /** only employees assigned to this client */
  @IsOptional()
  @IsInt()
  clientId?: number;

  /** only employees assigned to this product */
  @IsOptional()
  @IsInt()
  productId?: number;
}
