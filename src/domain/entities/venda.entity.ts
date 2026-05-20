import { randomUUID } from 'node:crypto';
import { DomainException } from '../exceptions/domain.exception';
import { StatusPagamento } from '../enums/status-pagamento.enum';

export interface VendaProps {
  id?: string;
  cpfCliente: string;
  idVeiculoCatalogo: string;
  dataVenda?: Date;
  precoVenda: number;
  statusPagamento?: StatusPagamento;
  codigoPagamento?: string;
}

export class Venda {
  private readonly _id: string;
  private readonly _cpfCliente: string;
  private readonly _idVeiculoCatalogo: string;
  private readonly _dataVenda: Date;
  private readonly _precoVenda: number;
  private _statusPagamento: StatusPagamento;
  private readonly _codigoPagamento: string;

  constructor(props: VendaProps) {
    this.validarCpf(props.cpfCliente);
    this.validarIdVeiculo(props.idVeiculoCatalogo);
    this.validarPreco(props.precoVenda);

    this._id = props.id ?? randomUUID();
    this._cpfCliente = props.cpfCliente;
    this._idVeiculoCatalogo = props.idVeiculoCatalogo;
    this._dataVenda = props.dataVenda ?? new Date();
    this._precoVenda = props.precoVenda;
    this._statusPagamento = props.statusPagamento ?? StatusPagamento.AGUARDANDO;
    this._codigoPagamento = props.codigoPagamento ?? randomUUID();
  }

  get id(): string { return this._id; }
  get cpfCliente(): string { return this._cpfCliente; }
  get idVeiculoCatalogo(): string { return this._idVeiculoCatalogo; }
  get dataVenda(): Date { return this._dataVenda; }
  get precoVenda(): number { return this._precoVenda; }
  get statusPagamento(): StatusPagamento { return this._statusPagamento; }
  get codigoPagamento(): string { return this._codigoPagamento; }

  confirmarPagamento(): void {
    if (this._statusPagamento !== StatusPagamento.AGUARDANDO) {
      throw new DomainException(
        `Não é possível confirmar pagamento com status ${this._statusPagamento}. Apenas vendas AGUARDANDO podem ser confirmadas.`,
      );
    }
    this._statusPagamento = StatusPagamento.PAGO;
  }

  cancelarPagamento(): void {
    if (this._statusPagamento !== StatusPagamento.AGUARDANDO) {
      throw new DomainException(
        `Não é possível cancelar pagamento com status ${this._statusPagamento}. Apenas vendas AGUARDANDO podem ser canceladas.`,
      );
    }
    this._statusPagamento = StatusPagamento.CANCELADO;
  }

  private validarCpf(cpf: string): void {
    if (!cpf || !/^\d{11}$/.test(cpf)) {
      throw new DomainException('CPF deve conter exatamente 11 dígitos numéricos');
    }
  }

  private validarIdVeiculo(id: string): void {
    if (!id || id.trim().length === 0) {
      throw new DomainException('ID do veículo do catálogo é obrigatório');
    }
  }

  private validarPreco(preco: number): void {
    if (preco <= 0) {
      throw new DomainException('Preço da venda deve ser maior que zero');
    }
  }

  toJSON() {
    return {
      id: this.id,
      cpfCliente: this.cpfCliente,
      idVeiculoCatalogo: this.idVeiculoCatalogo,
      dataVenda: this.dataVenda,
      precoVenda: this.precoVenda,
      statusPagamento: this.statusPagamento,
      codigoPagamento: this.codigoPagamento,
    };
  }
}
