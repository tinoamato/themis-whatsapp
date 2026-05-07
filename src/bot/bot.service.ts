import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MetaService } from '../meta/meta.service';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

type ConvState =
  | 'idle'
  | 'awaiting_menu'
  | 'awaiting_dni'
  | 'selecting_expediente'
  | 'awaiting_faq_tema'
  | 'awaiting_faq_pregunta';

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly meta: MetaService,
  ) {}

  async handleMessage(from: string, body: string, interactiveId = ''): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TIMEOUT_MS);
    const text = body.trim();
    const id = interactiveId.trim();

    let conv = await this.prisma.conversation.findUnique({ where: { telefono: from } });

    if (!conv) {
      conv = await this.prisma.conversation.create({
        data: { telefono: from, state: 'idle', expiresAt },
      });
    } else if (conv.state !== 'idle' && conv.expiresAt < now) {
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
    this.logger.log(`[${from}] state=${state} msg="${text}" id="${id}"`);

    switch (state) {
      case 'idle':
        await this.sendMainMenu(from);
        await this.setState(from, 'awaiting_menu', null);
        break;

      case 'awaiting_menu':
        await this.handleMenuChoice(from, text, id, expiresAt);
        break;

      case 'awaiting_dni':
        await this.handleDni(from, text, expiresAt);
        break;

      case 'selecting_expediente':
        await this.handleExpedienteSelection(from, id || text, conv.contextData as any, expiresAt);
        break;

      case 'awaiting_faq_tema':
        await this.handleFaqTema(from, id || text, expiresAt);
        break;

      case 'awaiting_faq_pregunta':
        await this.handleFaqPregunta(from, id || text, conv.contextData as any, expiresAt);
        break;

      default:
        await this.sendMainMenu(from);
        await this.setState(from, 'awaiting_menu', null);
    }
  }

  // ── Menú principal ──────────────────────────────────────────────────────────

  private async sendMainMenu(to: string): Promise<void> {
    await this.meta.sendList(
      to,
      '👋 ¡Hola! Soy el asistente virtual de tu estudio jurídico.\n\n¿En qué puedo ayudarte hoy?',
      [
        {
          rows: [
            { id: 'menu_1', title: '📂 Mi expediente', description: 'Consultá el estado de tu caso' },
            { id: 'menu_2', title: '❓ Preguntas frecuentes', description: 'Dudas sobre el proceso' },
            { id: 'menu_3', title: '💬 Hablar con asesor', description: 'Contacto con tu abogado' },
          ],
        },
      ],
      'Ver opciones',
      '⚖️ Estudio Jurídico',
    );
  }

  private async handleMenuChoice(
    from: string,
    text: string,
    id: string,
    expiresAt: Date,
  ): Promise<void> {
    const choice = id || text;

    if (choice === 'menu_1' || choice === '1') {
      await this.meta.sendText(from, '🔍 Por favor, ingresá tu *DNI* (solo números):');
      await this.setState(from, 'awaiting_dni', null);
    } else if (choice === 'menu_2' || choice === '2') {
      await this.showFaqTemas(from, expiresAt);
    } else if (choice === 'menu_3' || choice === '3') {
      await this.meta.sendText(
        from,
        '✅ *Perfecto.* Un asesor va a comunicarse con vos a la brevedad.\n\n¡Muchas gracias por contactarnos!',
      );
      await this.setState(from, 'idle', null);
    } else {
      await this.sendMainMenu(from);
    }
  }

  // ── Consulta de expediente ───────────────────────────────────────────────────

  private async handleDni(from: string, text: string, expiresAt: Date): Promise<void> {
    const dni = text.replace(/\D/g, '');

    if (!dni) {
      await this.meta.sendText(from, '⚠️ El DNI debe contener solo números. Intentá de nuevo:');
      return;
    }

    const cliente = await this.prisma.cliente.findUnique({
      where: { dni },
      include: {
        expedientes: {
          include: { etapa: { include: { etapa: true } } },
        },
      },
    });

    if (!cliente) {
      await this.meta.sendText(
        from,
        `❌ No encontramos ningún cliente con el DNI *${dni}*.\n\nVerificá el número o contactá a tu estudio jurídico.`,
      );
      await this.sendMainMenu(from);
      await this.setState(from, 'awaiting_menu', null);
      return;
    }

    const telefonoNorm = cliente.telefono.replace(/\D/g, '');
    const fromNorm = from.replace(/\D/g, '');
    if (!fromNorm.endsWith(telefonoNorm) && !telefonoNorm.endsWith(fromNorm)) {
      await this.meta.sendText(
        from,
        '🔒 El número de WhatsApp no coincide con el registrado para ese DNI.\n\nComunicate con tu estudio jurídico.',
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
      await this.sendPostExpedienteButtons(from);
      await this.setState(from, 'idle', null);
      return;
    }

    await this.meta.sendList(
      from,
      `📂 Hola *${cliente.nombre}*, tenés *${expedientes.length}* expedientes. ¿Cuál querés consultar?`,
      [
        {
          rows: expedientes.map((exp) => ({
            id: `exp_${exp.id}`,
            title: exp.numero.slice(0, 24),
            description: exp.caratula.slice(0, 72),
          })),
        },
      ],
      'Ver expedientes',
    );
    await this.setState(from, 'selecting_expediente', {
      ids: expedientes.map((e) => e.id),
    });
  }

  private async handleExpedienteSelection(
    from: string,
    choice: string,
    ctx: any,
    _expiresAt: Date,
  ): Promise<void> {
    let expId: string | undefined;

    if (choice.startsWith('exp_')) {
      expId = choice.replace('exp_', '');
    } else {
      const idx = parseInt(choice, 10) - 1;
      expId = ctx?.ids?.[idx];
    }

    if (!expId) {
      await this.meta.sendText(from, '⚠️ Opción inválida. Por favor seleccioná un expediente de la lista.');
      return;
    }

    const expediente = await this.prisma.expediente.findUnique({
      where: { id: expId },
      include: { etapa: { include: { etapa: true } } },
    });

    if (!expediente) {
      await this.meta.sendText(from, '❌ No se encontró el expediente.');
      await this.sendMainMenu(from);
      await this.setState(from, 'awaiting_menu', null);
      return;
    }

    await this.meta.sendText(from, this.formatExpediente(expediente));
    await this.sendPostExpedienteButtons(from);
    await this.setState(from, 'idle', null);
  }

  private formatExpediente(exp: any): string {
    const fecha = exp.updatedAt
      ? new Date(exp.updatedAt).toLocaleDateString('es-AR')
      : '-';

    // Use stage message if assigned
    const expEtapa = exp.etapa;
    if (expEtapa) {
      const mensajeBot =
        expEtapa.mensajeBotCustom ?? expEtapa.etapa?.mensajeBot ?? null;
      const proximoPaso =
        expEtapa.proximoPasoCustom ?? expEtapa.etapa?.proximoPaso ?? null;
      const esperando =
        expEtapa.esperandoCustom ?? expEtapa.etapa?.esperando ?? null;

      let msg = `📋 *Expediente Nro. ${exp.numero}*\n📝 ${exp.caratula}\n\n`;
      if (mensajeBot) msg += `${mensajeBot}\n\n`;
      if (proximoPaso) msg += `➡️ *Próximo paso:* ${proximoPaso}\n`;
      if (esperando) msg += `⏳ *Esperando:* ${esperando}\n`;
      if (exp.fuero) msg += `\n🏛️ *Fuero:* ${exp.fuero}`;
      if (exp.juzgado) msg += `\n🏢 *Juzgado:* ${exp.juzgado}`;
      msg += `\n🔄 *Actualizado:* ${fecha}`;
      return msg;
    }

    // Fallback to raw fields
    let msg = `📋 *Expediente Nro. ${exp.numero}*\n\n`;
    msg += `📝 *Carátula:* ${exp.caratula}\n`;
    msg += `⚖️ *Estado:* ${exp.estado}\n`;
    if (exp.estadoDetalle) msg += `📌 *Detalle:* ${exp.estadoDetalle}\n`;
    if (exp.pendientes) msg += `⏳ *Pendientes:* ${exp.pendientes}\n`;
    if (exp.proxMovimiento) msg += `📅 *Próx. movimiento:* ${exp.proxMovimiento}\n`;
    if (exp.fuero) msg += `🏛️ *Fuero:* ${exp.fuero}\n`;
    if (exp.juzgado) msg += `🏢 *Juzgado:* ${exp.juzgado}\n`;
    msg += `🔄 *Actualizado:* ${fecha}`;
    return msg;
  }

  private async sendPostExpedienteButtons(to: string): Promise<void> {
    await this.meta.sendButtons(
      to,
      '¿Puedo ayudarte con algo más?',
      [
        { id: 'back_menu', title: '🏠 Menú principal' },
        { id: 'menu_2', title: '❓ Preguntas' },
        { id: 'menu_3', title: '💬 Hablar con asesor' },
      ],
    );
  }

  // ── FAQ ─────────────────────────────────────────────────────────────────────

  private async showFaqTemas(from: string, _expiresAt: Date): Promise<void> {
    const temas = await this.prisma.faqTema.findMany({
      where: { activo: true },
      orderBy: { orden: 'asc' },
    });

    if (temas.length === 0) {
      await this.meta.sendText(from, 'ℹ️ No hay preguntas frecuentes disponibles por el momento.');
      await this.sendMainMenu(from);
      await this.setState(from, 'awaiting_menu', null);
      return;
    }

    await this.meta.sendList(
      from,
      '❓ *Preguntas frecuentes*\n\nElegí el tema sobre el que tenés dudas:',
      [
        {
          rows: temas.map((t) => ({
            id: `tema_${t.id}`,
            title: `${t.emoji ?? ''} ${t.titulo}`.trim().slice(0, 24),
          })),
        },
      ],
      'Ver temas',
      '❓ Preguntas frecuentes',
    );
    await this.setState(from, 'awaiting_faq_tema', null);
  }

  private async handleFaqTema(from: string, choice: string, expiresAt: Date): Promise<void> {
    const temaId = choice.startsWith('tema_') ? choice.replace('tema_', '') : null;

    if (!temaId) {
      await this.showFaqTemas(from, expiresAt);
      return;
    }

    const tema = await this.prisma.faqTema.findUnique({
      where: { id: temaId },
      include: {
        preguntas: {
          where: { activa: true },
          orderBy: { orden: 'asc' },
        },
      },
    });

    if (!tema || tema.preguntas.length === 0) {
      await this.showFaqTemas(from, expiresAt);
      return;
    }

    await this.meta.sendList(
      from,
      `${tema.emoji ?? '❓'} *${tema.titulo}*\n\nElegí tu pregunta:`,
      [
        {
          rows: tema.preguntas.map((p) => ({
            id: `faq_${p.id}`,
            title: p.pregunta.slice(0, 24),
            description: p.pregunta.length > 24 ? p.pregunta.slice(0, 72) : undefined,
          })),
        },
      ],
      'Ver preguntas',
    );
    await this.setState(from, 'awaiting_faq_pregunta', { temaId });
  }

  private async handleFaqPregunta(
    from: string,
    choice: string,
    ctx: any,
    expiresAt: Date,
  ): Promise<void> {
    // Handle navigation buttons
    if (choice === 'back_menu' || choice === 'menu_1') {
      await this.sendMainMenu(from);
      await this.setState(from, 'awaiting_menu', null);
      return;
    }
    if (choice === 'back_faqs') {
      await this.showFaqTemas(from, expiresAt);
      return;
    }
    if (choice.startsWith('tema_')) {
      await this.handleFaqTema(from, choice, expiresAt);
      return;
    }

    const preguntaId = choice.startsWith('faq_') ? choice.replace('faq_', '') : null;

    if (!preguntaId) {
      if (ctx?.temaId) {
        await this.handleFaqTema(from, `tema_${ctx.temaId}`, expiresAt);
      } else {
        await this.showFaqTemas(from, expiresAt);
      }
      return;
    }

    const pregunta = await this.prisma.faqPregunta.findUnique({
      where: { id: preguntaId },
      include: { tema: true },
    });

    if (!pregunta) {
      await this.showFaqTemas(from, expiresAt);
      return;
    }

    await this.meta.sendText(from, `❓ *${pregunta.pregunta}*\n\n${pregunta.respuesta}`);

    await this.meta.sendButtons(
      from,
      '¿Puedo ayudarte con algo más?',
      [
        { id: 'back_menu', title: '🏠 Menú principal' },
        { id: `tema_${pregunta.temaId}`, title: '↩️ Más preguntas' },
        { id: 'menu_3', title: '💬 Hablar con asesor' },
      ],
    );
    await this.setState(from, 'awaiting_faq_pregunta', { temaId: pregunta.temaId });
  }

  // ── Utilidades ──────────────────────────────────────────────────────────────

  private async setState(from: string, state: ConvState, contextData: object | null): Promise<void> {
    await this.prisma.conversation.update({
      where: { telefono: from },
      data: {
        state,
        contextData: contextData === null ? Prisma.DbNull : contextData,
      },
    });
  }
}
