import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { FaqService, CreateTemaDto, CreatePreguntaDto } from './faq.service';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@Controller('api/faq')
@UseGuards(ApiKeyGuard)
export class FaqController {
  constructor(private readonly svc: FaqService) {}

  // ── Temas ──────────────────────────────────────────────────────────────────

  @Get('temas')
  findAllTemas() {
    return this.svc.findAllTemas();
  }

  @Post('temas')
  createTema(@Body() dto: CreateTemaDto) {
    return this.svc.createTema(dto);
  }

  @Patch('temas/:id')
  updateTema(@Param('id') id: string, @Body() dto: Partial<CreateTemaDto>) {
    return this.svc.updateTema(id, dto);
  }

  @Delete('temas/:id')
  @HttpCode(204)
  removeTema(@Param('id') id: string) {
    return this.svc.removeTema(id);
  }

  // ── Preguntas ──────────────────────────────────────────────────────────────

  @Get('temas/:temaId/preguntas')
  findByTema(@Param('temaId') temaId: string) {
    return this.svc.findPreguntasByTema(temaId);
  }

  @Post('preguntas')
  createPregunta(@Body() dto: CreatePreguntaDto) {
    return this.svc.createPregunta(dto);
  }

  @Patch('preguntas/:id')
  updatePregunta(
    @Param('id') id: string,
    @Body() dto: Partial<Omit<CreatePreguntaDto, 'temaId'>>,
  ) {
    return this.svc.updatePregunta(id, dto);
  }

  @Delete('preguntas/:id')
  @HttpCode(204)
  removePregunta(@Param('id') id: string) {
    return this.svc.removePregunta(id);
  }
}
