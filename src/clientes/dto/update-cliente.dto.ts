import { IsString, IsOptional } from 'class-validator';

export class UpdateClienteDto {
  @IsString()
  @IsOptional()
  dni?: string;

  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  telefono?: string;
}
