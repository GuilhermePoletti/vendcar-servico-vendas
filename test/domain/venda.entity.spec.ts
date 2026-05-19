import { Venda, VendaProps } from '../../src/domain/entities/venda.entity';
import { StatusPagamento } from '../../src/domain/enums/status-pagamento.enum';

describe('Venda Entity', () => {
  const validProps: VendaProps = {
    cpfCliente: '52998224725',
    idVeiculoCatalogo: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    precoVenda: 135000.0,
  };

  // ─────────────────────────────────────────────
  // CRIAÇÃO COM SUCESSO
  // ─────────────────────────────────────────────

  describe('Criação bem-sucedida', () => {
    it('deve criar uma Venda válida com campos obrigatórios', () => {
      const venda = new Venda(validProps);

      expect(venda.cpfCliente).toBe(validProps.cpfCliente);
      expect(venda.idVeiculoCatalogo).toBe(validProps.idVeiculoCatalogo);
      expect(venda.precoVenda).toBe(validProps.precoVenda);
    });

    it('deve gerar ID automaticamente', () => {
      const venda = new Venda(validProps);
      expect(venda.id).toBeDefined();
      expect(venda.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('deve aceitar ID fornecido externamente', () => {
      const id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const venda = new Venda({ ...validProps, id });
      expect(venda.id).toBe(id);
    });

    it('deve definir status como AGUARDANDO por padrão', () => {
      const venda = new Venda(validProps);
      expect(venda.statusPagamento).toBe(StatusPagamento.AGUARDANDO);
    });

    it('deve gerar codigoPagamento automaticamente (UUID)', () => {
      const venda = new Venda(validProps);
      expect(venda.codigoPagamento).toBeDefined();
      expect(venda.codigoPagamento).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('deve aceitar codigoPagamento fornecido', () => {
      const codigo = 'pay-12345678-abcd';
      const venda = new Venda({ ...validProps, codigoPagamento: codigo });
      expect(venda.codigoPagamento).toBe(codigo);
    });

    it('deve definir dataVenda automaticamente', () => {
      const venda = new Venda(validProps);
      expect(venda.dataVenda).toBeInstanceOf(Date);
    });

    it('deve aceitar dataVenda fornecida', () => {
      const data = new Date('2025-06-15');
      const venda = new Venda({ ...validProps, dataVenda: data });
      expect(venda.dataVenda).toBe(data);
    });

    it('deve aceitar status fornecido explicitamente', () => {
      const venda = new Venda({
        ...validProps,
        statusPagamento: StatusPagamento.PAGO,
      });
      expect(venda.statusPagamento).toBe(StatusPagamento.PAGO);
    });
  });

  // ─────────────────────────────────────────────
  // VALIDAÇÃO DE CAMPOS
  // ─────────────────────────────────────────────

  describe('Validação de campos', () => {
    it('deve lançar erro quando cpfCliente é vazio', () => {
      expect(() => new Venda({ ...validProps, cpfCliente: '' })).toThrow();
    });

    it('deve lançar erro quando cpfCliente não tem 11 dígitos', () => {
      expect(() => new Venda({ ...validProps, cpfCliente: '123' })).toThrow();
    });

    it('deve lançar erro quando idVeiculoCatalogo é vazio', () => {
      expect(() => new Venda({ ...validProps, idVeiculoCatalogo: '' })).toThrow();
    });

    it('deve lançar erro quando precoVenda é zero', () => {
      expect(() => new Venda({ ...validProps, precoVenda: 0 })).toThrow();
    });

    it('deve lançar erro quando precoVenda é negativo', () => {
      expect(() => new Venda({ ...validProps, precoVenda: -100 })).toThrow();
    });
  });

  // ─────────────────────────────────────────────
  // TRANSIÇÕES DE STATUS DO PAGAMENTO
  // ─────────────────────────────────────────────

  describe('Transição: confirmarPagamento()', () => {
    it('deve transicionar de AGUARDANDO para PAGO', () => {
      const venda = new Venda(validProps);
      venda.confirmarPagamento();
      expect(venda.statusPagamento).toBe(StatusPagamento.PAGO);
    });

    it('deve lançar erro ao confirmar pagamento já PAGO', () => {
      const venda = new Venda({ ...validProps, statusPagamento: StatusPagamento.PAGO });
      expect(() => venda.confirmarPagamento()).toThrow();
    });

    it('deve lançar erro ao confirmar pagamento já CANCELADO', () => {
      const venda = new Venda({ ...validProps, statusPagamento: StatusPagamento.CANCELADO });
      expect(() => venda.confirmarPagamento()).toThrow();
    });
  });

  describe('Transição: cancelarPagamento()', () => {
    it('deve transicionar de AGUARDANDO para CANCELADO', () => {
      const venda = new Venda(validProps);
      venda.cancelarPagamento();
      expect(venda.statusPagamento).toBe(StatusPagamento.CANCELADO);
    });

    it('deve lançar erro ao cancelar pagamento já PAGO', () => {
      const venda = new Venda({ ...validProps, statusPagamento: StatusPagamento.PAGO });
      expect(() => venda.cancelarPagamento()).toThrow();
    });

    it('deve lançar erro ao cancelar pagamento já CANCELADO', () => {
      const venda = new Venda({ ...validProps, statusPagamento: StatusPagamento.CANCELADO });
      expect(() => venda.cancelarPagamento()).toThrow();
    });
  });

  // ─────────────────────────────────────────────
  // IMUTABILIDADE
  // ─────────────────────────────────────────────

  describe('Imutabilidade', () => {
    it('não deve permitir alteração direta das propriedades', () => {
      const venda = new Venda(validProps);

      expect(() => { (venda as any).cpfCliente = '99999999999'; }).toThrow();
      expect(() => { (venda as any).precoVenda = 999; }).toThrow();
    });
  });
});
