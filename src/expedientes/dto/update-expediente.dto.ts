import { IsString, IsOptional } from 'class-validator';

export class UpdateExpedienteDto {
  @IsString()
  @IsOptional()
  numero?: string;

  @IsString()
  @IsOptional()
  caratula?: string;

  @IsString()
  @IsOptional()
  estado?: string;

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
}
