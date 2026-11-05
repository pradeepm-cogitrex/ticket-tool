import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Who raised the ticket is not sent: it is always the logged-in employee. */
export class CreateTicketDto {
  @IsInt({ message: 'Select a client' })
  clientId: number;

  @IsInt({ message: 'Select a product' })
  productId: number;

  @IsOptional()
  @IsInt()
  moduleId?: number | null;

  /** Incident, Change Request… The default ticket type when left out. */
  @IsOptional()
  @IsInt()
  ticketTypeId?: number;

  @IsString()
  @IsNotEmpty({ message: 'Subject is required' })
  @MaxLength(200)
  subject: string;

  @IsString()
  @MinLength(10, { message: 'Describe the issue in at least 10 characters' })
  description: string;

  @IsOptional()
  @IsInt()
  priorityId?: number;

  @IsOptional()
  @IsInt()
  assignedToId?: number | null;
}
