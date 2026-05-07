import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsArray,
  ArrayNotEmpty,
  IsInt,
  Min,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateReminderDto {
  @IsString()
  @IsNotEmpty()
  expedienteId: string;

  @IsString()
  @IsNotEmpty()
  tipo: string; // AUDIENCIA | VENCIMIENTO | GENERAL

  @IsDateString()
  fechaEvento: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(0, { each: true })
  intervalos: number[]; // días de anticipación, e.g. [7, 3, 1]

  @IsOptional()
  @IsString()
  mensaje?: string;

  @IsOptional()
  @IsString()
  lugar?: string;

  @IsOptional()
  @IsBoolean()
  esVirtual?: boolean;

  @IsOptional()
  @IsString()
  linkVirtual?: string;

  @IsOptional()
  @IsString()
  queLlevar?: string;

  @IsOptional()
  @IsString()
  horaEnvio?: string; // HH:MM en hora Argentina, default "09:00"
}
