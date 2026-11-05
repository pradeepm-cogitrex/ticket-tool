import { IsIn, IsOptional, IsString } from 'class-validator';

/** Query string used by every master list: ?search=hr&active=true */
export class ListQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['true', 'false', 'all'])
  active?: string;
}
