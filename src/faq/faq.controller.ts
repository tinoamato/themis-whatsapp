import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { FaqService } from './faq.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@Controller('api/faq')
@UseGuards(ApiKeyGuard)
export class FaqController {
  constructor(private readonly svc: FaqService) {}

  @Post()
  create(@Body() dto: CreateFaqDto) {
    return this.svc.create(dto);
  }

  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFaqDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
