import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import {
  CatalogoApiPort,
  ClienteResponse,
  VeiculoResponse,
} from '../../../application/ports/out/catalogo-api.port';

@Injectable()
export class HttpCatalogoApiAdapter implements CatalogoApiPort {
  private readonly http: AxiosInstance;

  constructor(baseURL: string) {
    this.http = axios.create({
      baseURL,
      timeout: 10000,
    });
  }

  async buscarClientePorCpf(cpf: string): Promise<ClienteResponse> {
    const { data } = await this.http.get(`/clientes/cpf/${cpf}`);
    return data;
  }

  async buscarVeiculoPorId(id: string): Promise<VeiculoResponse> {
    const { data } = await this.http.get(`/veiculos/${id}`);
    return data;
  }

  async reservarVeiculo(id: string): Promise<void> {
    await this.http.patch(`/veiculos/${id}/reservar`);
  }

  async confirmarVendaVeiculo(id: string): Promise<void> {
    await this.http.patch(`/veiculos/${id}/vender`);
  }

  async cancelarReservaVeiculo(id: string): Promise<void> {
    await this.http.patch(`/veiculos/${id}/disponibilizar`);
  }
}
