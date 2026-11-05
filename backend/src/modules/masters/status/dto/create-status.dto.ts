import { IsBoolean, IsEnum, IsHexColor, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { StatusType } from '../../../../common/enums/status-type.enum';

export class CreateStatusDto {
  @IsString()
  @IsNotEmpty({ message: 'Status name is required' })
  @MaxLength(50)
  name: string;

  @IsEnum(StatusType, { message: 'Type must be open or closed' })
  type: StatusType;

  @IsOptional()
  @IsBoolean()
  pausesSla?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresNote?: boolean;

  @IsOptional()
  @IsBoolean()
  locksTicket?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsHexColor({ message: 'Colour must be a hex value like #3b82f6' })
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
