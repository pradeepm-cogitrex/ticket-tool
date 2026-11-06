import { IsIn, IsInt, IsOptional, Matches } from 'class-validator';

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export class DashboardQueryDto {
  /** Look-back window for trend and range figures. Ignored when from / to are given. */
  @IsOptional()
  @IsInt()
  @IsIn([7, 14, 30, 90])
  days?: number = 14;

  /** Custom window, yyyy-mm-dd, both days included. */
  @IsOptional()
  @Matches(YMD, { message: 'from must be yyyy-mm-dd' })
  from?: string;

  @IsOptional()
  @Matches(YMD, { message: 'to must be yyyy-mm-dd' })
  to?: string;

  /** Narrow everything to one client. Admins and employees can only narrow inside their own client products. */
  @IsOptional()
  @IsInt()
  clientId?: number;

  @IsOptional()
  @IsInt()
  productId?: number;
}
