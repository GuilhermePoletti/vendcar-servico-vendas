import { ProcessarWebhookUseCase } from '../../src/application/use-cases/processar-webhook.use-case';
import { VendaRepositoryPort } from '../../src/application/ports/out/venda.repository.port';
import { Venda } from '../../src/domain/entities/venda.entity';
import { StatusPagamento } from '../../src/domain/enums/status-pagamento.enum';
import { TipoEvento } from '../../src/domain/enums/tipo-evento.enum';

const makeVendaRepo = (): jest.Mocked<VendaRepositoryPort> => ({
  salvar: jest.fn(),
  buscarPorCodigoPagamento: jest.fn(),
  listarVendidas: jest.fn(),
  atualizarStatusComEvento: jest.fn(),
} as any);

const makeVenda = (overrides = {}) =>
  new Venda({
    cpfCliente: '52998224725',
    idVeiculoCatalogo: 'veiculo-1',
    precoVenda: 135000,
    ...overrides,
  });

describe('ProcessarWebhookUseCase', () => {
  let useCase: ProcessarWebhookUseCase;
  let vendaRepo: jest.Mocked<VendaRepositoryPort>;

  beforeEach(() => {
    vendaRepo = makeVendaRepo();
    useCase = new ProcessarWebhookUseCase(vendaRepo);
  });

  it('deve confirmar pagamento e criar evento CONFIRMAR_VENDA', async () => {
    const venda = makeVenda();
    vendaRepo.buscarPorCodigoPagamento.mockResolvedValue(venda);
    vendaRepo.atualizarStatusComEvento.mockResolvedValue();

    await useCase.execute({
      codigoPagamento: venda.codigoPagamento,
      status: 'EFETUADO',
    });

    expect(vendaRepo.buscarPorCodigoPagamento).toHaveBeenCalledWith(venda.codigoPagamento);
    expect(vendaRepo.atualizarStatusComEvento).toHaveBeenCalledWith(
      venda.id,
      StatusPagamento.PAGO,
      expect.objectContaining({
        tipoEvento: TipoEvento.CONFIRMAR_VENDA,
        payload: expect.objectContaining({ idVeiculo: 'veiculo-1' }),
      }),
    );
  });

  it('deve cancelar pagamento e criar evento CANCELAR_VENDA', async () => {
    const venda = makeVenda();
    vendaRepo.buscarPorCodigoPagamento.mockResolvedValue(venda);
    vendaRepo.atualizarStatusComEvento.mockResolvedValue();

    await useCase.execute({
      codigoPagamento: venda.codigoPagamento,
      status: 'CANCELADO',
    });

    expect(vendaRepo.atualizarStatusComEvento).toHaveBeenCalledWith(
      venda.id,
      StatusPagamento.CANCELADO,
      expect.objectContaining({
        tipoEvento: TipoEvento.CANCELAR_VENDA,
        payload: expect.objectContaining({ idVeiculo: 'veiculo-1' }),
      }),
    );
  });

  it('deve lançar erro quando código de pagamento não é encontrado', async () => {
    vendaRepo.buscarPorCodigoPagamento.mockResolvedValue(null);

    await expect(
      useCase.execute({ codigoPagamento: 'invalido', status: 'EFETUADO' }),
    ).rejects.toThrow('Venda não encontrada');
  });

  it('deve lançar erro quando venda já foi processada (não está AGUARDANDO)', async () => {
    const venda = makeVenda({ statusPagamento: StatusPagamento.PAGO });
    vendaRepo.buscarPorCodigoPagamento.mockResolvedValue(venda);

    await expect(
      useCase.execute({ codigoPagamento: venda.codigoPagamento, status: 'EFETUADO' }),
    ).rejects.toThrow();
  });
});
