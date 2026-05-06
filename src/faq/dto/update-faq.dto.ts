import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateFaqDto {
  @IsString()
  @IsOptional()
  trigger?: string;

  @IsString()
  @IsOptional()
  pregunta?: string;

  @IsString()
  @IsOptional()
  respuesta?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  orden?: number;
}
