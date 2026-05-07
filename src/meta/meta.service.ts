import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);

  // Webhook delivers 549XXXXXXXXX (E.164 with 9) but sandbox allowed list
  // registers numbers in the old Argentine format 54XX15XXXXXXXX.
  // This only affects sandbox; production API accepts both formats.
  private normalizePhone(phone: string): string {
    if (/^549\d{10}$/.test(phone)) {
      const area = phone.slice(3, 5);
      const number = phone.slice(5);
      return `54${area}15${number}`;
    }
    return phone;
  }

  private get baseUrl() {
    return `https://graph.facebook.com/v20.0/${process.env.PHONE_NUMBER_ID}/messages`;
  }

  private get headers() {
    return { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` };
  }

  async sendText(to: string, text: string): Promise<void> {
    try {
      await axios.post(
        this.baseUrl,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: this.normalizePhone(to),
          type: 'text',
          text: { body: text },
        },
        { headers: this.headers },
      );
    } catch (err: any) {
      this.logger.error(
        `Error sending text to ${to}: ${JSON.stringify(err?.response?.data ?? err.message)}`,
      );
    }
  }

  async sendTemplate(
    to: string,
    templateName: string,
    languageCode = 'es_AR',
  ): Promise<void> {
    try {
      await axios.post(
        this.baseUrl,
        {
          messaging_product: 'whatsapp',
          to: this.normalizePhone(to),
          type: 'template',
          template: {
            name: templateName,
            language: { code: languageCode },
          },
        },
        { headers: this.headers },
      );
    } catch (err: any) {
      this.logger.error(
        `Error sending template "${templateName}" to ${to}: ${JSON.stringify(err?.response?.data ?? err.message)}`,
      );
      throw err;
    }
  }
}
