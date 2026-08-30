# FinFlow · Controle Financeiro Pessoal Manual com Login

Aplicativo de controle financeiro **100% manual**, **focado em privacidade**, sem qualquer conexão com bancos, cartões, Open Finance ou serviços financeiros externos — agora com **login e múltiplas contas** via backend.

## Tecnologias

- **Backend:** Node.js + Express + **PostgreSQL** (`pg`)
- **Autenticação:** JWT (tokens), senhas com hash (bcryptjs)
- **Banco:** PostgreSQL gerenciado (ex.: Neon, Supabase, Render Postgres)
- **Frontend:** HTML/CSS/JS estático servido pelo próprio Express + Chart.js (CDN)
- **Sem integração bancária** de qualquer tipo.

## Como rodar localmente

Pré-requisito: **Node.js 18+** e um **PostgreSQL** acessível.

1. Crie um arquivo `.env` na pasta (copie de `.env.example`):
   ```
   DATABASE_URL=postgres://usuario:senha@host:5432/banco
   JWT_SECRET=qualquer_senha_longa
   ```
2. Instale e rode:
   ```bash
   npm install
   npm start
   ```
3. Abra `http://localhost:3000`. As tabelas são criadas automaticamente ao iniciar.

> ⚠️ Em produção, defina um `JWT_SECRET` forte. Sem ele, o app usa um segredo de desenvolvimento.

> 💡 Para testar grátis e rápido, crie um Postgres no **Neon** e use a URL de conexão.

## Deploy

Este projeto está pronto para plataformas que suportam Node.js. Veja o passo a passo completo no arquivo **`GUIA_DEPLOY.md`** (Render + Neon, tudo grátis).

Passos resumidos:
1. Suba o código para um repositório no **GitHub**.
2. Crie um Postgres grátis no **Neon** e copie a `DATABASE_URL`.
3. No **Render**, crie um Web Service a partir do repositório:
   - Build: `npm install`
   - Start: `npm start`
   - Env vars: `DATABASE_URL` e `JWT_SECRET`

Com Postgres (Neon etc.), **os dados permanecem** mesmo no plano grátis do Render (que usa disco efêmero e não é adequado para SQLite).

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
├── db.js            # Conexão com PostgreSQL (pg)
├── package.json
├── .env.example
├── GUIA_DEPLOY.md    # Passo a passo de deploy (Render + Neon)
└── public/          # Frontend estático
    ├── index.html
    ├── css/style.css
    └── js/...
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
