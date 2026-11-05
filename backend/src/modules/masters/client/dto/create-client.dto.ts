import { IsBoolean, IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min, ValidateIf } from 'class-validator';

export class CreateClientDto {
  @IsString()
  @IsNotEmpty({ message: 'Client code is required' })
  @MaxLength(10, { message: 'Client code can be at most 10 characters' })
  @Matches(/^[A-Za-z0-9]+$/, { message: 'Client code may only use letters and numbers' })
  code: string;

  @IsString()
  @IsNotEmpty({ message: 'Client name is required' })
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null && v !== '')
  @IsEmail({}, { message: 'Enter a valid contact email' })
  @MaxLength(150)
  contactEmail?: string | null;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null && v !== '')
  @Matches(/^[0-9+\-\s]{0,20}$/, { message: 'Contact phone may only contain digits, spaces, + and -' })
  contactPhone?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
