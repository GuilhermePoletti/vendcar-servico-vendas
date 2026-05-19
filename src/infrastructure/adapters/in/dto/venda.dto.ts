import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches, Length } from 'class-validator';

export class IniciarVendaDto {
  @ApiProperty({ example: '52998224725', description: 'CPF do cliente (11 dígitos)' })
  @IsString()
  @Length(11, 11, { message: 'CPF deve ter 11 dígitos' })
  @Matches(/^\d{11}$/, { message: 'CPF deve conter apenas dígitos numéricos' })
  cpfCliente: string;

  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', description: 'UUID do veículo' })
  @IsString()
  @IsNotEmpty({ message: 'ID do veículo é obrigatório' })
  idVeiculo: string;
}
