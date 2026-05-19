import { Injectable } from '@nestjs/common';
import { Venda } from '../../domain/entities/venda.entity';
import { VendaRepositoryPort } from '../ports/out/venda.repository.port';

@Injectable()
export class ListarVeiculosVendidosUseCase {
  constructor(private readonly vendaRepository: VendaRepositoryPort) {}

  async execute(): Promise<Venda[]> {
    return this.vendaRepository.listarVendidas();
  }
}
