import { IsBoolean, IsHexColor, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreatePriorityDto {
  @IsString()
  @IsNotEmpty({ message: 'Priority name is required' })
  @MaxLength(50)
  name: string;

  @IsInt()
  @Min(1, { message: 'Response time must be at least 1 hour' })
  @Max(2000)
  responseHrs: number;

  @IsInt()
  @Min(1, { message: 'Resolution time must be at least 1 hour' })
  @Max(5000)
  resolveHrs: number;

  /** employee role priority that handles this priority (1 = most senior) */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9)
  assignRolePriority?: number;

  @IsOptional()
  @IsHexColor({ message: 'Colour must be a hex value like #f76b15' })
  color?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
