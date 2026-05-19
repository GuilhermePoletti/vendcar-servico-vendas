import { Module } from '@nestjs/common';
import { VendaController } from '../adapters/in/venda.controller';
import { WebhookController } from '../adapters/in/webhook.controller';
import { PrismaVendaRepository } from '../adapters/out/prisma-venda.repository';
import { PrismaFilaEventosRepository } from '../adapters/out/prisma-fila-eventos.repository';
import { HttpCatalogoApiAdapter } from '../adapters/out/http-catalogo-api.adapter';
import { EventQueueWorker } from '../workers/event-queue.worker';
import { VendaRepositoryPort } from '../../application/ports/out/venda.repository.port';
import { FilaEventosRepositoryPort } from '../../application/ports/out/fila-eventos.repository.port';
import { CatalogoApiPort } from '../../application/ports/out/catalogo-api.port';
import { IniciarVendaUseCase } from '../../application/use-cases/iniciar-venda.use-case';
import { ProcessarWebhookUseCase } from '../../application/use-cases/processar-webhook.use-case';
import { ListarVeiculosVendidosUseCase } from '../../application/use-cases/listar-veiculos-vendidos.use-case';
import { ProcessarFilaEventosUseCase } from '../../application/use-cases/processar-fila-eventos.use-case';

@Module({
  controllers: [VendaController, WebhookController],
  providers: [
    // Repositórios → tokens abstratos
    {
      provide: VendaRepositoryPort,
      useClass: PrismaVendaRepository,
    },
    {
      provide: FilaEventosRepositoryPort,
      useClass: PrismaFilaEventosRepository,
    },
    // HTTP Adapter → token abstrato
    {
      provide: CatalogoApiPort,
      useFactory: () => {
        const baseUrl = process.env.CATALOGO_API_URL || 'http://localhost:3000';
        return new HttpCatalogoApiAdapter(baseUrl);
      },
    },
    // Use Cases
    IniciarVendaUseCase,
    ProcessarWebhookUseCase,
    ListarVeiculosVendidosUseCase,
    ProcessarFilaEventosUseCase,
    // Worker
    EventQueueWorker,
  ],
})
export class VendaModule {}
