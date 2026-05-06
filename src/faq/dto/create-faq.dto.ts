import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFaqDto {
  @IsString()
  @IsNotEmpty()
  trigger: string;

  @IsString()
  @IsNotEmpty()
  pregunta: string;

  @IsString()
  @IsNotEmpty()
  respuesta: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  orden: number;
}
