import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class WebhookPagamentoDto {
  @ApiProperty({ example: 'PAG-abc123', description: 'Código de pagamento gerado na venda' })
  @IsString()
  @IsNotEmpty()
  codigoPagamento: string;

  @ApiProperty({ example: 'EFETUADO', enum: ['EFETUADO', 'CANCELADO'], description: 'Status do pagamento' })
  @IsString()
  @IsIn(['EFETUADO', 'CANCELADO'], { message: 'Status deve ser EFETUADO ou CANCELADO' })
  status: 'EFETUADO' | 'CANCELADO';
}
