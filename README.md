# FinFlow · Controle Financeiro Pessoal Manual com Login

Aplicativo de controle financeiro **100% manual**, **focado em privacidade**, sem qualquer conexão com bancos, cartões, Open Finance ou serviços financeiros externos — agora com **login e múltiplas contas** via backend.

## Tecnologias

- **Backend:** Node.js + Express + SQLite (usando `node:sqlite`, embutido no Node 18+/22+ — sem compilação nativa)
- **Autenticação:** JWT (tokens), senhas com hash (bcryptjs)
- **Frontend:** HTML/CSS/JS estático servido pelo próprio Express + Chart.js (CDN)
- **Sem integração bancária** de qualquer tipo.

## Como rodar localmente

Pré-requisito: **Node.js 20+** (o `node:sqlite` requer Node 22+; recomendado Node 24).

```bash
npm install
npm start
```

Depois abra `http://localhost:3000`.

O banco SQLite é criado automaticamente na pasta `data/`. Um **`.env`** pode ser criado a partir do `.env.example` para configurar porta e segredo do JWT.

> ⚠️ Em produção, defina um `JWT_SECRET` forte. Sem ele, o app usa um segredo de desenvolvimento.

## Deploy

Este projeto está pronto para plataformas que suportam Node.js, como **Render** e **Railway**.

### Render (Web Service)
1. Crie um novo **Web Service** apontando para o repositório Git.
2. Build Command: `npm install`
3. Start Command: `npm start`
4. Adicione as variáveis de ambiente:
   - `JWT_SECRET` = um valor aleatório e longo
   - (opcional) `DATA_DIR` e, **importante**, use um **persistent disk** no Render para o SQLite, pois o disco do serviço é efêmero (os dados seriam perdidos a cada deploy/restart se você não montar um disco persistente).

### Railway
1. Faça deploy do repositório (start `npm start`).
2. Railway tem volumes; monte o `DATA_DIR` num volume persistente para manter o SQLite entre deploys.

> **Sobre persistência do SQLite:** plataformas com **filesystem efêmero** (ex.: free tier do Render) apagam os arquivos locais a cada reinício. Para dados que sobrevivem entre deploys, monte um **persistent disk / volume** em `DATA_DIR`, ou use um banco gerenciado (ex.: Postgres). O código está estruturado para apontar `DATA_DIR` para onde você montar o disco.

## Privacidade

Este sistema **não** solicita nem acessa:
- Número de cartão de crédito
- Número de conta bancária ou agência
- Senhas bancárias
- Dados de Open Finance
- Qualquer integração bancária

Cada usuário tem sua própria conta (e-mail + senha, com hash) e seus dados são **isolados por usuário** no banco.

## Funcionalidades

- **Login / Cadastro** de múltiplas contas.
- **Dashboard**: saldo, receitas, despesas, resultado do mês, média diária, maior gasto, categoria que mais consome, nº de lançamentos, % renda comprometida/economizada.
- **Gráficos** (Chart.js): receitas × despesas, evolução do saldo, gastos por categoria, evolução mensal e comparação entre meses.
- **Lançamentos**: cadastro, busca, filtros, ordenação, edição e exclusão.
- **Categorias** personalizáveis.
- **Orçamentos** mensais por categoria com alertas a 80% e 100%.
- **Metas** financeiras.
- **Relatórios** com exportação CSV/Excel.
- **Modo escuro** e design responsivo.

## Estrutura

```
financeiro/
├── server.js        # Express: API + autenticação + serve o frontend
├── db.js            # SQLite (node:sqlite)
├── package.json
├── .env.example
├── public/          # Frontend estático
│   ├── index.html
│   ├── css/style.css
│   └── js/...
└── data/            # Banco SQLite (criado em runtime)
```

## API (resumo)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/registrar` | Criar conta |
| POST | `/api/login` | Entrar |
| GET | `/api/me` | Dados do usuário logado |
| GET | `/api/dados` | Tudo do usuário (lançamentos, categorias, orçamentos, metas) |
| GET/POST | `/api/lancamentos` | Listar / criar lançamento |
| PUT/DELETE | `/api/lancamentos/:id` | Atualizar / excluir lançamento |
| GET/POST | `/api/categorias` | Listar / criar categoria |
| GET/PUT | `/api/orcamentos` | Listar / salvar orçamento por categoria |
| GET/POST | `/api/metas` | Listar / criar meta |
| PUT/PATCH/DELETE | `/api/metas/:id` | Atualizar / somar valor / excluir meta |

Todas as rotas de dados exigem o cabeçalho `Authorization: Bearer <token>`.
