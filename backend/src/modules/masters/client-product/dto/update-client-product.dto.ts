import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateClientProductDto } from './create-client-product.dto';

/** Client and product are fixed once mapped (tickets and employees hang off the pair). Sending slas replaces them all. */
export class UpdateClientProductDto extends PartialType(OmitType(CreateClientProductDto, ['clientId', 'productId'] as const)) {}
