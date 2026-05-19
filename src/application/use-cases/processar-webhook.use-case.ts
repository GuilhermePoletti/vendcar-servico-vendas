import { Injectable } from '@nestjs/common';
import { VendaRepositoryPort } from '../ports/out/venda.repository.port';
import { DomainException } from '../../domain/exceptions/domain.exception';
import { FilaEventos } from '../../domain/entities/fila-eventos.entity';
import { StatusPagamento } from '../../domain/enums/status-pagamento.enum';
import { TipoEvento } from '../../domain/enums/tipo-evento.enum';

export interface ProcessarWebhookInput {
  codigoPagamento: string;
  status: 'EFETUADO' | 'CANCELADO';
}

@Injectable()
export class ProcessarWebhookUseCase {
  constructor(private readonly vendaRepository: VendaRepositoryPort) {}

  async execute(input: ProcessarWebhookInput): Promise<void> {
    // 1. Buscar venda pelo código de pagamento
    const venda = await this.vendaRepository.buscarPorCodigoPagamento(input.codigoPagamento);
    if (!venda) {
      throw new DomainException(
        `Venda não encontrada para o código de pagamento ${input.codigoPagamento}`,
      );
    }

    // 2. Determinar ação baseada no status do webhook
    let novoStatus: StatusPagamento;
    let tipoEvento: TipoEvento;

    if (input.status === 'EFETUADO') {
      venda.confirmarPagamento(); // Valida transição AGUARDANDO → PAGO (lança DomainException se inválido)
      novoStatus = StatusPagamento.PAGO;
      tipoEvento = TipoEvento.CONFIRMAR_VENDA;
    } else {
      venda.cancelarPagamento(); // Valida transição AGUARDANDO → CANCELADO
      novoStatus = StatusPagamento.CANCELADO;
      tipoEvento = TipoEvento.CANCELAR_VENDA;
    }

    // 3. Criar evento para a fila
    const evento = new FilaEventos({
      tipoEvento,
      payload: { idVeiculo: venda.idVeiculoCatalogo },
    });

    // 4. Salvar tudo em transação atômica (UPDATE venda + INSERT evento)
    await this.vendaRepository.atualizarStatusComEvento(venda.id, novoStatus, evento);
  }
}
