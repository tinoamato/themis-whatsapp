import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MetaService } from '../meta/meta.service';
import { CreateReminderDto } from './dto/create-reminder.dto';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly meta: MetaService,
  ) {}

  async create(dto: CreateReminderDto) {
    return this.prisma.reminder.create({
      data: {
        expedienteId: dto.expedienteId,
        tipo: dto.tipo,
        mensaje: dto.mensaje,
        fechaEvento: new Date(dto.fechaEvento),
        enviarEn: new Date(dto.enviarEn),
        templateName: dto.templateName,
      },
    });
  }

  async findAll() {
    return this.prisma.reminder.findMany({
      orderBy: { enviarEn: 'asc' },
      include: { expediente: { include: { cliente: true } } },
    });
  }

  async remove(id: string) {
    const r = await this.prisma.reminder.findUnique({ where: { id } });
    if (!r) throw new NotFoundException(`Reminder ${id} no encontrado`);
    return this.prisma.reminder.delete({ where: { id } });
  }

  // ── Cron cada 15 minutos ─────────────────────────────────────────────────────
  @Cron('0 */15 * * * *')
  async processPendingReminders() {
    const now = new Date();
    const pending = await this.prisma.reminder.findMany({
      where: {
        status: 'pending',
        enviarEn: { lte: now },
      },
      include: { expediente: { include: { cliente: true } } },
    });

    if (pending.length === 0) return;

    this.logger.log(`Procesando ${pending.length} reminder(s) pendientes`);

    for (const reminder of pending) {
      const telefono = reminder.expediente?.cliente?.telefono;
      if (!telefono) {
        this.logger.warn(`Reminder ${reminder.id} sin teléfono de cliente`);
        await this.prisma.reminder.update({
          where: { id: reminder.id },
          data: {
            status: 'failed',
            sentAt: now,
            errorMsg: 'Sin teléfono de cliente',
          },
        });
        continue;
      }

      try {
        await this.meta.sendTemplate(telefono, reminder.templateName);
        await this.prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: 'sent', sentAt: now, errorMsg: null },
        });
        this.logger.log(
          `Reminder ${reminder.id} enviado a ${telefono}`,
        );
      } catch (err: any) {
        const errorMsg =
          JSON.stringify(err?.response?.data) ?? err?.message ?? 'Error desconocido';
        await this.prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: 'failed', sentAt: now, errorMsg },
        });
        this.logger.error(
          `Error enviando reminder ${reminder.id}: ${errorMsg}`,
        );
      }
    }
  }
}
