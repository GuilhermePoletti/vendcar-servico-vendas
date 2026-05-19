import { Injectable } from '@nestjs/common';
import { Venda } from '../../domain/entities/venda.entity';
import { VendaRepositoryPort } from '../ports/out/venda.repository.port';
import { CatalogoApiPort } from '../ports/out/catalogo-api.port';
import { DomainException } from '../../domain/exceptions/domain.exception';

export interface IniciarVendaInput {
  cpfCliente: string;
  idVeiculo: string;
}

@Injectable()
export class IniciarVendaUseCase {
  constructor(
    private readonly vendaRepository: VendaRepositoryPort,
    private readonly catalogoApi: CatalogoApiPort,
  ) {}

  async execute(input: IniciarVendaInput): Promise<Venda> {
    // 1. Validar cliente no Serviço Principal
    await this.catalogoApi.buscarClientePorCpf(input.cpfCliente);

    // 2. Buscar e validar veículo no Serviço Principal
    const veiculo = await this.catalogoApi.buscarVeiculoPorId(input.idVeiculo);
    if (veiculo.status !== 'DISPONIVEL') {
      throw new DomainException(
        `Veículo ${input.idVeiculo} não está disponível para venda. Status atual: ${veiculo.status}`,
      );
    }

    // 3. Reservar veículo no Serviço Principal (SAGA Lock)
    await this.catalogoApi.reservarVeiculo(input.idVeiculo);

    // 4. Criar Venda localmente (status AGUARDANDO, gera codigoPagamento)
    const venda = new Venda({
      cpfCliente: input.cpfCliente,
      idVeiculoCatalogo: input.idVeiculo,
      precoVenda: veiculo.preco,
    });

    // 5. Persistir
    return this.vendaRepository.salvar(venda);
  }
}
