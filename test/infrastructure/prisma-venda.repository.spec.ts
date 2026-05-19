import { PrismaVendaRepository } from '../../src/infrastructure/adapters/out/prisma-venda.repository';
import { PrismaService } from '../../src/infrastructure/prisma/prisma.service';
import { Venda } from '../../src/domain/entities/venda.entity';
import { FilaEventos } from '../../src/domain/entities/fila-eventos.entity';
import { StatusPagamento } from '../../src/domain/enums/status-pagamento.enum';
import { TipoEvento } from '../../src/domain/enums/tipo-evento.enum';
import { Decimal } from '@prisma/client/runtime/library';

const makePrismaService = (): jest.Mocked<PrismaService> => {
  return {
    venda: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  } as any;
};

const vendaDb = {
  id: 'venda-uuid-1',
  cpf_cliente: '52998224725',
  id_veiculo_catalogo: 'veiculo-1',
  data_venda: new Date(),
  preco_venda: new Decimal('135000.00'),
  status_pagamento: 'AGUARDANDO' as const,
  codigo_pagamento: 'PAG-12345',
  criado_em: new Date(),
  atualizado_em: new Date(),
};

describe('PrismaVendaRepository', () => {
  let repository: PrismaVendaRepository;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(() => {
    prisma = makePrismaService();
    repository = new PrismaVendaRepository(prisma);
  });

  it('deve salvar uma venda', async () => {
    const venda = new Venda({ cpfCliente: '52998224725', idVeiculoCatalogo: 'veiculo-1', precoVenda: 135000 });
    (prisma.venda.create as jest.Mock).mockResolvedValue({ ...vendaDb, id: venda.id });

    const result = await repository.salvar(venda);

    expect(prisma.venda.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: venda.id,
        cpf_cliente: '52998224725',
        id_veiculo_catalogo: 'veiculo-1',
        preco_venda: 135000,
        status_pagamento: 'AGUARDANDO',
        codigo_pagamento: venda.codigoPagamento,
      }),
    });
    expect(result).toBeInstanceOf(Venda);
  });

  it('deve buscar venda por código de pagamento', async () => {
    (prisma.venda.findUnique as jest.Mock).mockResolvedValue(vendaDb);

    const result = await repository.buscarPorCodigoPagamento('PAG-12345');

    expect(prisma.venda.findUnique).toHaveBeenCalledWith({ where: { codigo_pagamento: 'PAG-12345' } });
    expect(result).toBeInstanceOf(Venda);
    expect(result!.cpfCliente).toBe('52998224725');
  });

  it('deve retornar null quando venda não encontrada', async () => {
    (prisma.venda.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await repository.buscarPorCodigoPagamento('inexistente');

    expect(result).toBeNull();
  });

  it('deve listar vendas com status PAGO', async () => {
    (prisma.venda.findMany as jest.Mock).mockResolvedValue([{ ...vendaDb, status_pagamento: 'PAGO' }]);

    const result = await repository.listarVendidas();

    expect(prisma.venda.findMany).toHaveBeenCalledWith({
      where: { status_pagamento: 'PAGO' },
      orderBy: { preco_venda: 'asc' },
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(Venda);
  });

  it('deve atualizar status com evento em transação atômica', async () => {
    const evento = new FilaEventos({
      tipoEvento: TipoEvento.CONFIRMAR_VENDA,
      payload: { idVeiculo: 'veiculo-1' },
    });
    (prisma.$transaction as jest.Mock).mockResolvedValue(undefined);

    await repository.atualizarStatusComEvento('venda-uuid-1', StatusPagamento.PAGO, evento);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const transactionFn = (prisma.$transaction as jest.Mock).mock.calls[0][0];
    expect(typeof transactionFn).toBe('function');
  });

  it('deve executar UPDATE e INSERT dentro da transação', async () => {
    const evento = new FilaEventos({
      tipoEvento: TipoEvento.CANCELAR_VENDA,
      payload: { idVeiculo: 'veiculo-2' },
    });
    const mockTx = {
      venda: { update: jest.fn().mockResolvedValue(vendaDb) },
      filaEventos: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => fn(mockTx));

    await repository.atualizarStatusComEvento('venda-uuid-1', StatusPagamento.CANCELADO, evento);

    expect(mockTx.venda.update).toHaveBeenCalledWith({
      where: { id: 'venda-uuid-1' },
      data: { status_pagamento: 'CANCELADO' },
    });
    expect(mockTx.filaEventos.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: evento.id,
        tipo_evento: 'CANCELAR_VENDA',
        payload: { idVeiculo: 'veiculo-2' },
        status: 'PENDENTE',
        tentativas: 0,
      }),
    });
  });
});
