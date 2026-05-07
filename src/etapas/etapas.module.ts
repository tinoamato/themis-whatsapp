import { Module } from '@nestjs/common';
import { EtapasController } from './etapas.controller';
import { EtapasService } from './etapas.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EtapasController],
  providers: [EtapasService],
  exports: [EtapasService],
})
export class EtapasModule {}
