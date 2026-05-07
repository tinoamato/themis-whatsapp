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

  @Post()
  @HttpCode(200)
  async receive(@Body() body: any): Promise<string> {
    try {
      const entry = body?.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const messages = value?.messages;

      if (!messages || messages.length === 0) return 'ok';

      const message = messages[0];
      const from: string = message.from;

      let text = '';
      let interactiveId = '';

      if (message.type === 'text') {
        text = message.text?.body ?? '';
        this.logger.log(`Mensaje de ${from}: "${text}"`);
      } else if (message.type === 'interactive') {
        const iType = message.interactive?.type;
        if (iType === 'button_reply') {
          interactiveId = message.interactive.button_reply.id ?? '';
          text = message.interactive.button_reply.title ?? '';
        } else if (iType === 'list_reply') {
          interactiveId = message.interactive.list_reply.id ?? '';
          text = message.interactive.list_reply.title ?? '';
        }
        this.logger.log(`Interactivo de ${from}: id="${interactiveId}" title="${text}"`);
      } else {
        this.logger.log(`Tipo "${message.type}" ignorado de ${from}`);
        return 'ok';
      }

      this.bot.handleMessage(from, text, interactiveId).catch((err) => {
        this.logger.error(`Error en handleMessage para ${from}:`, err);
      });
    } catch (err) {
      this.logger.error('Error parseando webhook payload:', err);
    }

    return 'ok';
  }
}
