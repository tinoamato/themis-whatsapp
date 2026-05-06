import {
  Controller,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ExpedientesService } from './expedientes.service';
import { CreateExpedienteDto } from './dto/create-expediente.dto';
import { UpdateExpedienteDto } from './dto/update-expediente.dto';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@Controller('api/expedientes')
@UseGuards(ApiKeyGuard)
export class ExpedientesController {
  constructor(private readonly svc: ExpedientesService) {}

  @Post()
  create(@Body() dto: CreateExpedienteDto) {
    return this.svc.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateExpedienteDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
