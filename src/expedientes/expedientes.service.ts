import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpedienteDto } from './dto/create-expediente.dto';
import { UpdateExpedienteDto } from './dto/update-expediente.dto';

@Injectable()
export class ExpedientesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateExpedienteDto) {
    const existing = await this.prisma.expediente.findUnique({
      where: { numero: dto.numero },
    });
    if (existing) {
      throw new ConflictException(
        `Ya existe un expediente con número ${dto.numero}`,
      );
    }
    return this.prisma.expediente.create({ data: dto });
  }

  async update(id: string, dto: UpdateExpedienteDto) {
    await this.findOneOrFail(id);
    return this.prisma.expediente.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOneOrFail(id);
    return this.prisma.expediente.delete({ where: { id } });
  }

  private async findOneOrFail(id: string) {
    const exp = await this.prisma.expediente.findUnique({ where: { id } });
    if (!exp) throw new NotFoundException(`Expediente ${id} no encontrado`);
    return exp;
  }
}
