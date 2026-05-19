import { HttpCatalogoApiAdapter } from '../../src/infrastructure/adapters/out/http-catalogo-api.adapter';
import axios from 'axios';

jest.mock('axios', () => {
  const mockAxios = {
    create: jest.fn(),
    get: jest.fn(),
    patch: jest.fn(),
  };
  mockAxios.create.mockReturnValue(mockAxios);
  return { default: mockAxios, __esModule: true };
});

describe('HttpCatalogoApiAdapter', () => {
  let adapter: HttpCatalogoApiAdapter;
  let mockAxiosInstance: any;

  beforeEach(() => {
    mockAxiosInstance = axios.create();
    adapter = new HttpCatalogoApiAdapter('http://localhost:3000');
  });

  it('deve buscar cliente por CPF', async () => {
    mockAxiosInstance.get.mockResolvedValue({
      data: { id: 'c-1', nome: 'João', cpf: '52998224725' },
    });

    const result = await adapter.buscarClientePorCpf('52998224725');

    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/clientes/cpf/52998224725');
    expect(result.cpf).toBe('52998224725');
  });

  it('deve buscar veículo por ID', async () => {
    mockAxiosInstance.get.mockResolvedValue({
      data: { id: 'v-1', preco: 135000, status: 'DISPONIVEL' },
    });

    const result = await adapter.buscarVeiculoPorId('v-1');

    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/veiculos/v-1');
    expect(result.preco).toBe(135000);
  });

  it('deve reservar veículo', async () => {
    mockAxiosInstance.patch.mockResolvedValue({});

    await adapter.reservarVeiculo('v-1');

    expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/veiculos/v-1/reservar');
  });

  it('deve confirmar venda de veículo', async () => {
    mockAxiosInstance.patch.mockResolvedValue({});

    await adapter.confirmarVendaVeiculo('v-1');

    expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/veiculos/v-1/vender');
  });

  it('deve cancelar reserva de veículo', async () => {
    mockAxiosInstance.patch.mockResolvedValue({});

    await adapter.cancelarReservaVeiculo('v-1');

    expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/veiculos/v-1/disponibilizar');
  });

  it('deve propagar erro HTTP', async () => {
    mockAxiosInstance.get.mockRejectedValue(new Error('Connection refused'));

    await expect(adapter.buscarClientePorCpf('52998224725')).rejects.toThrow('Connection refused');
  });
});
