import { ArrayNotEmpty, IsArray, IsInt, IsOptional } from 'class-validator';

export class BulkUpdateTicketDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'Select at least one ticket' })
  @IsInt({ each: true })
  ids: number[];

  @IsOptional()
  @IsInt()
  statusId?: number;

  @IsOptional()
  @IsInt()
  assignedToId?: number | null;

  @IsOptional()
  @IsInt()
  priorityId?: number;
}
