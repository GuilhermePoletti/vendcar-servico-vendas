import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { VendaRepositoryPort } from '../../../application/ports/out/venda.repository.port';
import { Venda } from '../../../domain/entities/venda.entity';
import { FilaEventos } from '../../../domain/entities/fila-eventos.entity';
import { StatusPagamento } from '../../../domain/enums/status-pagamento.enum';

@Injectable()
export class PrismaVendaRepository implements VendaRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async salvar(venda: Venda): Promise<Venda> {
    const data = await this.prisma.venda.create({
      data: {
        id: venda.id,
        cpf_cliente: venda.cpfCliente,
        id_veiculo_catalogo: venda.idVeiculoCatalogo,
        preco_venda: venda.precoVenda,
        status_pagamento: venda.statusPagamento,
        codigo_pagamento: venda.codigoPagamento,
      },
    });
    return this.toDomain(data);
  }

  async buscarPorCodigoPagamento(codigo: string): Promise<Venda | null> {
    const data = await this.prisma.venda.findUnique({ where: { codigo_pagamento: codigo } });
    return data ? this.toDomain(data) : null;
  }

  async listarVendidas(): Promise<Venda[]> {
    const data = await this.prisma.venda.findMany({
      where: { status_pagamento: 'PAGO' },
      orderBy: { preco_venda: 'asc' },
    });
    return data.map((d) => this.toDomain(d));
  }

  async atualizarStatusComEvento(
    vendaId: string,
    status: StatusPagamento,
    evento: FilaEventos,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // 1. Atualiza status da venda
      await tx.venda.update({
        where: { id: vendaId },
        data: { status_pagamento: status },
      });

      // 2. Insere evento na fila
      await tx.filaEventos.create({
        data: {
          id: evento.id,
          tipo_evento: evento.tipoEvento,
          payload: evento.payload as any,
          status: evento.status,
          tentativas: evento.tentativas,
        },
      });
    });
  }

  private toDomain(data: {
    id: string;
    cpf_cliente: string;
    id_veiculo_catalogo: string;
    preco_venda: Decimal | number;
    status_pagamento: string;
    codigo_pagamento: string;
  }): Venda {
    return new Venda({
      id: data.id,
      cpfCliente: data.cpf_cliente,
      idVeiculoCatalogo: data.id_veiculo_catalogo,
      precoVenda: Number(data.preco_venda),
      statusPagamento: data.status_pagamento as StatusPagamento,
      codigoPagamento: data.codigo_pagamento,
    });
  }
}
