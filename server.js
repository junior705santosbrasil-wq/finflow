require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'finflow_dev_secret_change_me';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Criar as tabelas ao iniciar
const SCHEMA = `
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS lancamentos (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor DOUBLE PRECISION NOT NULL,
  data TEXT NOT NULL,
  categoria TEXT NOT NULL,
  tipo TEXT NOT NULL,
  pagamento TEXT,
  observacao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  UNIQUE(user_id, nome, tipo)
);
CREATE TABLE IF NOT EXISTS orcamentos (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  mes TEXT NOT NULL,
  limite DOUBLE PRECISION NOT NULL,
  UNIQUE(user_id, categoria, mes)
);
CREATE TABLE IF NOT EXISTS metas (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  objetivo DOUBLE PRECISION NOT NULL,
  acumulado DOUBLE PRECISION NOT NULL DEFAULT 0,
  prazo TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lanc_user ON lancamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_metas_user ON metas(user_id);
CREATE INDEX IF NOT EXISTS idx_orc_user ON orcamentos(user_id);
`;

async function initSchema() {
  try {
    await pool.query(SCHEMA);
    console.log('Schema do banco garantido.');
  } catch (e) {
    console.error('Erro ao inicializar schema:', e.message);
  }
}

// ---------- Autenticação ----------
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Não autenticado.' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  }
}

// POST /api/registrar
app.post('/api/registrar', async (req, res) => {
  const { nome, email, senha } = req.body || {};
  if (!nome || !email || !senha) return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
  if (String(senha).length < 6) return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
  const emailNorm = String(email).trim().toLowerCase();
  try {
    const exists = await pool.query('SELECT id FROM usuarios WHERE email = $1', [emailNorm]);
    if (exists.rowCount > 0) return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
    const hash = bcrypt.hashSync(String(senha), 10);
    const r = await pool.query('INSERT INTO usuarios (nome, email, senha_hash) VALUES ($1,$2,$3) RETURNING id', [nome, emailNorm, hash]);
    const userId = r.rows[0].id;
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    return res.json({ token, user: { id: userId, nome, email: emailNorm } });
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao cadastrar.' });
  }
});

// POST /api/login
app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body || {};
  if (!email || !senha) return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  const emailNorm = String(email).trim().toLowerCase();
  const r = await pool.query('SELECT * FROM usuarios WHERE email = $1', [emailNorm]);
  const user = r.rows[0];
  if (!user || !bcrypt.compareSync(String(senha), user.senha_hash)) {
    return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  }
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  return res.json({ token, user: { id: user.id, nome: user.nome, email: user.email } });
});

// GET /api/me
app.get('/api/me', authMiddleware, async (req, res) => {
  const r = await pool.query('SELECT id, nome, email FROM usuarios WHERE id = $1', [req.userId]);
  const user = r.rows[0];
  if (!user) return res.status(401).json({ error: 'Usuário não encontrado.' });
  return res.json({ user });
});

// ---------- Dados do usuário ----------
app.get('/api/dados', authMiddleware, async (req, res) => {
  const uid = req.userId;
  const lanc = (await pool.query('SELECT * FROM lancamentos WHERE user_id=$1', [uid])).rows
    .map((l) => ({ id: l.id, descricao: l.descricao, valor: l.valor, data: l.data, categoria: l.categoria, tipo: l.tipo, pagamento: l.pagamento, observacao: l.observacao }));
  const categorias = (await pool.query('SELECT nome, tipo FROM categorias WHERE user_id=$1', [uid])).rows
    .map((c) => ({ nome: c.nome, tipo: c.tipo }));
  const orc = (await pool.query('SELECT * FROM orcamentos WHERE user_id=$1', [uid])).rows
    .reduce((acc, o) => { acc[o.mes + '::' + o.categoria] = o.limite; return acc; }, {});
  const metas = (await pool.query('SELECT * FROM metas WHERE user_id=$1', [uid])).rows
    .map((m) => ({ id: m.id, nome: m.nome, objetivo: m.objetivo, acumulado: m.acumulado, prazo: m.prazo }));
  return res.json({ lancamentos: lanc, categorias, orcamentos: orc, metas });
});

// ---------- Lançamentos ----------
app.get('/api/lancamentos', authMiddleware, async (req, res) => {
  const rows = (await pool.query('SELECT * FROM lancamentos WHERE user_id=$1', [req.userId])).rows;
  res.json(rows.map((l) => ({ id: l.id, descricao: l.descricao, valor: l.valor, data: l.data, categoria: l.categoria, tipo: l.tipo, pagamento: l.pagamento, observacao: l.observacao })));
});

app.post('/api/lancamentos', authMiddleware, async (req, res) => {
  const { descricao, valor, data, categoria, tipo, pagamento, observacao } = req.body || {};
  if (!descricao || !valor || !data || !tipo) return res.status(400).json({ error: 'Dados incompletos.' });
  if (!['receita', 'despesa'].includes(tipo)) return res.status(400).json({ error: 'Tipo inválido.' });
  const id = req.body.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
  await pool.query(
    'INSERT INTO lancamentos (id, user_id, descricao, valor, data, categoria, tipo, pagamento, observacao) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [id, req.userId, descricao, Number(valor), data, categoria, tipo, pagamento || null, observacao || null]
  );
  res.json({ id });
});

