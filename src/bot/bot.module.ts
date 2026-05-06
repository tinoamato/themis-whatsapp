import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { MetaModule } from '../meta/meta.module';

@Module({
  imports: [MetaModule],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}
