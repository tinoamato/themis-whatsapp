import { IsString, IsNotEmpty, IsDateString } from 'class-validator';

export class CreateReminderDto {
  @IsString()
  @IsNotEmpty()
  expedienteId: string;

  @IsString()
  @IsNotEmpty()
  tipo: string;

  @IsString()
  @IsNotEmpty()
  mensaje: string;

  @IsDateString()
  fechaEvento: string;

  @IsDateString()
  enviarEn: string;

  @IsString()
  @IsNotEmpty()
  templateName: string;
}
