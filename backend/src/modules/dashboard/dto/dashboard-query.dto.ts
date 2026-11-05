import { IsIn, IsInt, IsOptional } from 'class-validator';

export class DashboardQueryDto {
  /** Look-back window for trend and range figures. */
  @IsOptional()
  @IsInt()
  @IsIn([7, 14, 30, 90])
  days?: number = 14;

  /** Narrow everything to one client. Admins and employees can only narrow inside their own client products. */
  @IsOptional()
  @IsInt()
  clientId?: number;

  @IsOptional()
  @IsInt()
  productId?: number;
}
