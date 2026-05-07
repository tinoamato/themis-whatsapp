import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEtapaDto } from './dto/create-etapa.dto';
import { SetExpedienteEtapaDto } from './dto/set-expediente-etapa.dto';

@Injectable()
export class EtapasService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Etapas predefinidas ────────────────────────────────────────────────────

  findAll() {
    return this.prisma.etapa.findMany({
      orderBy: { orden: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.etapa.findUniqueOrThrow({ where: { id } });
  }

  create(dto: CreateEtapaDto) {
    return this.prisma.etapa.create({ data: dto });
  }

  update(id: string, dto: Partial<CreateEtapaDto>) {
    return this.prisma.etapa.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.etapa.delete({ where: { id } });
  }

  // ── Etapa por expediente ───────────────────────────────────────────────────

  async getExpedienteEtapa(expedienteId: string) {
    const ee = await this.prisma.expedienteEtapa.findUnique({
      where: { expedienteId },
      include: { etapa: true },
    });
    if (!ee) throw new NotFoundException(`El expediente ${expedienteId} no tiene etapa asignada`);
    return ee;
  }

  async setExpedienteEtapa(expedienteId: string, dto: SetExpedienteEtapaDto) {
    // Verify expediente exists
    const exp = await this.prisma.expediente.findUnique({ where: { id: expedienteId } });
    if (!exp) throw new NotFoundException(`Expediente ${expedienteId} no encontrado`);

    return this.prisma.expedienteEtapa.upsert({
      where: { expedienteId },
      create: { expedienteId, ...dto },
      update: dto,
      include: { etapa: true },
    });
  }

  async removeExpedienteEtapa(expedienteId: string) {
    await this.getExpedienteEtapa(expedienteId);
    return this.prisma.expedienteEtapa.delete({ where: { expedienteId } });
  }
}
