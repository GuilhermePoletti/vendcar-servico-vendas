import { VendaController } from '../../src/infrastructure/adapters/in/venda.controller';
import { IniciarVendaUseCase } from '../../src/application/use-cases/iniciar-venda.use-case';
import { ListarVeiculosVendidosUseCase } from '../../src/application/use-cases/listar-veiculos-vendidos.use-case';
import { Venda } from '../../src/domain/entities/venda.entity';
import { DomainException } from '../../src/domain/exceptions/domain.exception';
import { BadRequestException } from '@nestjs/common';

const makeMocks = () => ({
  iniciarVendaUseCase: { execute: jest.fn() } as any,
  listarVeiculosVendidosUseCase: { execute: jest.fn() } as any,
});

describe('VendaController', () => {
  let controller: VendaController;
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
    controller = new VendaController(mocks.iniciarVendaUseCase, mocks.listarVeiculosVendidosUseCase);
  });

  it('deve iniciar uma venda', async () => {
    const venda = new Venda({ cpfCliente: '52998224725', idVeiculoCatalogo: 'v-1', precoVenda: 135000 });
    mocks.iniciarVendaUseCase.execute.mockResolvedValue(venda);

    const result = await controller.iniciarVenda({ cpfCliente: '52998224725', idVeiculo: 'v-1' });

    expect(result).toEqual(venda.toJSON());
  });

  it('deve lançar BadRequestException em erro de domínio ao iniciar venda', async () => {
    mocks.iniciarVendaUseCase.execute.mockRejectedValue(new DomainException('Veículo não disponível'));

    await expect(
      controller.iniciarVenda({ cpfCliente: '52998224725', idVeiculo: 'v-1' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve propagar erro genérico ao iniciar venda', async () => {
    mocks.iniciarVendaUseCase.execute.mockRejectedValue(new Error('DB error'));

    await expect(
      controller.iniciarVenda({ cpfCliente: '52998224725', idVeiculo: 'v-1' }),
    ).rejects.toThrow('DB error');
  });

  it('deve listar veículos vendidos', async () => {
    const vendas = [
      new Venda({ cpfCliente: '52998224725', idVeiculoCatalogo: 'v-1', precoVenda: 135000 }),
    ];
    mocks.listarVeiculosVendidosUseCase.execute.mockResolvedValue(vendas);

    const result = await controller.listarVeiculosVendidos();

    expect(result).toHaveLength(1);
  });
});
