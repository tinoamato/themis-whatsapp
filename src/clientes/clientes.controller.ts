import {
  Controller,
  Post,
  Put,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@Controller('api/clientes')
@UseGuards(ApiKeyGuard)
export class ClientesController {
  constructor(private readonly svc: ClientesService) {}

  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @Get('dni/:dni')
  findByDni(@Param('dni') dni: string) {
    return this.svc.findByDni(dni);
  }

  @Post()
  create(@Body() dto: CreateClienteDto) {
    return this.svc.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClienteDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
