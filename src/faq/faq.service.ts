import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export class CreateTemaDto {
  titulo: string;
  emoji?: string;
  orden?: number;
}

export class CreatePreguntaDto {
  temaId: string;
  pregunta: string;
  respuesta: string;
  orden?: number;
}

@Injectable()
export class FaqService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Temas ──────────────────────────────────────────────────────────────────

  findAllTemas() {
    return this.prisma.faqTema.findMany({
      where: { activo: true },
      include: {
        preguntas: { where: { activa: true }, orderBy: { orden: 'asc' } },
      },
      orderBy: { orden: 'asc' },
    });
  }

  createTema(dto: CreateTemaDto) {
    return this.prisma.faqTema.create({ data: dto });
  }

  async updateTema(id: string, dto: Partial<CreateTemaDto>) {
    await this.findTemaOrFail(id);
    return this.prisma.faqTema.update({ where: { id }, data: dto });
  }

  async removeTema(id: string) {
    await this.findTemaOrFail(id);
    await this.prisma.faqPregunta.deleteMany({ where: { temaId: id } });
    return this.prisma.faqTema.delete({ where: { id } });
  }

  private async findTemaOrFail(id: string) {
    const t = await this.prisma.faqTema.findUnique({ where: { id } });
    if (!t) throw new NotFoundException(`Tema ${id} no encontrado`);
    return t;
  }

  // ── Preguntas ──────────────────────────────────────────────────────────────

  findPreguntasByTema(temaId: string) {
    return this.prisma.faqPregunta.findMany({
      where: { temaId, activa: true },
      orderBy: { orden: 'asc' },
    });
  }

  createPregunta(dto: CreatePreguntaDto) {
    return this.prisma.faqPregunta.create({ data: dto });
  }

  async updatePregunta(id: string, dto: Partial<Omit<CreatePreguntaDto, 'temaId'>>) {
    await this.findPreguntaOrFail(id);
    return this.prisma.faqPregunta.update({ where: { id }, data: dto });
  }

  async removePregunta(id: string) {
    await this.findPreguntaOrFail(id);
    return this.prisma.faqPregunta.delete({ where: { id } });
  }

  private async findPreguntaOrFail(id: string) {
    const p = await this.prisma.faqPregunta.findUnique({ where: { id } });
    if (!p) throw new NotFoundException(`Pregunta ${id} no encontrada`);
    return p;
  }
}
