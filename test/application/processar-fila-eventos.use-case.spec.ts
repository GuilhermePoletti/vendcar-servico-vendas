import { ProcessarFilaEventosUseCase } from '../../src/application/use-cases/processar-fila-eventos.use-case';
import { FilaEventosRepositoryPort } from '../../src/application/ports/out/fila-eventos.repository.port';
import { CatalogoApiPort } from '../../src/application/ports/out/catalogo-api.port';
import { FilaEventos } from '../../src/domain/entities/fila-eventos.entity';
import { TipoEvento } from '../../src/domain/enums/tipo-evento.enum';
import { StatusEvento } from '../../src/domain/enums/status-evento.enum';

const makeFilaRepo = (): jest.Mocked<FilaEventosRepositoryPort> => ({
  buscarPendentes: jest.fn(),
  atualizarStatus: jest.fn(),
} as any);

const makeCatalogoApi = (): jest.Mocked<CatalogoApiPort> => ({
  buscarClientePorCpf: jest.fn(),
  buscarVeiculoPorId: jest.fn(),
  reservarVeiculo: jest.fn(),
  confirmarVendaVeiculo: jest.fn(),
  cancelarReservaVeiculo: jest.fn(),
} as any);

describe('ProcessarFilaEventosUseCase', () => {
  let useCase: ProcessarFilaEventosUseCase;
  let filaRepo: jest.Mocked<FilaEventosRepositoryPort>;
  let catalogoApi: jest.Mocked<CatalogoApiPort>;

  beforeEach(() => {
    filaRepo = makeFilaRepo();
    catalogoApi = makeCatalogoApi();
    useCase = new ProcessarFilaEventosUseCase(filaRepo, catalogoApi);
  });

  it('deve processar evento CONFIRMAR_VENDA com sucesso', async () => {
    const evento = new FilaEventos({
      tipoEvento: TipoEvento.CONFIRMAR_VENDA,
      payload: { idVeiculo: 'veiculo-1' },
    });
    filaRepo.buscarPendentes.mockResolvedValue([evento]);
    catalogoApi.confirmarVendaVeiculo.mockResolvedValue();
    filaRepo.atualizarStatus.mockResolvedValue();

    await useCase.execute();

    expect(catalogoApi.confirmarVendaVeiculo).toHaveBeenCalledWith('veiculo-1');
    expect(filaRepo.atualizarStatus).toHaveBeenCalledWith(
      evento.id,
      StatusEvento.PROCESSADO,
    );
  });

  it('deve processar evento CANCELAR_VENDA com sucesso', async () => {
    const evento = new FilaEventos({
      tipoEvento: TipoEvento.CANCELAR_VENDA,
      payload: { idVeiculo: 'veiculo-1' },
    });
    filaRepo.buscarPendentes.mockResolvedValue([evento]);
    catalogoApi.cancelarReservaVeiculo.mockResolvedValue();
    filaRepo.atualizarStatus.mockResolvedValue();

    await useCase.execute();

    expect(catalogoApi.cancelarReservaVeiculo).toHaveBeenCalledWith('veiculo-1');
    expect(filaRepo.atualizarStatus).toHaveBeenCalledWith(
      evento.id,
      StatusEvento.PROCESSADO,
    );
  });

  it('deve marcar evento como ERRO quando falha HTTP ocorre', async () => {
    const evento = new FilaEventos({
      tipoEvento: TipoEvento.CONFIRMAR_VENDA,
      payload: { idVeiculo: 'veiculo-1' },
    });
    filaRepo.buscarPendentes.mockResolvedValue([evento]);
    catalogoApi.confirmarVendaVeiculo.mockRejectedValue(new Error('Connection refused'));
    filaRepo.atualizarStatus.mockResolvedValue();

    await useCase.execute();

    expect(filaRepo.atualizarStatus).toHaveBeenCalledWith(
      evento.id,
      StatusEvento.ERRO,
      1,
    );
  });

  it('não deve fazer nada quando não há eventos pendentes', async () => {
    filaRepo.buscarPendentes.mockResolvedValue([]);

    await useCase.execute();

    expect(catalogoApi.confirmarVendaVeiculo).not.toHaveBeenCalled();
    expect(catalogoApi.cancelarReservaVeiculo).not.toHaveBeenCalled();
    expect(filaRepo.atualizarStatus).not.toHaveBeenCalled();
  });

  it('deve processar múltiplos eventos em sequência', async () => {
    const evento1 = new FilaEventos({
      tipoEvento: TipoEvento.CONFIRMAR_VENDA,
      payload: { idVeiculo: 'veiculo-1' },
    });
    const evento2 = new FilaEventos({
      tipoEvento: TipoEvento.CANCELAR_VENDA,
      payload: { idVeiculo: 'veiculo-2' },
    });
    filaRepo.buscarPendentes.mockResolvedValue([evento1, evento2]);
    catalogoApi.confirmarVendaVeiculo.mockResolvedValue();
    catalogoApi.cancelarReservaVeiculo.mockResolvedValue();
    filaRepo.atualizarStatus.mockResolvedValue();

    await useCase.execute();

    expect(catalogoApi.confirmarVendaVeiculo).toHaveBeenCalledWith('veiculo-1');
    expect(catalogoApi.cancelarReservaVeiculo).toHaveBeenCalledWith('veiculo-2');
    expect(filaRepo.atualizarStatus).toHaveBeenCalledTimes(2);
  });

  it('deve continuar processando outros eventos mesmo quando um falha', async () => {
    const evento1 = new FilaEventos({
      tipoEvento: TipoEvento.CONFIRMAR_VENDA,
      payload: { idVeiculo: 'veiculo-1' },
    });
    const evento2 = new FilaEventos({
      tipoEvento: TipoEvento.CANCELAR_VENDA,
      payload: { idVeiculo: 'veiculo-2' },
    });
    filaRepo.buscarPendentes.mockResolvedValue([evento1, evento2]);
    catalogoApi.confirmarVendaVeiculo.mockRejectedValue(new Error('Timeout'));
    catalogoApi.cancelarReservaVeiculo.mockResolvedValue();
    filaRepo.atualizarStatus.mockResolvedValue();

    await useCase.execute();

    // Evento 1 falhou → ERRO
    expect(filaRepo.atualizarStatus).toHaveBeenCalledWith(
      evento1.id,
      StatusEvento.ERRO,
      1,
    );
    // Evento 2 funcionou → PROCESSADO
    expect(filaRepo.atualizarStatus).toHaveBeenCalledWith(
      evento2.id,
      StatusEvento.PROCESSADO,
    );
  });
});
