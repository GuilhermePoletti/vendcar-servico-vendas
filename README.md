# VendCar — Serviço de Vendas

> **Projeto acadêmico FIAP** — Orquestrador SAGA de vendas de veículos com consistência transacional entre microsserviços, implementado com **Arquitetura Hexagonal** e **TDD-First**.

[![CI](https://github.com/GuilhermePoletti/vendcar-servico-vendas/actions/workflows/pr-check.yml/badge.svg)](https://github.com/GuilhermePoletti/vendcar-servico-vendas/actions)

---

## 📋 Sobre o Projeto

O **VendCar** é uma plataforma de revenda de veículos composta por **2 microsserviços** independentes que se comunicam exclusivamente via **HTTP síncrono** (sem brokers de mensageria):

| Serviço | Responsabilidade | Repositório |
|---------|-----------------|-------------|
| **Serviço Principal** | Catálogo de veículos, clientes, marcas e autenticação JWT | [vendcar-servico-principal](https://github.com/GuilhermePoletti/vendcar-servico-principal) |
| **Serviço de Vendas** (este) | Orquestração SAGA de vendas, webhook de pagamento, worker de eventos | [vendcar-servico-vendas](https://github.com/GuilhermePoletti/vendcar-servico-vendas) |

### Funcionalidades deste Serviço
- **Iniciar Venda**: Valida cliente + veículo → reserva → gera código de pagamento
- **Webhook de Pagamento**: Recebe notificação do gateway → atualiza status atomicamente com evento na fila
- **Worker SAGA**: Cron a cada 10s processa eventos pendentes → confirma ou cancela reserva no Serviço Principal
- **Listagem**: Veículos vendidos (PAGO) com preço crescente

---

## 🏗️ Arquitetura Hexagonal (Ports & Adapters)

```
┌─────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE                     │
│  Controllers · Prisma Repos · HTTP Adapter · Worker │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │               APPLICATION                    │    │
│  │     Use Cases · Ports (In/Out interfaces)    │    │
│  │                                              │    │
│  │  ┌───────────────────────────────────────┐  │    │
│  │  │              DOMAIN                    │  │    │
│  │  │   Entities · Enums · Exceptions        │  │    │
│  │  │   (TypeScript puro, sem dependências)  │  │    │
│  │  └───────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

**Princípio chave**: O `CatalogoApiPort` abstrai toda a comunicação HTTP com o Serviço Principal. Se amanhã migrássemos para gRPC, só o adapter muda.

### Fluxo SAGA Orquestrado

```
[Cliente] → POST /vendas → [Serviço Vendas] → GET /clientes/cpf → [Serviço Principal]
                                             → PATCH /veiculos/:id/reservar
                                             → INSERT Venda (AGUARDANDO)
                                             → RETORNA {id_venda, codigo_pagamento}

[Gateway] → POST /webhook/pagamento → [Serviço Vendas]
                                     → BEGIN TRANSACTION
                                       UPDATE Venda.status (PAGO ou CANCELADO)
                                       INSERT FilaEventos (PENDENTE)
                                     → COMMIT

[Worker]  → CRON 10s → SELECT FilaEventos PENDENTE
                      → PATCH /veiculos/:id/vender (ou /disponibilizar)
                      → UPDATE FilaEventos.status = PROCESSADO
```

### Estrutura de Pastas

```
src/
├── domain/                    # 🟢 Entidades, Enums, Exceções (TypeScript puro)
│   ├── entities/              # Venda, FilaEventos
│   ├── enums/                 # StatusPagamento, StatusEvento, TipoEvento
│   └── exceptions/            # DomainException
├── application/               # 🟡 Use Cases + Ports (interfaces)
│   ├── ports/out/             # VendaRepositoryPort, FilaEventosRepositoryPort, CatalogoApiPort
│   └── use-cases/             # IniciarVenda, ProcessarWebhook, ListarVendidos, ProcessarFila
└── infrastructure/            # 🔴 Adapters concretos
    ├── adapters/in/           # Controllers REST (VendaController, WebhookController)
    ├── adapters/out/          # PrismaVendaRepo, PrismaFilaEventosRepo, HttpCatalogoApiAdapter
    ├── workers/               # EventQueueWorker (@Cron)
    ├── modules/               # NestJS DI Modules
    └── prisma/                # PrismaService
```

---

## 🛠️ Tecnologias

| Componente | Tecnologia |
|------------|------------|
| Runtime | Node.js 20 LTS |
| Framework | NestJS 11 |
| Linguagem | TypeScript 5 (strict) |
| ORM | Prisma 5 |
| Banco de Dados | PostgreSQL 16 |
| HTTP Client | Axios (comunicação inter-serviço) |
| Scheduler | @nestjs/schedule (Cron Worker) |
| Testes | Jest + ts-jest |
| Documentação API | Swagger (OpenAPI 3.0) |
| Container | Docker (multi-stage build) |
| Orquestração | Kubernetes (Minikube) |
| API Gateway | Kong 3.6 (plugin JWT) |
| CI/CD | GitHub Actions → ArgoCD |

---

## 📦 Pré-requisitos

- **Node.js** 20+ e npm
- **Docker** e **Docker Compose**
- **Git**
- **Minikube** + **kubectl** (para deploy Kubernetes)

---

## 🚀 Como Executar Localmente (Sistema Completo)

> **Importante**: Este `docker-compose.yml` sobe o **sistema completo** (ambos os serviços + bancos + Kong). É necessário clonar **ambos** os repositórios no mesmo diretório pai.

### Passo 1: Clonar ambos os repositórios

```bash
mkdir vendcar && cd vendcar
git clone https://github.com/GuilhermePoletti/vendcar-servico-principal.git
git clone https://github.com/GuilhermePoletti/vendcar-servico-vendas.git
```

A estrutura deve ficar:
```
vendcar/
├── vendcar-servico-principal/
└── vendcar-servico-vendas/
```

### Passo 2: Subir o sistema

```bash
cd vendcar-servico-vendas
docker compose up -d --build
```

Isso irá iniciar:
- **db-principal** (PostgreSQL porta 5432)
- **db-vendas** (PostgreSQL porta 5433)
- **servico-principal** (porta 3000)
- **servico-vendas** (porta 3001)
- **Kong API Gateway** (proxy: 8000 / admin: 8001)

### Passo 3: Executar o seed (primeira vez)

```bash
docker exec vendcar-servico-principal sh -c "npx prisma db seed"
```

### Passo 4: Configurar o Kong API Gateway

```bash
# Registrar o Serviço Principal no Kong
curl -s -X POST http://localhost:8001/services \
  -d name=servico-principal \
  -d url=http://servico-principal:3000

# Criar rota para o Serviço Principal
curl -s -X POST http://localhost:8001/services/servico-principal/routes \
  -d "paths[]=/principal" \
  -d "strip_path=true"

# Registrar o Serviço de Vendas no Kong
curl -s -X POST http://localhost:8001/services \
  -d name=servico-vendas \
  -d url=http://servico-vendas:3001

# Criar rota para o Serviço de Vendas
curl -s -X POST http://localhost:8001/services/servico-vendas/routes \
  -d "paths[]=/vendas" \
  -d "strip_path=true"
```

### Passo 5: Verificar

```bash
# Direto nos serviços
curl http://localhost:3000/api   # Swagger Principal
curl http://localhost:3001/api   # Swagger Vendas

# Via Kong Gateway
curl http://localhost:8000/principal/api   # Swagger via Kong
curl http://localhost:8000/vendas/api      # Swagger via Kong
```

### Parar o sistema

```bash
docker compose down          # Para e remove containers
docker compose down -v       # Para e remove containers + dados dos bancos
```

---

## 🧪 Teste Ponta-a-Ponta Completo

Execute este fluxo para testar toda a SAGA de vendas:

```bash
# ── 1. LOGIN ────────────────────────────────────────
# (credenciais do seed: admin@vendcar.com / 123456)
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vendcar.com","senha":"123456"}' | \
  python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

echo "Token JWT: $TOKEN"

# ── 2. CRIAR CLIENTE ────────────────────────────────
curl -s -X POST http://localhost:3000/clientes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"nome":"João Silva","cpf":"52998224725","email":"joao@email.com"}'

# ── 3. LISTAR MARCAS (ver IDs disponíveis) ──────────
curl -s http://localhost:3000/veiculos \
  -H "Authorization: Bearer $TOKEN"

# ── 4. CADASTRAR VEÍCULO ────────────────────────────
# Substitua <ID_MARCA> por um ID real do passo 3
VEICULO=$(curl -s -X POST http://localhost:3000/veiculos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"id_marca":"<ID_MARCA>","modelo":"Corolla","ano":2024,"cor":"Prata","preco":150000}')

echo "Veículo: $VEICULO"

# ── 5. INICIAR VENDA (SAGA Step 1) ──────────────────
VENDA=$(curl -s -X POST http://localhost:3001/vendas \
  -H "Content-Type: application/json" \
  -d '{"cpf_cliente":"52998224725","id_veiculo":"<ID_VEICULO>"}')

echo "Venda: $VENDA"
# Retorna: {id, codigo_pagamento, status_pagamento: "AGUARDANDO"}

# ── 6. SIMULAR PAGAMENTO (SAGA Step 2) ──────────────
curl -s -X POST http://localhost:3001/webhook/pagamento \
  -H "Content-Type: application/json" \
  -d '{"codigo_pagamento":"<CODIGO_PAGAMENTO>","status":"PAGO"}'

# ── 7. AGUARDAR WORKER (10 segundos) ────────────────
echo "Aguardando Worker SAGA processar (10s)..."
sleep 12

# ── 8. VERIFICAR: Veículo agora está VENDIDO ────────
curl -s http://localhost:3000/veiculos \
  -H "Authorization: Bearer $TOKEN"

# ── 9. LISTAR VENDIDOS ──────────────────────────────
curl -s http://localhost:3001/vendas/veiculos
```

---

## 🧪 Testes Unitários

```bash
# Instalar dependências
npm install
npx prisma generate

# Rodar testes
npm test

# Testes com cobertura
npm run test:cov
```

### Resultado Atual de Cobertura

| Métrica | Cobertura |
|---------|-----------|
| Testes | 85 |
| Statements | 100% |
| Branches | 87.30% |
| Functions | 100% |
| Lines | 100% |

---

## 📡 Endpoints da API

### Vendas

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/vendas` | Iniciar venda (SAGA Step 1) |
| `GET` | `/vendas/veiculos` | Listar veículos vendidos (preço ↑) |

### Webhook

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/webhook/pagamento` | Processar pagamento (SAGA Step 2) |

### Worker (interno)

| Componente | Intervalo | Descrição |
|------------|-----------|-----------|
| `EventQueueWorker` | 10 segundos | Processa fila de eventos (SAGA Step 3) |

> **Swagger UI**: http://localhost:3001/api

---

## ☸️ Deploy Kubernetes (Minikube)

### Passo a passo

```bash
# 1. Iniciar Minikube
minikube start --driver=docker

# 2. Configurar Docker para usar o daemon do Minikube
# PowerShell (Windows):
minikube docker-env --shell powershell | Invoke-Expression
# Linux/Mac:
# eval $(minikube docker-env)

# 3. Build das imagens localmente
cd ../vendcar-servico-principal
docker build -t ghcr.io/guilhermepoletti/vendcar-servico-principal:latest .

cd ../vendcar-servico-vendas
docker build -t ghcr.io/guilhermepoletti/vendcar-servico-vendas:latest .

# 4. Aplicar manifests (executar de qualquer um dos repos — namespace é compartilhado)
kubectl apply -f k8s/namespace.yaml

# 5. Deploy dos bancos (de cada repo)
cd ../vendcar-servico-principal
kubectl apply -f k8s/db-principal.yaml

cd ../vendcar-servico-vendas
kubectl apply -f k8s/db-vendas.yaml

# 6. Aguardar bancos ficarem prontos
kubectl -n vendcar wait --for=condition=ready pod -l app=db-principal --timeout=120s
kubectl -n vendcar wait --for=condition=ready pod -l app=db-vendas --timeout=120s

# 7. Deploy dos serviços
cd ../vendcar-servico-principal
kubectl apply -f k8s/servico-principal.yaml

cd ../vendcar-servico-vendas
kubectl apply -f k8s/servico-vendas.yaml

# 8. Verificar pods
kubectl -n vendcar get pods

# 9. Acessar os serviços
kubectl -n vendcar port-forward svc/servico-principal 3000:3000 &
kubectl -n vendcar port-forward svc/servico-vendas 3001:3001 &

# 10. Testar
curl http://localhost:3000/api   # Swagger Principal
curl http://localhost:3001/api   # Swagger Vendas
```

---

## 🔄 CI/CD (GitHub Actions)

| Gatilho | Workflow | Ações |
|---------|----------|-------|
| PR → `main` | `pr-check.yml` | Lint → Test → Coverage ≥ 80% |
| Merge → `main` | `deploy.yml` | Test → Docker build → Push GHCR → Atualiza manifest K8s |

O **ArgoCD** detecta automaticamente a mudança no manifest e aplica o deploy no cluster Kubernetes.

---

## 🔗 Comunicação com o Serviço Principal

Este serviço **nunca acessa o banco do Serviço Principal diretamente**. Toda comunicação é via HTTP:

| Operação SAGA | Endpoint no Serviço Principal |
|---------------|-------------------------------|
| Validar cliente | `GET /clientes/cpf/:cpf` |
| Buscar veículo | `GET /veiculos/:id` |
| Reservar veículo | `PATCH /veiculos/:id/reservar` |
| Confirmar venda | `PATCH /veiculos/:id/vender` |
| Cancelar reserva | `PATCH /veiculos/:id/disponibilizar` |

---

## 📄 Licença

Projeto acadêmico — FIAP Pós-Graduação.
