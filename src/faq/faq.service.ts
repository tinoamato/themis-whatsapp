import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';

@Injectable()
export class FaqService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFaqDto) {
    return this.prisma.fAQ.create({ data: dto });
  }

  async findAll() {
    return this.prisma.fAQ.findMany({ orderBy: { orden: 'asc' } });
  }

  async update(id: string, dto: UpdateFaqDto) {
    await this.findOneOrFail(id);
    return this.prisma.fAQ.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOneOrFail(id);
    return this.prisma.fAQ.delete({ where: { id } });
  }

  private async findOneOrFail(id: string) {
    const faq = await this.prisma.fAQ.findUnique({ where: { id } });
    if (!faq) throw new NotFoundException(`FAQ ${id} no encontrada`);
    return faq;
  }
}
