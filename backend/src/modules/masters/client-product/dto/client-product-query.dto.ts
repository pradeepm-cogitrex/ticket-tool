import { IsInt, IsOptional } from 'class-validator';
import { ListQueryDto } from '../../../../common/dto/list-query.dto';

export class ClientProductQueryDto extends ListQueryDto {
  @IsOptional()
  @IsInt()
  clientId?: number;

  @IsOptional()
  @IsInt()
  productId?: number;
}
