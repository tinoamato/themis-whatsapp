import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MetaService } from '../meta/meta.service';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos

type ConvState =
  | 'idle'
  | 'awaiting_menu'
  | 'awaiting_dni'
  | 'selecting_expediente'
  | 'awaiting_faq';

interface ExpedienteCtx {
  ids: string[];
}

interface FaqCtx {
  ids: string[];
}

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly meta: MetaService,
  ) {}

  async handleMessage(from: string, body: string): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TIMEOUT_MS);
    const text = body.trim();

    let conv = await this.prisma.conversation.findUnique({
      where: { telefono: from },
    });

    if (!conv) {
      conv = await this.prisma.conversation.create({
        data: { telefono: from, state: 'idle', expiresAt },
      });
    } else if (conv.state !== 'idle' && conv.expiresAt < now) {
      this.logger.log(`Conversación expirada para ${from}, reseteando`);
      conv = await this.prisma.conversation.update({
        where: { telefono: from },
        data: { state: 'idle', contextData: Prisma.DbNull, lastMsgAt: now, expiresAt },
      });
    } else {
      await this.prisma.conversation.update({
        where: { telefono: from },
        data: { lastMsgAt: now, expiresAt },
      });
    }

    const state = conv.state as ConvState;
    this.logger.log(`[${from}] state=${state} msg="${text}"`);

    switch (state) {
      case 'idle':
        await this.sendMainMenu(from);
        await this.setState(from, 'awaiting_menu', null);
        break;

      case 'awaiting_menu':
        await this.handleMenuChoice(from, text, expiresAt);
        break;

      case 'awaiting_dni':
        await this.handleDni(from, text, expiresAt);
        break;

      case 'selecting_expediente':
        await this.handleExpedienteSelection(
          from,
          text,
          conv.contextData as unknown as ExpedienteCtx,
          expiresAt,
        );
        break;

      case 'awaiting_faq':
        await this.handleFaqSelection(
          from,
          text,
          conv.contextData as unknown as FaqCtx,
          expiresAt,
        );
        break;

      default:
        await this.sendMainMenu(from);
        await this.setState(from, 'awaiting_menu', null);
    }
  }

  // ── Menú principal ──────────────────────────────────────────────────────────

  private async sendMainMenu(to: string): Promise<void> {
    await this.meta.sendText(
      to,
      '👋 ¡Hola! Soy el asistente virtual de tu estudio jurídico.\n\n' +
        '¿En qué puedo ayudarte?\n\n' +
        '1️⃣  Consultar mi expediente\n' +
        '2️⃣  Preguntas frecuentes\n' +
        '3️⃣  Hablar con un asesor\n\n' +
        'Respondé con el número de la opción.',
    );
  }

  private async handleMenuChoice(
    from: string,
    text: string,
    expiresAt: Date,
  ): Promise<void> {
    switch (text) {
      case '1':
        await this.meta.sendText(
          from,
          '🔍 Por favor, ingresá tu *DNI* (solo números):',
        );
        await this.setState(from, 'awaiting_dni', null);
        break;

      case '2':
        await this.showFaqList(from, expiresAt);
        break;

      case '3':
        await this.meta.sendText(
          from,
          '✅ Perfecto. Un asesor va a comunicarse con vos a la brevedad. ¡Muchas gracias!',
        );
        await this.setState(from, 'idle', null);
        break;

      default:
        await this.meta.sendText(
          from,
          '❓ Opción no válida. Por favor elegí *1*, *2* o *3*:',
        );
        await this.sendMainMenu(from);
        await this.setState(from, 'awaiting_menu', null);
    }
  }

  // ── Consulta de expediente ───────────────────────────────────────────────────

  private async handleDni(
    from: string,
    text: string,
    expiresAt: Date,
  ): Promise<void> {
    const dni = text.replace(/\D/g, '');

    if (!dni) {
      await this.meta.sendText(
        from,
        '⚠️ El DNI debe contener solo números. Intentá de nuevo:',
      );
      return;
    }

    const cliente = await this.prisma.cliente.findUnique({
      where: { dni },
      include: { expedientes: true },
    });

    if (!cliente) {
      await this.meta.sendText(
        from,
        `❌ No encontramos ningún cliente con el DNI *${dni}*.\n\n` +
          'Verificá el número o contactá a tu estudio jurídico.',
      );
      await this.sendMainMenu(from);
      await this.setState(from, 'awaiting_menu', null);
      return;
    }

    // Validar que el teléfono coincida con el número de WhatsApp
    const telefonoNorm = cliente.telefono.replace(/\D/g, '');
    const fromNorm = from.replace(/\D/g, '');
    if (!fromNorm.endsWith(telefonoNorm) && !telefonoNorm.endsWith(fromNorm)) {
      await this.meta.sendText(
        from,
        '🔒 El número de WhatsApp no coincide con el registrado para ese DNI. ' +
          'Por favor comunicate con tu estudio jurídico.',
      );
      await this.sendMainMenu(from);
      await this.setState(from, 'awaiting_menu', null);
      return;
    }

    const expedientes = cliente.expedientes;

    if (expedientes.length === 0) {
      await this.meta.sendText(
        from,
        `ℹ️ Hola *${cliente.nombre}*, no tenés expedientes registrados actualmente.`,
      );
      await this.sendMainMenu(from);
      await this.setState(from, 'awaiting_menu', null);
      return;
    }

    if (expedientes.length === 1) {
      await this.meta.sendText(from, this.formatExpediente(expedientes[0]));
      await this.meta.sendText(
        from,
        '¿Puedo ayudarte con algo más?\n\n1️⃣  Menú principal',
      );
      await this.setState(from, 'idle', null);
      return;
    }

    // Múltiples expedientes
    let lista = `📂 Hola *${cliente.nombre}*, tenés *${expedientes.length}* expedientes:\n\n`;
    expedientes.forEach((exp, i) => {
      lista += `${i + 1}️⃣  *${exp.numero}* - ${exp.caratula}\n`;
    });
    lista += '\nIngresá el *número* del expediente que querés consultar:';

    await this.meta.sendText(from, lista);
    await this.setState(from, 'selecting_expediente', {
      ids: expedientes.map((e) => e.id),
    });
  }

  private async handleExpedienteSelection(
    from: string,
    text: string,
    ctx: ExpedienteCtx,
    _expiresAt: Date,
  ): Promise<void> {
    const idx = parseInt(text, 10) - 1;

    if (!ctx?.ids || isNaN(idx) || idx < 0 || idx >= ctx.ids.length) {
      await this.meta.sendText(
        from,
        `⚠️ Opción inválida. Ingresá un número entre *1* y *${ctx?.ids?.length ?? '?'}*:`,
      );
      return;
    }

    const expediente = await this.prisma.expediente.findUnique({
      where: { id: ctx.ids[idx] },
    });

    if (!expediente) {
      await this.meta.sendText(from, '❌ No se encontró el expediente.');
      await this.sendMainMenu(from);
      await this.setState(from, 'awaiting_menu', null);
      return;
    }

    await this.meta.sendText(from, this.formatExpediente(expediente));
    await this.meta.sendText(
      from,
      '¿Puedo ayudarte con algo más?\n\n1️⃣  Menú principal',
    );
    await this.setState(from, 'idle', null);
  }

  private formatExpediente(exp: any): string {
    const fecha = exp.updatedAt
      ? new Date(exp.updatedAt).toLocaleDateString('es-AR')
      : '-';

    let msg = `📋 *Expediente Nro. ${exp.numero}*\n\n`;
    msg += `📝 *Carátula:* ${exp.caratula}\n`;
    msg += `⚖️ *Estado:* ${exp.estado}\n`;
    if (exp.estadoDetalle) msg += `📌 *Detalle:* ${exp.estadoDetalle}\n`;
    if (exp.pendientes) msg += `⏳ *Pendientes:* ${exp.pendientes}\n`;
    if (exp.proxMovimiento)
      msg += `📅 *Próx. movimiento:* ${exp.proxMovimiento}\n`;
    if (exp.fuero) msg += `🏛️ *Fuero:* ${exp.fuero}\n`;
    if (exp.juzgado) msg += `🏢 *Juzgado:* ${exp.juzgado}\n`;
    msg += `🔄 *Actualizado:* ${fecha}`;
    return msg;
  }

  // ── FAQ ─────────────────────────────────────────────────────────────────────

  private async showFaqList(from: string, _expiresAt: Date): Promise<void> {
    const faqs = await this.prisma.fAQ.findMany({
      orderBy: { orden: 'asc' },
    });

    if (faqs.length === 0) {
      await this.meta.sendText(
        from,
        'ℹ️ No hay preguntas frecuentes disponibles por el momento.',
      );
      await this.sendMainMenu(from);
      await this.setState(from, 'awaiting_menu', null);
      return;
    }

    let lista = '❓ *Preguntas frecuentes*\n\n';
    faqs.forEach((faq, i) => {
      lista += `${i + 1}️⃣  ${faq.pregunta}\n`;
    });
    lista += '\nIngresá el *número* de tu consulta:';

    await this.meta.sendText(from, lista);
    await this.setState(from, 'awaiting_faq', {
      ids: faqs.map((f) => f.id),
    });
  }

  private async handleFaqSelection(
    from: string,
    text: string,
    ctx: FaqCtx,
    expiresAt: Date,
  ): Promise<void> {
    const idx = parseInt(text, 10) - 1;

    if (!ctx?.ids || isNaN(idx) || idx < 0 || idx >= ctx.ids.length) {
      await this.meta.sendText(
        from,
        `⚠️ Opción inválida. Ingresá un número entre *1* y *${ctx?.ids?.length ?? '?'}*:`,
      );
      return;
    }

    const faq = await this.prisma.fAQ.findUnique({
      where: { id: ctx.ids[idx] },
    });

    if (!faq) {
      await this.meta.sendText(from, '❌ No se encontró esa pregunta.');
      await this.showFaqList(from, expiresAt);
      return;
    }

    await this.meta.sendText(
      from,
      `❓ *${faq.pregunta}*\n\n${faq.respuesta}`,
    );
    await this.meta.sendText(
      from,
      '¿Puedo ayudarte con algo más?\n\n1️⃣  Menú principal\n2️⃣  Ver otras preguntas',
    );
    await this.setState(from, 'idle', null);
  }

  // ── Utilidades ──────────────────────────────────────────────────────────────

  private async setState(
    from: string,
    state: ConvState,
    contextData: object | null,
  ): Promise<void> {
    await this.prisma.conversation.update({
      where: { telefono: from },
      data: {
        state,
        contextData: contextData === null ? undefined : contextData,
      },
    });
  }
}
