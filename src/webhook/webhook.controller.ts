import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  HttpCode,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { BotService } from '../bot/bot.service';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly bot: BotService) {}

  // ── GET /webhook — verificación de Meta ──────────────────────────────────────
  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
      this.logger.log('Webhook verificado correctamente');
      res.status(200).send(challenge);
    } else {
      this.logger.warn('Intento de verificación con token inválido');
      res.status(403).send('Forbidden');
    }
  }

  // ── POST /webhook — mensajes entrantes ──────────────────────────────────────
  @Post()
  @HttpCode(200)
  async receive(@Body() body: any): Promise<string> {
    try {
      const entry = body?.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const messages = value?.messages;

      if (!messages || messages.length === 0) {
        return 'ok';
      }

      const message = messages[0];

      // Solo procesamos mensajes de texto
      if (message.type !== 'text') {
        this.logger.log(`Mensaje de tipo "${message.type}" ignorado`);
        return 'ok';
      }

      const from: string = message.from;
      const text: string = message.text?.body ?? '';

      this.logger.log(`Mensaje de ${from}: "${text}"`);

      // Procesamiento asincrónico — respondemos 200 a Meta de inmediato
      this.bot.handleMessage(from, text).catch((err) => {
        this.logger.error(`Error en handleMessage para ${from}:`, err);
      });
    } catch (err) {
      this.logger.error('Error parseando webhook payload:', err);
    }

    return 'ok';
  }
}
