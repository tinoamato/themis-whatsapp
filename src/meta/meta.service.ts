import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);

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
          to,
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
          to,
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
