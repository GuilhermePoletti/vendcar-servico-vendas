import { randomUUID } from 'node:crypto';
import { DomainException } from '../exceptions/domain.exception';
import { StatusEvento } from '../enums/status-evento.enum';
import { TipoEvento } from '../enums/tipo-evento.enum';

export interface FilaEventosProps {
  id?: string;
  tipoEvento: TipoEvento;
  payload: Record<string, any>;
  status?: StatusEvento;
  tentativas?: number;
  dataCriacao?: Date;
}

export class FilaEventos {
  private readonly _id: string;
  private readonly _tipoEvento: TipoEvento;
  private readonly _payload: Record<string, any>;
  private _status: StatusEvento;
  private _tentativas: number;
  private readonly _dataCriacao: Date;

  constructor(props: FilaEventosProps) {
    this.validarPayload(props.payload);

    this._id = props.id ?? randomUUID();
    this._tipoEvento = props.tipoEvento;
    this._payload = props.payload;
    this._status = props.status ?? StatusEvento.PENDENTE;
    this._tentativas = props.tentativas ?? 0;
    this._dataCriacao = props.dataCriacao ?? new Date();
  }

  get id(): string { return this._id; }
  get tipoEvento(): TipoEvento { return this._tipoEvento; }
  get payload(): Record<string, any> { return this._payload; }
  get status(): StatusEvento { return this._status; }
  get tentativas(): number { return this._tentativas; }
  get dataCriacao(): Date { return this._dataCriacao; }

  marcarProcessado(): void {
    if (this._status === StatusEvento.PROCESSADO) {
      throw new DomainException('Evento já foi processado');
    }
    this._status = StatusEvento.PROCESSADO;
  }

  marcarErro(): void {
    if (this._status === StatusEvento.PROCESSADO) {
      throw new DomainException('Não é possível marcar erro em evento já processado');
    }
    this._status = StatusEvento.ERRO;
    this._tentativas++;
  }

  reprocessar(): void {
    if (this._status !== StatusEvento.ERRO) {
      throw new DomainException(
        `Apenas eventos com status ERRO podem ser reprocessados. Status atual: ${this._status}`,
      );
    }
    this._status = StatusEvento.PENDENTE;
  }

  private validarPayload(payload: Record<string, any>): void {
    if (!payload) {
      throw new DomainException('Payload é obrigatório');
    }
    if (!payload['idVeiculo']) {
      throw new DomainException('Payload deve conter idVeiculo');
    }
  }
}
