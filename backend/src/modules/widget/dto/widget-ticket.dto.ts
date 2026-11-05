import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** What the HelpX widget sends when a user raises a ticket from inside an application. */
export class WidgetTicketDto {
  /** client product key from the embed script; decides the client and product */
  @IsString()
  @IsNotEmpty({ message: 'appClientId is missing from the script' })
  @MaxLength(64)
  appClientId: string;

  /** application name as written in the script (informational) */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  productName?: string;

  /** client name passed by the host application with the user (informational) */
  @IsOptional()
  @IsString()
  @MaxLength(150)
  clientName?: string;

  /** product name passed by the host application with the user (informational) */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  product?: string;

  /** the user logged in to that application, passed by the host application */
  @IsString()
  @IsNotEmpty({ message: 'The logged-in user was not passed to HelpX' })
  @MaxLength(100)
  username: string;

  @IsOptional()
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(150)
  email?: string;

  @IsString()
  @IsNotEmpty({ message: 'Enter a subject' })
  @MaxLength(200)
  subject: string;

  @IsString()
  @MinLength(5, { message: 'Describe the issue in at least 5 characters' })
  description: string;

  /** one of the ticket types from GET /widget/config; the default type when left out */
  @IsOptional()
  @IsInt({ message: 'Choose a ticket type' })
  ticketTypeId?: number;

  /** page the widget was opened on */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  pageUrl?: string;
}
