import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FilaEventosRepositoryPort } from '../../../application/ports/out/fila-eventos.repository.port';
import { FilaEventos } from '../../../domain/entities/fila-eventos.entity';
import { StatusEvento } from '../../../domain/enums/status-evento.enum';
import { TipoEvento } from '../../../domain/enums/tipo-evento.enum';

@Injectable()
export class PrismaFilaEventosRepository implements FilaEventosRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPendentes(): Promise<FilaEventos[]> {
    const data = await this.prisma.filaEventos.findMany({
      where: { status: 'PENDENTE' },
      orderBy: { data_criacao: 'asc' },
    });
    return data.map((d) => this.toDomain(d));
  }

  async atualizarStatus(id: string, status: StatusEvento, tentativas?: number): Promise<void> {
    const updateData: any = { status };
    if (tentativas !== undefined) {
      updateData.tentativas = tentativas;
    }
    await this.prisma.filaEventos.update({
      where: { id },
      data: updateData,
    });
  }

  private toDomain(data: {
    id: string;
    tipo_evento: string;
    payload: any;
    status: string;
    tentativas: number;
  }): FilaEventos {
    return new FilaEventos({
      id: data.id,
      tipoEvento: data.tipo_evento as TipoEvento,
      payload: data.payload as Record<string, unknown>,
      status: data.status as StatusEvento,
      tentativas: data.tentativas,
    });
  }
}
