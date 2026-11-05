import { ArrayMinSize, ArrayUnique, IsArray, IsIn, IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Inform user contacts about a ticket. "{name}" in the message becomes each contact's name. */
export class NotifyTicketDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Select at least one contact' })
  @ArrayUnique()
  @IsInt({ each: true })
  contactIds: number[];

  @IsArray()
  @ArrayMinSize(1, { message: 'Choose Email, WhatsApp or both' })
  @ArrayUnique()
  @IsIn(['email', 'whatsapp'], { each: true })
  channels: ('email' | 'whatsapp')[];

  @IsString()
  @IsNotEmpty({ message: 'Enter the message' })
  @MaxLength(2000)
  message: string;
}
