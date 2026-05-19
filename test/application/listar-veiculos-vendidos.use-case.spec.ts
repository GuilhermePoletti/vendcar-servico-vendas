import { ListarVeiculosVendidosUseCase } from '../../src/application/use-cases/listar-veiculos-vendidos.use-case';
import { VendaRepositoryPort } from '../../src/application/ports/out/venda.repository.port';
import { Venda } from '../../src/domain/entities/venda.entity';
import { StatusPagamento } from '../../src/domain/enums/status-pagamento.enum';

const makeVendaRepo = (): jest.Mocked<VendaRepositoryPort> => ({
  salvar: jest.fn(),
  buscarPorCodigoPagamento: jest.fn(),
  listarVendidas: jest.fn(),
  atualizarStatusComEvento: jest.fn(),
} as any);

describe('ListarVeiculosVendidosUseCase', () => {
  let useCase: ListarVeiculosVendidosUseCase;
  let vendaRepo: jest.Mocked<VendaRepositoryPort>;

  beforeEach(() => {
    vendaRepo = makeVendaRepo();
    useCase = new ListarVeiculosVendidosUseCase(vendaRepo);
  });

  it('deve retornar lista de vendas com status PAGO', async () => {
    const vendas = [
      new Venda({
        cpfCliente: '52998224725',
        idVeiculoCatalogo: 'v-1',
        precoVenda: 100000,
        statusPagamento: StatusPagamento.PAGO,
      }),
      new Venda({
        cpfCliente: '11111111111',
        idVeiculoCatalogo: 'v-2',
        precoVenda: 200000,
        statusPagamento: StatusPagamento.PAGO,
      }),
    ];
    vendaRepo.listarVendidas.mockResolvedValue(vendas);

    const result = await useCase.execute();

    expect(result).toHaveLength(2);
    expect(vendaRepo.listarVendidas).toHaveBeenCalledTimes(1);
  });

  it('deve retornar lista vazia quando não há vendas', async () => {
    vendaRepo.listarVendidas.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toHaveLength(0);
    expect(vendaRepo.listarVendidas).toHaveBeenCalledTimes(1);
  });
});
