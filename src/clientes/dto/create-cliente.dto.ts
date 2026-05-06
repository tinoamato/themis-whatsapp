import { IsString, IsNotEmpty } from 'class-validator';

export class CreateClienteDto {
  @IsString()
  @IsNotEmpty()
  dni: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  telefono: string;
}
