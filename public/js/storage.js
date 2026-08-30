// Esta camada substitui o localStorage por uma API com backend.
// Mantém um cache em memória sincronizado com o servidor.
// O restante do app continua usando a mesma interface (get/set).

const Storage = {
  KEYS: {
    theme: 'finflow_theme',
    token: 'finflow_token',
  },

  // ----- estado em memória -----
  _lancamentos: [],
  _categorias: [],
  _orcamentos: {},  // chave `mes::categoria` -> limite
  _metas: [],

  get _token() {
    return localStorage.getItem(this.KEYS.token) || '';
  },
  set _token(v) {
    if (v) localStorage.setItem(this.KEYS.token, v);
    else localStorage.removeItem(this.KEYS.token);
  },

  // ----- API base -----
  async _request(method, url, body) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this._token;
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const resp = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try { data = await resp.json(); } catch (e) { data = null; }
    if (!resp.ok) {
      const err = new Error((data && data.error) || 'Erro na requisição.');
      err.status = resp.status;
      throw err;
    }
    return data;
  },

  // ----- Auth -----
  async login(email, senha) {
    const data = await this._request('POST', '/api/login', { email, senha });
    this._token = data.token;
    return data.user;
  },
  async registrar(nome, email, senha) {
    const data = await this._request('POST', '/api/registrar', { nome, email, senha });
    this._token = data.token;
    return data.user;
  },
  logout() {
    this._token = '';
    this._reset();
  },
  get usuarioAutenticado() {
    return !!this._token;
  },

  // ----- Carregar dados do usuário -----
  async carregarDados() {
    const d = await this._request('GET', '/api/dados');
    this._lancamentos = d.lancamentos || [];
    this._categorias = d.categorias || [];
    this._orcamentos = d.orcamentos || {};
    this._metas = d.metas || [];
  },

  _reset() {
    this._lancamentos = [];
    this._categorias = [];
    this._orcamentos = {};
    this._metas = [];
  },

  // ----- Lançamentos -----
  getLancamentos() { return this._lancamentos; },
  setLancamentos(list) { this._lancamentos = list; },

  async criarLancamento(l) {
    await this._request('POST', '/api/lancamentos', l);
  },
  async atualizarLancamento(l) {
    await this._request('PUT', '/api/lancamentos/' + l.id, l);
  },
  async excluirLancamento(id) {
    await this._request('DELETE', '/api/lancamentos/' + id);
  },

  // ----- Categorias -----
  getCategorias() { return this._categorias; },
  setCategorias(list) { this._categorias = list; },
  async adicionarCategoria(cat) {
    await this._request('POST', '/api/categorias', cat);
  },

  // ----- Orçamentos -----
  getOrcamentos() { return this._orcamentos; },
  setOrcamentos(obj) { this._orcamentos = obj; },
  async salvarOrcamento(categoria, mes, limite) {
    await this._request('PUT', '/api/orcamentos/' + encodeURIComponent(categoria), { mes, limite });
  },

  // ----- Metas -----
  getMetas() { return this._metas; },
  setMetas(list) { this._metas = list; },
  async criarMeta(m) { await this._request('POST', '/api/metas', m); },
  async atualizarMeta(m) { await this._request('PUT', '/api/metas/' + m.id, m); },
  async addValorMeta(id, valor) { await this._request('PATCH', '/api/metas/' + id + '/acumulado', { valor }); },
  async excluirMeta(id) { await this._request('DELETE', '/api/metas/' + id); },
};

const DEFAULT_CATEGORIAS = {
  receita: ['Salário', 'Freelance', 'Venda', 'Comissão', 'Outros'],
  despesa: ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Compras', 'Assinaturas', 'Contas', 'Outros'],
};

function categoriasPorTipo() {
  let cats = Storage.getCategorias();
  // Se o usuário ainda não tem categorias cadastradas, oferece as padrão
  // (apenas como sugestão na UI; serão persistidas ao adicionar)
  if (!cats || cats.length === 0) {
    const defaults = [];
    DEFAULT_CATEGORIAS.receita.forEach((c) => defaults.push({ nome: c, tipo: 'receita' }));
    DEFAULT_CATEGORIAS.despesa.forEach((c) => defaults.push({ nome: c, tipo: 'despesa' }));
    return defaults;
  }
  return cats;
}

function categoriasDe(tipo) {
  return categoriasPorTipo().filter((c) => c.tipo === tipo).map((c) => c.nome);
}