app.put('/api/lancamentos/:id', authMiddleware, async (req, res) => {
  const { descricao, valor, data, categoria, tipo, pagamento, observacao } = req.body || {};
  const r = await pool.query(
    'UPDATE lancamentos SET descricao=$1, valor=$2, data=$3, categoria=$4, tipo=$5, pagamento=$6, observacao=$7 WHERE id=$8 AND user_id=$9',
    [descricao, Number(valor), data, categoria, tipo, pagamento || null, observacao || null, req.params.id, req.userId]
  );
  if (r.rowCount === 0) return res.status(404).json({ error: 'Lançamento não encontrado.' });
  res.json({ ok: true });
});

app.delete('/api/lancamentos/:id', authMiddleware, async (req, res) => {
  const r = await pool.query('DELETE FROM lancamentos WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
  if (r.rowCount === 0) return res.status(404).json({ error: 'Lançamento não encontrado.' });
  res.json({ ok: true });
});

// ---------- Categorias ----------
app.get('/api/categorias', authMiddleware, async (req, res) => {
  res.json((await pool.query('SELECT nome, tipo FROM categorias WHERE user_id=$1', [req.userId])).rows);
});

app.post('/api/categorias', authMiddleware, async (req, res) => {
  const { nome, tipo } = req.body || {};
  if (!nome || !tipo) return res.status(400).json({ error: 'Nome e tipo são obrigatórios.' });
  try {
    await pool.query('INSERT INTO categorias (user_id, nome, tipo) VALUES ($1,$2,$3)', [req.userId, nome, tipo]);
    res.json({ ok: true });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Categoria já existe.' });
    res.status(500).json({ error: 'Erro ao criar categoria.' });
  }
});

// ---------- Orçamentos ----------
app.get('/api/orcamentos', authMiddleware, async (req, res) => {
  const rows = (await pool.query('SELECT * FROM orcamentos WHERE user_id=$1', [req.userId])).rows;
  res.json(rows.reduce((acc, o) => { acc[o.mes + '::' + o.categoria] = o.limite; return acc; }, {}));
});

app.put('/api/orcamentos/:categoria', authMiddleware, async (req, res) => {
  const { mes, limite } = req.body || {};
  const isSet = Number(limite) > 0;
  if (isSet) {
    await pool.query(
      'INSERT INTO orcamentos (user_id, categoria, mes, limite) VALUES ($1,$2,$3,$4) ON CONFLICT (user_id, categoria, mes) DO UPDATE SET limite = EXCLUDED.limite',
      [req.userId, req.params.categoria, mes, Number(limite)]
    );
  } else {
    await pool.query('DELETE FROM orcamentos WHERE user_id=$1 AND categoria=$2 AND mes=$3', [req.userId, req.params.categoria, mes]);
  }
  res.json({ ok: true });
});

// ---------- Metas ----------
app.get('/api/metas', authMiddleware, async (req, res) => {
  res.json((await pool.query('SELECT * FROM metas WHERE user_id=$1', [req.userId])).rows.map((m) => ({ id: m.id, nome: m.nome, objetivo: m.objetivo, acumulado: m.acumulado, prazo: m.prazo })));
});

app.post('/api/metas', authMiddleware, async (req, res) => {
  const { id, nome, objetivo, acumulado, prazo } = req.body || {};
  if (!nome || !objetivo) return res.status(400).json({ error: 'Nome e objetivo são obrigatórios.' });
  const mid = id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
  await pool.query('INSERT INTO metas (id, user_id, nome, objetivo, acumulado, prazo) VALUES ($1,$2,$3,$4,$5,$6)',
    [mid, req.userId, nome, Number(objetivo), Number(acumulado) || 0, prazo || null]);
  res.json({ id: mid });
});

app.put('/api/metas/:id', authMiddleware, async (req, res) => {
  const { nome, objetivo, acumulado, prazo } = req.body || {};
  await pool.query('UPDATE metas SET nome=$1, objetivo=$2, acumulado=$3, prazo=$4 WHERE id=$5 AND user_id=$6',
    [nome, Number(objetivo), Number(acumulado) || 0, prazo || null, req.params.id, req.userId]);
  res.json({ ok: true });
});

app.patch('/api/metas/:id/acumulado', authMiddleware, async (req, res) => {
  const { valor } = req.body || {};
  const m = (await pool.query('SELECT * FROM metas WHERE id=$1 AND user_id=$2', [req.params.id, req.userId])).rows[0];
  if (!m) return res.status(404).json({ error: 'Meta não encontrada.' });
  await pool.query('UPDATE metas SET acumulado=$1 WHERE id=$2', [(Number(m.acumulado) || 0) + Number(valor), req.params.id]);
  res.json({ ok: true });
});

app.delete('/api/metas/:id', authMiddleware, async (req, res) => {
  await pool.query('DELETE FROM metas WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
  res.json({ ok: true });
});

// Fallback SPA
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`FinFlow rodando em http://localhost:${PORT}`);
  initSchema();
});
