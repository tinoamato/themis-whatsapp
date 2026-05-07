import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.cliente.findMany({
      orderBy: { nombre: 'asc' },
      include: { expedientes: { select: { id: true, numero: true, caratula: true } } },
    });
  }

  async findByDni(dni: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { dni },
      include: { expedientes: { select: { id: true, numero: true, caratula: true } } },
    });
    if (!cliente) throw new NotFoundException(`Cliente con DNI ${dni} no encontrado`);
    return cliente;
  }

  async create(dto: CreateClienteDto) {
    const existing = await this.prisma.cliente.findUnique({
      where: { dni: dto.dni },
    });
    if (existing) {
      throw new ConflictException(`Ya existe un cliente con DNI ${dto.dni}`);
    }
    return this.prisma.cliente.create({ data: dto });
  }

  async update(id: string, dto: UpdateClienteDto) {
    await this.findOneOrFail(id);
    return this.prisma.cliente.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOneOrFail(id);
    return this.prisma.cliente.delete({ where: { id } });
  }

  private async findOneOrFail(id: string) {
    const cliente = await this.prisma.cliente.findUnique({ where: { id } });
    if (!cliente) throw new NotFoundException(`Cliente ${id} no encontrado`);
    return cliente;
  }
}
