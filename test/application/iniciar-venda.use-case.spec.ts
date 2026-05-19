import { IniciarVendaUseCase } from '../../src/application/use-cases/iniciar-venda.use-case';
import { VendaRepositoryPort } from '../../src/application/ports/out/venda.repository.port';
import { CatalogoApiPort } from '../../src/application/ports/out/catalogo-api.port';
import { Venda } from '../../src/domain/entities/venda.entity';
import { StatusPagamento } from '../../src/domain/enums/status-pagamento.enum';

const makeVendaRepo = (): jest.Mocked<VendaRepositoryPort> => ({
  salvar: jest.fn(),
  buscarPorCodigoPagamento: jest.fn(),
  listarVendidas: jest.fn(),
  atualizarStatusComEvento: jest.fn(),
} as any);

const makeCatalogoApi = (): jest.Mocked<CatalogoApiPort> => ({
  buscarClientePorCpf: jest.fn(),
  buscarVeiculoPorId: jest.fn(),
  reservarVeiculo: jest.fn(),
  confirmarVendaVeiculo: jest.fn(),
  cancelarReservaVeiculo: jest.fn(),
} as any);

describe('IniciarVendaUseCase', () => {
  let useCase: IniciarVendaUseCase;
  let vendaRepo: jest.Mocked<VendaRepositoryPort>;
  let catalogoApi: jest.Mocked<CatalogoApiPort>;

  beforeEach(() => {
    vendaRepo = makeVendaRepo();
    catalogoApi = makeCatalogoApi();
    useCase = new IniciarVendaUseCase(vendaRepo, catalogoApi);
  });

  it('deve iniciar venda com sucesso (fluxo feliz)', async () => {
    catalogoApi.buscarClientePorCpf.mockResolvedValue({
      id: 'cliente-1',
      nome: 'João',
      cpf: '52998224725',
    });
    catalogoApi.buscarVeiculoPorId.mockResolvedValue({
      id: 'veiculo-1',
      preco: 135000,
      status: 'DISPONIVEL',
    });
    catalogoApi.reservarVeiculo.mockResolvedValue();
    vendaRepo.salvar.mockImplementation(async (v) => v);

    const result = await useCase.execute({
      cpfCliente: '52998224725',
      idVeiculo: 'veiculo-1',
    });

    expect(catalogoApi.buscarClientePorCpf).toHaveBeenCalledWith('52998224725');
    expect(catalogoApi.buscarVeiculoPorId).toHaveBeenCalledWith('veiculo-1');
    expect(catalogoApi.reservarVeiculo).toHaveBeenCalledWith('veiculo-1');
    expect(vendaRepo.salvar).toHaveBeenCalledTimes(1);
    expect(result.cpfCliente).toBe('52998224725');
    expect(result.idVeiculoCatalogo).toBe('veiculo-1');
    expect(result.precoVenda).toBe(135000);
    expect(result.statusPagamento).toBe(StatusPagamento.AGUARDANDO);
    expect(result.codigoPagamento).toBeDefined();
  });

  it('deve lançar erro quando cliente não é encontrado (CPF inválido)', async () => {
    catalogoApi.buscarClientePorCpf.mockRejectedValue(new Error('Cliente não encontrado'));

    await expect(
      useCase.execute({ cpfCliente: '99999999999', idVeiculo: 'veiculo-1' }),
    ).rejects.toThrow('Cliente não encontrado');

    expect(catalogoApi.buscarVeiculoPorId).not.toHaveBeenCalled();
    expect(catalogoApi.reservarVeiculo).not.toHaveBeenCalled();
    expect(vendaRepo.salvar).not.toHaveBeenCalled();
  });

  it('deve lançar erro quando veículo não é encontrado', async () => {
    catalogoApi.buscarClientePorCpf.mockResolvedValue({
      id: 'cliente-1',
      nome: 'João',
      cpf: '52998224725',
    });
    catalogoApi.buscarVeiculoPorId.mockRejectedValue(new Error('Veículo não encontrado'));

    await expect(
      useCase.execute({ cpfCliente: '52998224725', idVeiculo: 'inexistente' }),
    ).rejects.toThrow('Veículo não encontrado');

    expect(catalogoApi.reservarVeiculo).not.toHaveBeenCalled();
    expect(vendaRepo.salvar).not.toHaveBeenCalled();
  });

  it('deve lançar erro quando veículo não está DISPONIVEL', async () => {
    catalogoApi.buscarClientePorCpf.mockResolvedValue({
      id: 'cliente-1',
      nome: 'João',
      cpf: '52998224725',
    });
    catalogoApi.buscarVeiculoPorId.mockResolvedValue({
      id: 'veiculo-1',
      preco: 135000,
      status: 'RESERVADO',
    });

    await expect(
      useCase.execute({ cpfCliente: '52998224725', idVeiculo: 'veiculo-1' }),
    ).rejects.toThrow('não está disponível');

    expect(catalogoApi.reservarVeiculo).not.toHaveBeenCalled();
    expect(vendaRepo.salvar).not.toHaveBeenCalled();
  });

  it('deve lançar erro quando falha na reserva do veículo (HTTP error)', async () => {
    catalogoApi.buscarClientePorCpf.mockResolvedValue({
      id: 'cliente-1',
      nome: 'João',
      cpf: '52998224725',
    });
    catalogoApi.buscarVeiculoPorId.mockResolvedValue({
      id: 'veiculo-1',
      preco: 135000,
      status: 'DISPONIVEL',
    });
    catalogoApi.reservarVeiculo.mockRejectedValue(new Error('Falha ao reservar veículo'));

    await expect(
      useCase.execute({ cpfCliente: '52998224725', idVeiculo: 'veiculo-1' }),
    ).rejects.toThrow('Falha ao reservar veículo');

    expect(vendaRepo.salvar).not.toHaveBeenCalled();
  });
});
