# 💰 VendCar — Serviço de Vendas (Orquestrador SAGA)
> **Orquestrador Transacional de Vendas do Ecossistema VendCar · FIAP**
> 
> [![CI Status](https://img.shields.io/badge/CI-Passing-success?style=for-the-badge&logo=github-actions)](https://github.com/GuilhermePoletti/vendcar-servico-vendas/actions)
> [![Test Coverage](https://img.shields.io/badge/Coverage-100%25-success?style=for-the-badge&logo=jest)](#)
> [![Architecture](https://img.shields.io/badge/Architecture-Hexagonal-blue?style=for-the-badge)](#)
> [![Framework](https://img.shields.io/badge/Framework-NestJS%2011-red?style=for-the-badge&logo=nestjs)](https://nestjs.com/)

O **Serviço de Vendas** atua como o cérebro orquestrador das transações comerciais dentro do ecossistema **VendCar**. Ele implementa o padrão **SAGA Orquestrado** para coordenar a consistência eventual de reservas de veículos entre múltiplos microsserviços, gerencia a recepção de webhooks de pagamento de forma tolerante a falhas (transacional com fila local) e consolida os relatórios comerciais.

---

## 🔄 Fluxo do SAGA Orquestrado e Reconciliação Assíncrona

Para lidar de forma robusta com as oscilações de rede sem o uso de brokers de mensageria adicionais, o microsserviço divide a transação SAGA em três etapas distintas:

### Etapa 1: Iniciar Venda (Síncrona)
Quando uma requisição de compra chega, o serviço faz chamadas síncronas ao **Serviço Principal**:
1. `GET /principal/clientes/cpf/:cpf` para validar se o cliente está ativo.
2. `PATCH /principal/veiculos/:id/reservar` para realizar o bloqueio do veículo (SAGA Lock).
3. Cria a venda local com status de pagamento `AGUARDANDO` e gera o código de pagamento único.

### Etapa 2: Confirmação de Pagamento via Webhook (Transacional)
Ao receber uma notificação de sucesso/falha do gateway de pagamento:
1. Uma transação ACID é aberta localmente no banco de dados `db_vendas`.
2. O status do pagamento da venda é alterado para `PAGO` (ou `CANCELADO`).
3. Um evento do tipo `CONFIRMAR_VENDA` (ou `CANCELAR_VENDA`) é inserido na tabela local `FilaEventos` com status `PENDENTE`.
4. A transação é persistida com segurança (padrão Inbox/Outbox transacional).

### Etapa 3: Reconciliação Garantida (Assíncrona via Worker)
Um worker em background (`EventQueueWorker`) é executado a cada **10 segundos**:
1. Seleciona todos os eventos `PENDENTE` na fila.
2. Executa a requisição correspondente para alterar permanentemente o estado no Serviço Principal:
    - Se `CONFIRMAR_VENDA` -> `PATCH /principal/veiculos/:id/vender`.
    - Se `CANCELAR_VENDA` -> `PATCH /principal/veiculos/:id/disponibilizar`.
3. Se a chamada for bem-sucedida, atualiza o status do evento na fila para `PROCESSADO`.
4. Se houver falhas de rede, incrementa as tentativas de reenvio com tratamento de erro integrado.

---

## 🏗️ Design e Arquitetura Hexagonal (Clean Architecture)

Este microsserviço foi estruturado de acordo com os princípios da **Clean Architecture**, dividindo suas responsabilidades em:
- `src/domain/`: Entidades de negócio puro (`Venda`, `FilaEventos`), enums e tratamento de exceções de domínio.
- `src/application/`: Casos de uso de negócio (`IniciarVendaUseCase`, `ProcessarWebhookUseCase`, `ListarVeiculosVendidosUseCase`, `ProcessarFilaEventosUseCase`) e interfaces de adaptadores externos (como `CatalogoApiPort` e repositórios).
- `src/infrastructure/`: Contém os adaptadores reais, como conexões de banco Prisma (`adapters/out/`), controlador NestJS REST (`adapters/in/`), e o executor em segundo plano `@Cron` (`workers/`).

---

## 📡 Endpoints das APIs e Payloads

O Swagger UI interativo para este serviço fica disponível localmente na porta `:3001` no endereço: `http://localhost:3001/api`.

### 1. Iniciar Venda
*   **Endpoint**: `POST /vendas`
    *   **Request Body**:
        ```json
        {
          "cpfCliente": "52998224725",
          "idVeiculo": "d1947aff-5160-4649-b4c9-66968a0a4843"
        }
        ```
    *   **Response (201 Created)**:
        ```json
        {
          "id": "8647fbc5-2a44-4ec0-8296-b2775f277bd4",
          "cpfCliente": "52998224725",
          "idVeiculoCatalogo": "d1947aff-5160-4649-b4c9-66968a0a4843",
          "precoVenda": 135000,
          "statusPagamento": "AGUARDANDO",
          "codigoPagamento": "374f315b-528a-4434-9c37-2dbfe27c89b6",
          "dataVenda": "2026-05-21T02:00:57.530Z"
        }
        ```

### 2. Webhook de Pagamento (SAGA Step 2)
*   **Endpoint**: `POST /webhook/pagamento`
    *   **Request Body**:
        ```json
        {
          "codigoPagamento": "374f315b-528a-4434-9c37-2dbfe27c89b6",
          "status": "EFETUADO"
        }
        ```
    *   **Response (200 OK)**:
        ```json
        {
          "message": "Webhook processado com sucesso"
        }
        ```

### 3. Listar Veículos Vendidos (Relatório de Vendas)
*   **Endpoint**: `GET /vendas/veiculos`
    *   **Description**: Retorna todos os veículos cuja venda foi confirmada (`PAGO`), ordenados pelo preço de forma crescente.
    *   **Response (200 OK)**:
        ```json
        [
          {
            "id": "8647fbc5-2a44-4ec0-8296-b2775f277bd4",
            "cpfCliente": "52998224725",
            "idVeiculoCatalogo": "d1947aff-5160-4649-b4c9-66968a0a4843",
            "dataVenda": "2026-05-21T02:00:57.530Z",
            "precoVenda": 135000,
            "statusPagamento": "PAGO",
            "codigoPagamento": "374f315b-528a-4434-9c37-2dbfe27c89b6"
          }
        ]
        ```

---

## 🧪 Relatório da Suite de Testes Automatizados (Jest)

Toda a lógica comercial deste serviço possui cobertura de testes unitários rígida. O projeto contém **85 testes** cobrindo todas as entidades de domínio, casos de uso, repositórios e controladores.

```bash
# 1. Instalar dependências
npm install

# 2. Gerar Prisma Client local
npx prisma generate

# 3. Rodar a cobertura completa
npm run test:cov
```

### Métricas Finais do Jest Coverage
*   **Testes Executados**: 85 / 85 aprovados com sucesso
*   **Cobertura de Statements**: **100%**
*   **Cobertura de Branches**: **87.30%**
*   **Cobertura de Functions**: **100%**
*   **Cobertura de Lines**: **100%**

---

## 🚀 Guia de Execução Local em Desenvolvimento

> [!TIP]
> Para testar todo o ecossistema integrado (incluindo o Serviço Principal, o API Gateway Kong e os bancos de dados), siga as instruções no **README raiz**.

### Rodar este Serviço Isoladamente
Se você deseja executar localmente em sua máquina apenas este serviço (necessita de um banco PostgreSQL dedicado):

```bash
# 1. Copiar as variáveis de ambiente de exemplo
cp .env.example .env

# 2. Configurar o banco de dados e URL do catálogo no .env
# Exemplo:
# DATABASE_URL=postgresql://vendcar:vendcar123@localhost:5433/db_vendas
# CATALOGO_API_URL=http://localhost:3000

# 3. Instalar as dependências
npm install

# 4. Sincronizar o schema com o banco
npx prisma db push

# 5. Iniciar o servidor de desenvolvimento
npm run start:dev
```
A API Swagger local deste serviço estará pronta em: [http://localhost:3001/api](http://localhost:3001/api).
