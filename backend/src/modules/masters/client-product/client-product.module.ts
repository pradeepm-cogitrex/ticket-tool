import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientModule } from '../client/client.module';
import { PriorityModule } from '../priority/priority.module';
import { ProductModule } from '../product/product.module';
import { ClientProductSla } from './client-product-sla.entity';
import { ClientProductController } from './client-product.controller';
import { ClientProduct } from './client-product.entity';
import { ClientProductRepo } from './client-product.repo';
import { ClientProductService } from './client-product.service';

@Module({
  imports: [TypeOrmModule.forFeature([ClientProduct, ClientProductSla]), ClientModule, ProductModule, PriorityModule],
  controllers: [ClientProductController],
  providers: [ClientProductService, ClientProductRepo],
  exports: [ClientProductService, ClientProductRepo],
})
export class ClientProductModule {}
