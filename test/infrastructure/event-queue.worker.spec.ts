import { EventQueueWorker } from '../../src/infrastructure/workers/event-queue.worker';
import { ProcessarFilaEventosUseCase } from '../../src/application/use-cases/processar-fila-eventos.use-case';

describe('EventQueueWorker', () => {
  let worker: EventQueueWorker;
  let processarFila: jest.Mocked<ProcessarFilaEventosUseCase>;

  beforeEach(() => {
    processarFila = { execute: jest.fn() } as any;
    worker = new EventQueueWorker(processarFila);
  });

  it('deve chamar o use case ao executar handleCron', async () => {
    processarFila.execute.mockResolvedValue();

    await worker.handleCron();

    expect(processarFila.execute).toHaveBeenCalledTimes(1);
  });

  it('deve tratar erro sem propagar (log only)', async () => {
    processarFila.execute.mockRejectedValue(new Error('DB error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await worker.handleCron();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Erro ao processar fila'),
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });
});
