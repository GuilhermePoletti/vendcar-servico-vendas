import { WebhookController } from '../../src/infrastructure/adapters/in/webhook.controller';
import { ProcessarWebhookUseCase } from '../../src/application/use-cases/processar-webhook.use-case';
import { DomainException } from '../../src/domain/exceptions/domain.exception';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const makeMocks = () => ({
  processarWebhook: { execute: jest.fn() } as any,
});

describe('WebhookController', () => {
  let controller: WebhookController;
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
    controller = new WebhookController(mocks.processarWebhook);
  });

  it('deve processar webhook de pagamento', async () => {
    mocks.processarWebhook.execute.mockResolvedValue(undefined);

    const result = await controller.processarPagamento({ codigoPagamento: 'PAG-123', status: 'EFETUADO' });

    expect(result).toEqual({ message: 'Webhook processado com sucesso' });
    expect(mocks.processarWebhook.execute).toHaveBeenCalledWith({
      codigoPagamento: 'PAG-123',
      status: 'EFETUADO',
    });
  });

  it('deve lançar NotFoundException quando venda não encontrada', async () => {
    mocks.processarWebhook.execute.mockRejectedValue(new DomainException('Venda não encontrada'));

    await expect(
      controller.processarPagamento({ codigoPagamento: 'invalido', status: 'EFETUADO' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('deve lançar BadRequestException em erro de domínio genérico', async () => {
    mocks.processarWebhook.execute.mockRejectedValue(new DomainException('Pagamento já processado'));

    await expect(
      controller.processarPagamento({ codigoPagamento: 'PAG-123', status: 'EFETUADO' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve propagar erro genérico', async () => {
    mocks.processarWebhook.execute.mockRejectedValue(new Error('DB error'));

    await expect(
      controller.processarPagamento({ codigoPagamento: 'PAG-123', status: 'EFETUADO' }),
    ).rejects.toThrow('DB error');
  });
});
