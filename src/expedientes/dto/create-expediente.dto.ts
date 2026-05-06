import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateExpedienteDto {
  @IsString()
  @IsNotEmpty()
  numero: string;

  @IsString()
  @IsNotEmpty()
  caratula: string;

  @IsString()
  @IsNotEmpty()
  estado: string;

  @IsString()
  @IsOptional()
  estadoDetalle?: string;

  @IsString()
  @IsOptional()
  pendientes?: string;

  @IsString()
  @IsOptional()
  proxMovimiento?: string;

  @IsString()
  @IsOptional()
  fuero?: string;

  @IsString()
  @IsOptional()
  juzgado?: string;

  @IsString()
  @IsNotEmpty()
  clienteId: string;
}
