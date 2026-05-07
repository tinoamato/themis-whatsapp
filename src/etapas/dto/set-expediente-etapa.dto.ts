import { IsString, IsOptional } from 'class-validator';

export class SetExpedienteEtapaDto {
  @IsString() etapaId: string;
  @IsOptional() @IsString() mensajeBotCustom?: string;
  @IsOptional() @IsString() proximoPasoCustom?: string;
  @IsOptional() @IsString() esperandoCustom?: string;
}
