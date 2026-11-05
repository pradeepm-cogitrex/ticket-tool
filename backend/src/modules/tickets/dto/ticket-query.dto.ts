import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const TICKET_SORT_FIELDS = [
  'createdAt',
  'ticketNo',
  'dueAt',
  'priority',
  'status',
  'client',
  'product',
  'ticketType',
  'username',
  'subject',
  'assignee',
] as const;
export type TicketSortField = (typeof TICKET_SORT_FIELDS)[number];

export class TicketQueryDto {
  /** Ticket No, username or subject */
  @IsOptional()
  @IsString()
  search?: string;

  /** Comma separated ids: 1,2 */
  @IsOptional()
  @IsString()
  clientIds?: string;

  @IsOptional()
  @IsString()
  productIds?: string;

  @IsOptional()
  @IsString()
  ticketTypeIds?: string;

  @IsOptional()
  @IsString()
  statusIds?: string;

  @IsOptional()
  @IsString()
  priorityIds?: string;

  /** me | unassigned | employee id */
  @IsOptional()
  @IsString()
  assignee?: string;

  /** open = open-type statuses, closed = closed-type, all = everything */
  @IsOptional()
  @IsIn(['open', 'closed', 'all'])
  view?: 'open' | 'closed' | 'all';

  @IsOptional()
  @IsIn(['true', 'false'])
  overdue?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  pageSize?: number = 25;

  @IsOptional()
  @IsIn(TICKET_SORT_FIELDS as unknown as string[])
  sortBy?: TicketSortField = 'createdAt';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortDir?: 'ASC' | 'DESC' = 'DESC';
}
