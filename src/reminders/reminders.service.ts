import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
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
    const fechaEvento = new Date(dto.fechaEvento);

    const reminder = await this.prisma.reminder.create({
      data: {
        expedienteId: dto.expedienteId,
        tipo: dto.tipo,
        fechaEvento,
        intervalos: dto.intervalos,
        mensaje: dto.mensaje,
        lugar: dto.lugar,
        esVirtual: dto.esVirtual ?? false,
        linkVirtual: dto.linkVirtual,
        queLlevar: dto.queLlevar,
        horaEnvio: dto.horaEnvio ?? '09:00',
        alertas: {
          create: dto.intervalos.map((dias) => ({
            diasAntes: dias,
            enviarEn: this.calcEnviarEn(fechaEvento, dias, dto.horaEnvio),
          })),
        },
      },
      include: { alertas: true },
    });

    return reminder;
  }

  async findAll() {
    return this.prisma.reminder.findMany({
      orderBy: { fechaEvento: 'asc' },
      include: {
        alertas: { orderBy: { diasAntes: 'desc' } },
        expediente: { include: { cliente: true } },
      },
    });
  }

  async findOne(id: string) {
    const r = await this.prisma.reminder.findUnique({
      where: { id },
      include: {
        alertas: { orderBy: { diasAntes: 'desc' } },
        expediente: { include: { cliente: true } },
      },
    });
    if (!r) throw new NotFoundException(`Reminder ${id} no encontrado`);
    return r;
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
    const pending = await this.prisma.reminderAlerta.findMany({
      where: { status: 'pending', enviarEn: { lte: now } },
      include: {
        reminder: {
          include: { expediente: { include: { cliente: true } } },
        },
      },
    });

    if (pending.length === 0) return;

    this.logger.log(`Procesando ${pending.length} alerta(s) pendiente(s)`);

    for (const alerta of pending) {
      const { reminder } = alerta;
      const telefono = reminder.expediente?.cliente?.telefono;

      if (!telefono) {
        await this.prisma.reminderAlerta.update({
          where: { id: alerta.id },
          data: { status: 'failed', sentAt: now, errorMsg: 'Sin teléfono de cliente' },
        });
        continue;
      }

      const msg = this.buildMessage(alerta, reminder);

      try {
        await this.meta.sendText(telefono, msg);
        await this.prisma.reminderAlerta.update({
          where: { id: alerta.id },
          data: { status: 'sent', sentAt: now, errorMsg: null },
        });
        this.logger.log(`Alerta ${alerta.id} enviada a ${telefono}`);
      } catch (err: any) {
        const errorMsg =
          JSON.stringify(err?.response?.data) ?? err?.message ?? 'Error desconocido';
        await this.prisma.reminderAlerta.update({
          where: { id: alerta.id },
          data: { status: 'failed', sentAt: now, errorMsg },
        });
        this.logger.error(`Error enviando alerta ${alerta.id}: ${errorMsg}`);
      }
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private calcEnviarEn(fechaEvento: Date, diasAntes: number, horaEnvio = '09:00'): Date {
    const [hh, mm] = horaEnvio.split(':').map(Number);
    const d = new Date(fechaEvento);
    d.setUTCDate(d.getUTCDate() - diasAntes);
    d.setUTCHours(hh + 3, mm, 0, 0); // Argentina UTC-3 → UTC
    return d;
  }

  private buildMessage(alerta: { diasAntes: number }, reminder: any): string {
    const { tipo, fechaEvento, lugar, esVirtual, linkVirtual, queLlevar, mensaje, expediente } = reminder;
    const { diasAntes } = alerta;

    if (mensaje) return mensaje;

    const fechaStr = new Date(fechaEvento).toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    const expedienteStr = expediente
      ? `*Expediente:* ${expediente.numero}\n*Carátula:* ${expediente.caratula}\n\n`
      : '';

    if (tipo === 'AUDIENCIA') {
      return this.buildAudienciaMsg(diasAntes, fechaStr, expedienteStr, lugar, esVirtual, linkVirtual, queLlevar);
    }

    if (tipo === 'VENCIMIENTO') {
      return this.buildVencimientoMsg(diasAntes, fechaStr, expedienteStr);
    }

    // GENERAL
    return this.buildGeneralMsg(diasAntes, fechaStr, expedienteStr);
  }

  private buildAudienciaMsg(
    diasAntes: number,
    fecha: string,
    expediente: string,
    lugar?: string,
    esVirtual?: boolean,
    link?: string,
    queLlevar?: string,
  ): string {
    const urgencia =
      diasAntes === 0 ? '🔴 *¡Tu audiencia es HOY!*' :
      diasAntes === 1 ? '🔔 *¡Tu audiencia es mañana!*' :
      diasAntes <= 3  ? `⚠️ *Recordatorio: audiencia en ${diasAntes} días*` :
                        `📅 *Recordatorio de audiencia — ${diasAntes} días*`;

    let msg = `${urgencia}\n\n${expediente}📆 *Fecha:* ${fecha}\n`;

    if (esVirtual) {
      msg += `💻 *Modalidad:* Virtual\n`;
      if (link) msg += `🔗 *Link:* ${link}\n`;
    } else if (lugar) {
      msg += `📍 *Lugar:* ${lugar}\n`;
    }

    if (queLlevar) msg += `\n📋 *Qué llevar:* ${queLlevar}`;

    msg += `\n\nCualquier consulta, comunicate con tu estudio jurídico.`;
    return msg;
  }

  private buildVencimientoMsg(diasAntes: number, fecha: string, expediente: string): string {
    const urgencia =
      diasAntes === 0 ? '🔴 *¡Vence HOY!*' :
      diasAntes === 1 ? '🔔 *¡Vence mañana!*' :
      diasAntes <= 3  ? `⚠️ *Vencimiento en ${diasAntes} días*` :
                        `📅 *Aviso de vencimiento — ${diasAntes} días*`;

    return `${urgencia}\n\n${expediente}📆 *Fecha de vencimiento:* ${fecha}\n\nComunicate con tu abogado para asegurarte de tener todo listo a tiempo.`;
  }

  private buildGeneralMsg(diasAntes: number, fecha: string, expediente: string): string {
    const urgencia =
      diasAntes === 0 ? '🔔 *Recordatorio para hoy*' :
      diasAntes === 1 ? '🔔 *Recordatorio para mañana*' :
                        `📅 *Recordatorio — ${diasAntes} días*`;

    return `${urgencia}\n\n${expediente}📆 *Fecha:* ${fecha}\n\nComunicate con tu estudio jurídico ante cualquier duda.`;
  }
}
