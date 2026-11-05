import { IsInt, IsOptional } from 'class-validator';
import { ListQueryDto } from '../../../../common/dto/list-query.dto';

export class ModuleQueryDto extends ListQueryDto {
  @IsOptional()
  @IsInt()
  productId?: number;
}
