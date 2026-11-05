import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/** Fields an employee can change from the ticket detail panel. The original description stays as raised. */
export class UpdateTicketDto {
  /** Moving to another client or product: the client + product pair must be mapped. */
  @IsOptional()
  @IsInt()
  clientId?: number;

  @IsOptional()
  @IsInt()
  productId?: number;

  @IsOptional()
  @IsInt()
  moduleId?: number | null;

  @IsOptional()
  @IsInt()
  ticketTypeId?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  username?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Enter a valid email address' })
  email?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9+\-\s]{0,20}$/, { message: 'Phone may only contain digits, spaces, + and -' })
  phone?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject?: string;

  @IsOptional()
  @IsInt()
  priorityId?: number;

  @IsOptional()
  @IsInt()
  statusId?: number;

  @IsOptional()
  @IsInt()
  assignedToId?: number | null;

  /** User contact of the ticket's client product; null unlinks. */
  @IsOptional()
  @IsInt()
  contactId?: number | null;

  @IsOptional()
  @IsString()
  resolutionNote?: string | null;

  /** Root cause analysis; saved by an employee, so RCA by becomes Human. */
  @IsOptional()
  @IsString()
  rcaNote?: string | null;
}
