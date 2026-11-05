import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateModuleDto {
  @IsInt({ message: 'Select a product' })
  productId: number;

  @IsString()
  @IsNotEmpty({ message: 'Module name is required' })
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
