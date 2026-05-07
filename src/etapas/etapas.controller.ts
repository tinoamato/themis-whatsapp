import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { EtapasService } from './etapas.service';
import { CreateEtapaDto } from './dto/create-etapa.dto';
import { SetExpedienteEtapaDto } from './dto/set-expediente-etapa.dto';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@UseGuards(ApiKeyGuard)
@Controller()
export class EtapasController {
  constructor(private readonly etapas: EtapasService) {}

  // ── Etapas predefinidas ────────────────────────────────────────────────────

  @Get('etapas')
  findAll() {
    return this.etapas.findAll();
  }

  @Get('etapas/:id')
  findOne(@Param('id') id: string) {
    return this.etapas.findOne(id);
  }

  @Post('etapas')
  create(@Body() dto: CreateEtapaDto) {
    return this.etapas.create(dto);
  }

  @Patch('etapas/:id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateEtapaDto>) {
    return this.etapas.update(id, dto);
  }

  @Delete('etapas/:id')
  remove(@Param('id') id: string) {
    return this.etapas.remove(id);
  }

  // ── Etapa por expediente ───────────────────────────────────────────────────

  @Get('expedientes/:id/etapa')
  getExpedienteEtapa(@Param('id') id: string) {
    return this.etapas.getExpedienteEtapa(id);
  }

  @Put('expedientes/:id/etapa')
  setExpedienteEtapa(@Param('id') id: string, @Body() dto: SetExpedienteEtapaDto) {
    return this.etapas.setExpedienteEtapa(id, dto);
  }

  @Delete('expedientes/:id/etapa')
  removeExpedienteEtapa(@Param('id') id: string) {
    return this.etapas.removeExpedienteEtapa(id);
  }
}
