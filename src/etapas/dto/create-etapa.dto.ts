import { IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';

export class CreateEtapaDto {
  @IsString() nombre: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsString() mensajeBot: string;
  @IsString() proximoPaso: string;
  @IsString() esperando: string;
  @IsOptional() @IsInt() orden?: number;
  @IsOptional() @IsBoolean() activa?: boolean;
}
