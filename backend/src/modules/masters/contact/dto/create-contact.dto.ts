import { IsBoolean, IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';

export class CreateContactDto {
  @IsInt({ message: 'Select a client' })
  clientId: number;

  @IsInt({ message: 'Select a product' })
  productId: number;

  @IsString()
  @IsNotEmpty({ message: 'Enter the name' })
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  username?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => !!v)
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(150)
  email?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9+\-\s]{0,20}$/, { message: 'Phone may only contain digits, spaces, + and -' })
  phone?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
