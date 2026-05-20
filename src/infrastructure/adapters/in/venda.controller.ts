import {
  Controller, Get, Post,
  Body, HttpCode, HttpStatus, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IniciarVendaUseCase } from '../../../application/use-cases/iniciar-venda.use-case';
import { ListarVeiculosVendidosUseCase } from '../../../application/use-cases/listar-veiculos-vendidos.use-case';
import { IniciarVendaDto } from './dto/venda.dto';
import { DomainException } from '../../../domain/exceptions/domain.exception';

@ApiTags('Vendas')
@Controller('vendas')
export class VendaController {
  constructor(
    private readonly iniciarVendaUseCase: IniciarVendaUseCase,
    private readonly listarVeiculosVendidosUseCase: ListarVeiculosVendidosUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Iniciar uma venda (SAGA Step 1)' })
  @ApiResponse({ status: 201, description: 'Venda iniciada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou veículo não disponível' })
  async iniciarVenda(@Body() dto: IniciarVendaDto) {
    try {
      const venda = await this.iniciarVendaUseCase.execute(dto);
      return venda.toJSON();
    } catch (error) {
      if (error instanceof DomainException) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get('veiculos')
  @ApiOperation({ summary: 'Listar veículos vendidos (preço crescente)' })
  @ApiResponse({ status: 200, description: 'Lista de veículos vendidos' })
  async listarVeiculosVendidos() {
    const vendas = await this.listarVeiculosVendidosUseCase.execute();
    return vendas.map(v => v.toJSON());
  }
}
