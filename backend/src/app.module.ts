import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthModule } from './modules/auth/auth.module';
import { MastersModule } from './modules/masters/masters.module';
import { TicketModule } from './modules/tickets/ticket.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { WidgetModule } from './modules/widget/widget.module';
import { SeedModule } from './database/seed/seed.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: databaseConfig,
    }),
    AuthModule,
    MastersModule,
    TicketModule,
    DashboardModule,
    WidgetModule,
    SeedModule,
  ],
  providers: [
    // Every route needs a valid JWT unless marked @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Routes marked @Roles(...) are limited to those roles
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
