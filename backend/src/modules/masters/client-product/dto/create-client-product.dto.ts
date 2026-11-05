import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, Max, Min, ValidateNested } from 'class-validator';

/** SLA hours for one ticket priority. */
export class ClientProductSlaDto {
  @IsInt({ message: 'Choose a priority' })
  priorityId: number;

  @IsInt()
  @Min(1, { message: 'Response time must be at least 1 hour' })
  @Max(2000)
  responseHrs: number;

  @IsInt()
  @Min(1, { message: 'Resolution time must be at least 1 hour' })
  @Max(5000)
  resolveHrs: number;
}

export class CreateClientProductDto {
  @IsInt({ message: 'Select a client' })
  clientId: number;

  @IsInt({ message: 'Select a product' })
  productId: number;

  /** Only the priorities that differ from the Priority master need a row. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClientProductSlaDto)
  slas?: ClientProductSlaDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
