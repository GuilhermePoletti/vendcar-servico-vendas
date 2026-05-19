import { PrismaFilaEventosRepository } from '../../src/infrastructure/adapters/out/prisma-fila-eventos.repository';
import { PrismaService } from '../../src/infrastructure/prisma/prisma.service';
import { FilaEventos } from '../../src/domain/entities/fila-eventos.entity';
import { StatusEvento } from '../../src/domain/enums/status-evento.enum';
import { TipoEvento } from '../../src/domain/enums/tipo-evento.enum';

const makePrismaService = (): jest.Mocked<PrismaService> => {
  return {
    filaEventos: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  } as any;
};

const eventoDb = {
  id: 'evento-uuid-1',
  tipo_evento: 'CONFIRMAR_VENDA' as const,
  payload: { idVeiculo: 'veiculo-1' },
  status: 'PENDENTE' as const,
  tentativas: 0,
  data_criacao: new Date(),
  atualizado_em: new Date(),
};

describe('PrismaFilaEventosRepository', () => {
  let repository: PrismaFilaEventosRepository;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(() => {
    prisma = makePrismaService();
    repository = new PrismaFilaEventosRepository(prisma);
  });

  it('deve buscar eventos pendentes', async () => {
    (prisma.filaEventos.findMany as jest.Mock).mockResolvedValue([eventoDb]);

    const result = await repository.buscarPendentes();

    expect(prisma.filaEventos.findMany).toHaveBeenCalledWith({
      where: { status: 'PENDENTE' },
      orderBy: { data_criacao: 'asc' },
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(FilaEventos);
    expect(result[0].tipoEvento).toBe(TipoEvento.CONFIRMAR_VENDA);
  });

  it('deve buscar eventos com ERRO para reprocessamento', async () => {
    const eventoErro = { ...eventoDb, status: 'ERRO' as const, tentativas: 1 };
    (prisma.filaEventos.findMany as jest.Mock).mockResolvedValue([eventoDb, eventoErro]);

    const result = await repository.buscarPendentes();

    expect(result).toHaveLength(2);
  });

  it('deve atualizar status de um evento', async () => {
    (prisma.filaEventos.update as jest.Mock).mockResolvedValue({ ...eventoDb, status: 'PROCESSADO' });

    await repository.atualizarStatus('evento-uuid-1', StatusEvento.PROCESSADO);

    expect(prisma.filaEventos.update).toHaveBeenCalledWith({
      where: { id: 'evento-uuid-1' },
      data: { status: 'PROCESSADO' },
    });
  });

  it('deve atualizar status com tentativas', async () => {
    (prisma.filaEventos.update as jest.Mock).mockResolvedValue({ ...eventoDb, status: 'ERRO', tentativas: 2 });

    await repository.atualizarStatus('evento-uuid-1', StatusEvento.ERRO, 2);

    expect(prisma.filaEventos.update).toHaveBeenCalledWith({
      where: { id: 'evento-uuid-1' },
      data: { status: 'ERRO', tentativas: 2 },
    });
  });
});
