import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ProcessarFilaEventosUseCase } from '../../application/use-cases/processar-fila-eventos.use-case';

@Injectable()
export class EventQueueWorker {
  constructor(private readonly processarFilaEventos: ProcessarFilaEventosUseCase) {}

  @Cron('*/10 * * * * *') // A cada 10 segundos
  async handleCron() {
    try {
      await this.processarFilaEventos.execute();
    } catch (error) {
      console.error('Erro ao processar fila de eventos:', error);
    }
  }
}
