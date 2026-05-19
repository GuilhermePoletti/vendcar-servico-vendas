import { FilaEventos } from '../../../domain/entities/fila-eventos.entity';
import { StatusEvento } from '../../../domain/enums/status-evento.enum';

export abstract class FilaEventosRepositoryPort {
  abstract buscarPendentes(): Promise<FilaEventos[]>;
  abstract atualizarStatus(id: string, status: StatusEvento, tentativas?: number): Promise<void>;
}
