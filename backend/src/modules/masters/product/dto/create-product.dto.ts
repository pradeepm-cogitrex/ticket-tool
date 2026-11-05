import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'Product code is required' })
  @MaxLength(20)
  @Matches(/^[A-Za-z0-9_-]+$/, { message: 'Product code may only use letters, numbers, - and _' })
  code: string;

  @IsString()
  @IsNotEmpty({ message: 'Product name is required' })
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
