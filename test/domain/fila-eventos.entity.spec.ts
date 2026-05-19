import { FilaEventos, FilaEventosProps } from '../../src/domain/entities/fila-eventos.entity';
import { StatusEvento } from '../../src/domain/enums/status-evento.enum';
import { TipoEvento } from '../../src/domain/enums/tipo-evento.enum';

describe('FilaEventos Entity', () => {
  const validProps: FilaEventosProps = {
    tipoEvento: TipoEvento.CONFIRMAR_VENDA,
    payload: { idVeiculo: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' },
  };

  // ─────────────────────────────────────────────
  // CRIAÇÃO COM SUCESSO
  // ─────────────────────────────────────────────

  describe('Criação bem-sucedida', () => {
    it('deve criar um evento válido', () => {
      const evento = new FilaEventos(validProps);

      expect(evento.tipoEvento).toBe(TipoEvento.CONFIRMAR_VENDA);
      expect(evento.payload).toEqual(validProps.payload);
    });

    it('deve gerar ID automaticamente', () => {
      const evento = new FilaEventos(validProps);
      expect(evento.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('deve definir status como PENDENTE por padrão', () => {
      const evento = new FilaEventos(validProps);
      expect(evento.status).toBe(StatusEvento.PENDENTE);
    });

    it('deve definir tentativas como 0 por padrão', () => {
      const evento = new FilaEventos(validProps);
      expect(evento.tentativas).toBe(0);
    });

    it('deve definir dataCriacao automaticamente', () => {
      const evento = new FilaEventos(validProps);
      expect(evento.dataCriacao).toBeInstanceOf(Date);
    });

    it('deve aceitar status fornecido explicitamente', () => {
      const evento = new FilaEventos({
        ...validProps,
        status: StatusEvento.ERRO,
        tentativas: 2,
      });
      expect(evento.status).toBe(StatusEvento.ERRO);
      expect(evento.tentativas).toBe(2);
    });

    it('deve aceitar tipo CANCELAR_VENDA', () => {
      const evento = new FilaEventos({
        ...validProps,
        tipoEvento: TipoEvento.CANCELAR_VENDA,
      });
      expect(evento.tipoEvento).toBe(TipoEvento.CANCELAR_VENDA);
    });
  });

  // ─────────────────────────────────────────────
  // VALIDAÇÃO
  // ─────────────────────────────────────────────

  describe('Validação', () => {
    it('deve lançar erro quando payload é nulo', () => {
      expect(() => new FilaEventos({ ...validProps, payload: null as any })).toThrow();
    });

    it('deve lançar erro quando payload não contém idVeiculo', () => {
      expect(() => new FilaEventos({ ...validProps, payload: {} })).toThrow();
    });
  });

  // ─────────────────────────────────────────────
  // TRANSIÇÕES DE STATUS
  // ─────────────────────────────────────────────

  describe('Transição: marcarProcessado()', () => {
    it('deve transicionar de PENDENTE para PROCESSADO', () => {
      const evento = new FilaEventos(validProps);
      evento.marcarProcessado();
      expect(evento.status).toBe(StatusEvento.PROCESSADO);
    });

    it('deve lançar erro ao processar evento já PROCESSADO', () => {
      const evento = new FilaEventos({ ...validProps, status: StatusEvento.PROCESSADO });
      expect(() => evento.marcarProcessado()).toThrow();
    });
  });

  describe('Transição: marcarErro()', () => {
    it('deve transicionar de PENDENTE para ERRO', () => {
      const evento = new FilaEventos(validProps);
      evento.marcarErro();
      expect(evento.status).toBe(StatusEvento.ERRO);
    });

    it('deve incrementar tentativas ao marcar erro', () => {
      const evento = new FilaEventos(validProps);
      expect(evento.tentativas).toBe(0);
      evento.marcarErro();
      expect(evento.tentativas).toBe(1);
    });

    it('deve lançar erro ao marcar erro em evento PROCESSADO', () => {
      const evento = new FilaEventos({ ...validProps, status: StatusEvento.PROCESSADO });
      expect(() => evento.marcarErro()).toThrow();
    });
  });

  describe('Transição: reprocessar()', () => {
    it('deve transicionar de ERRO para PENDENTE', () => {
      const evento = new FilaEventos({ ...validProps, status: StatusEvento.ERRO, tentativas: 1 });
      evento.reprocessar();
      expect(evento.status).toBe(StatusEvento.PENDENTE);
    });

    it('deve manter o contador de tentativas ao reprocessar', () => {
      const evento = new FilaEventos({ ...validProps, status: StatusEvento.ERRO, tentativas: 3 });
      evento.reprocessar();
      expect(evento.tentativas).toBe(3);
    });

    it('deve lançar erro ao reprocessar evento PENDENTE', () => {
      const evento = new FilaEventos(validProps);
      expect(() => evento.reprocessar()).toThrow();
    });

    it('deve lançar erro ao reprocessar evento PROCESSADO', () => {
      const evento = new FilaEventos({ ...validProps, status: StatusEvento.PROCESSADO });
      expect(() => evento.reprocessar()).toThrow();
    });
  });

  // ─────────────────────────────────────────────
  // FLUXO COMPLETO
  // ─────────────────────────────────────────────

  describe('Fluxo completo', () => {
    it('deve permitir PENDENTE → ERRO → PENDENTE → PROCESSADO', () => {
      const evento = new FilaEventos(validProps);

      evento.marcarErro();
      expect(evento.status).toBe(StatusEvento.ERRO);
      expect(evento.tentativas).toBe(1);

      evento.reprocessar();
      expect(evento.status).toBe(StatusEvento.PENDENTE);

      evento.marcarProcessado();
      expect(evento.status).toBe(StatusEvento.PROCESSADO);
    });

    it('deve permitir múltiplos erros e retries', () => {
      const evento = new FilaEventos(validProps);

      evento.marcarErro();
      evento.reprocessar();
      evento.marcarErro();
      evento.reprocessar();
      evento.marcarErro();

      expect(evento.tentativas).toBe(3);
      expect(evento.status).toBe(StatusEvento.ERRO);
    });
  });
});
