export interface ClienteResponse {
  id: string;
  nome: string;
  cpf: string;
}

export interface VeiculoResponse {
  id: string;
  preco: number;
  status: string;
}

export abstract class CatalogoApiPort {
  abstract buscarClientePorCpf(cpf: string): Promise<ClienteResponse>;
  abstract buscarVeiculoPorId(id: string): Promise<VeiculoResponse>;
  abstract reservarVeiculo(id: string): Promise<void>;
  abstract confirmarVendaVeiculo(id: string): Promise<void>;
  abstract cancelarReservaVeiculo(id: string): Promise<void>;
}
