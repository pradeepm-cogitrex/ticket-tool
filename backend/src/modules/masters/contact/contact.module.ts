import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientProductModule } from '../client-product/client-product.module';
import { ContactController } from './contact.controller';
import { Contact } from './contact.entity';
import { ContactRepo } from './contact.repo';
import { ContactService } from './contact.service';

@Module({
  imports: [TypeOrmModule.forFeature([Contact]), ClientProductModule],
  controllers: [ContactController],
  providers: [ContactService, ContactRepo],
  exports: [ContactService, ContactRepo],
})
export class ContactModule {}
