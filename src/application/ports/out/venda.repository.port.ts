import { Venda } from '../../../domain/entities/venda.entity';
import { FilaEventos } from '../../../domain/entities/fila-eventos.entity';
import { StatusPagamento } from '../../../domain/enums/status-pagamento.enum';

export abstract class VendaRepositoryPort {
  abstract salvar(venda: Venda): Promise<Venda>;
  abstract buscarPorCodigoPagamento(codigo: string): Promise<Venda | null>;
  abstract listarVendidas(): Promise<Venda[]>;
  abstract atualizarStatusComEvento(
    vendaId: string,
    status: StatusPagamento,
    evento: FilaEventos,
  ): Promise<void>;
}
