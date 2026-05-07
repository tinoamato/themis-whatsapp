import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { MetaModule } from './meta/meta.module';
import { BotModule } from './bot/bot.module';
import { WebhookModule } from './webhook/webhook.module';
import { ClientesModule } from './clientes/clientes.module';
import { ExpedientesModule } from './expedientes/expedientes.module';
import { RemindersModule } from './reminders/reminders.module';
import { FaqModule } from './faq/faq.module';
import { EtapasModule } from './etapas/etapas.module';
import { AppController } from './app.controller';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    MetaModule,
    BotModule,
    WebhookModule,
    ClientesModule,
    ExpedientesModule,
    RemindersModule,
    FaqModule,
    EtapasModule,
  ],
})
export class AppModule {}
