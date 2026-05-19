import {
  Controller, Post, Body, HttpCode, HttpStatus,
  BadRequestException, NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProcessarWebhookUseCase } from '../../../application/use-cases/processar-webhook.use-case';
import { WebhookPagamentoDto } from './dto/webhook.dto';
import { DomainException } from '../../../domain/exceptions/domain.exception';

@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  constructor(private readonly processarWebhook: ProcessarWebhookUseCase) {}

  @Post('pagamento')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook de pagamento (SAGA Step 2)' })
  @ApiResponse({ status: 200, description: 'Webhook processado' })
  @ApiResponse({ status: 404, description: 'Venda não encontrada' })
  @ApiResponse({ status: 400, description: 'Pagamento já processado' })
  async processarPagamento(@Body() dto: WebhookPagamentoDto) {
    try {
      await this.processarWebhook.execute(dto);
      return { message: 'Webhook processado com sucesso' };
    } catch (error) {
      if (error instanceof DomainException) {
        if (error.message.includes('não encontrada')) {
          throw new NotFoundException(error.message);
        }
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
