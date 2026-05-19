import { Injectable } from '@nestjs/common';
import { FilaEventosRepositoryPort } from '../ports/out/fila-eventos.repository.port';
import { CatalogoApiPort } from '../ports/out/catalogo-api.port';
import { TipoEvento } from '../../domain/enums/tipo-evento.enum';
import { StatusEvento } from '../../domain/enums/status-evento.enum';

@Injectable()
export class ProcessarFilaEventosUseCase {
  constructor(
    private readonly filaEventosRepository: FilaEventosRepositoryPort,
    private readonly catalogoApi: CatalogoApiPort,
  ) {}

  async execute(): Promise<void> {
    const eventosPendentes = await this.filaEventosRepository.buscarPendentes();

    for (const evento of eventosPendentes) {
      try {
        const idVeiculo = evento.payload['idVeiculo'];

        if (evento.tipoEvento === TipoEvento.CONFIRMAR_VENDA) {
          await this.catalogoApi.confirmarVendaVeiculo(idVeiculo);
        } else if (evento.tipoEvento === TipoEvento.CANCELAR_VENDA) {
          await this.catalogoApi.cancelarReservaVeiculo(idVeiculo);
        }

        // Sucesso → marcar como PROCESSADO
        await this.filaEventosRepository.atualizarStatus(evento.id, StatusEvento.PROCESSADO);
      } catch {
        // Falha HTTP → marcar como ERRO e incrementar tentativas
        await this.filaEventosRepository.atualizarStatus(
          evento.id,
          StatusEvento.ERRO,
          evento.tentativas + 1,
        );
      }
    }
  }
}
