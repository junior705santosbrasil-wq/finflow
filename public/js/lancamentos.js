const Lancamentos = {
  _search: '',
  _tipo: 'todos',
  _categoria: 'todos',
  _periodo: 'todos',
  _dataInicio: null,
  _dataFim: null,
  _sortKey: 'data',
  _sortDir: 'desc',
  _deleteId: null,
  _editId: null,
  _currentTipo: 'receita',

  // ---------- Filtros ----------
  filtrar(lancamentos) {
    let list = [...lancamentos];
    const s = this._search.trim().toLowerCase();
    if (s) {
      list = list.filter((l) =>
        (l.descricao || '').toLowerCase().includes(s) ||
        (l.categoria || '').toLowerCase().includes(s) ||
        (l.observacao || '').toLowerCase().includes(s) ||
        (l.pagamento || '').toLowerCase().includes(s)
      );
    }
    if (this._tipo !== 'todos') list = list.filter((l) => l.tipo === this._tipo);
    if (this._categoria !== 'todos') list = list.filter((l) => (l.categoria || 'Outros') === this._categoria);

    const hoje = new Date();
    if (this._periodo === 'hoje') {
      const hi = hojeISO();
      list = list.filter((l) => l.data === hi);
    } else if (this._periodo === 'semana') {
      const dow = (hoje.getDay() + 6) % 7;
      const inicio = new Date(hoje); inicio.setDate(hoje.getDate() - dow);
      const fim = new Date(hoje); fim.setDate(hoje.getDate() + (6 - dow));
      const sISO = toISO(inicio), fISO = toISO(fim);
      list = list.filter((l) => l.data >= sISO && l.data <= fISO);
    } else if (this._periodo === 'mes') {
      const mk = thisMonthKey();
      list = list.filter((l) => monthKeyOf(l.data) === mk);
    } else if (this._periodo === 'mesAnterior') {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      list = list.filter((l) => monthKeyOf(l.data) === mk);
    } else if (this._periodo === 'ano') {
      const y = String(hoje.getFullYear());
      list = list.filter((l) => (l.data || '').startsWith(y));
    } else if (this._periodo === 'custom' && this._dataInicio && this._dataFim) {
      list = list.filter((l) => l.data >= this._dataInicio && l.data <= this._dataFim);
    }

    list.sort((a, b) => {
      let av = a[this._sortKey], bv = b[this._sortKey];
      if (this._sortKey === 'valor') { av = Number(av); bv = Number(bv); }
      if (this._sortKey === 'tipo') { av = av === 'receita' ? 1 : 0; bv = bv === 'receita' ? 1 : 0; }
      if (this._sortKey === 'data') { av = a.data; bv = b.data; }
      av = av == null ? '' : av; bv = bv == null ? '' : bv;
      if (av < bv) return this._sortDir === 'asc' ? -1 : 1;
      if (av > bv) return this._sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  },

  render() {
    const el = document.getElementById('page-lancamentos');
    const lancamentos = Storage.getLancamentos();
    const categorias = categoriasPorTipo();
    const todosCatNomes = [...new Set(categorias.map((c) => c.nome))].sort();

    el.innerHTML = `
      <div class="card">
        <div class="table-toolbar">
          <div class="table-search">
            <span>🔍</span>
            <input type="text" id="lancBusca" placeholder="Pesquisar por descrição, categoria, observação..." value="${escapeHtml(this._search)}" />
          </div>
          <select id="lancFiltroTipo">
            <option value="todos" ${this._tipo === 'todos' ? 'selected' : ''}>Todos os tipos</option>
            <option value="receita" ${this._tipo === 'receita' ? 'selected' : ''}>Receitas</option>
            <option value="despesa" ${this._tipo === 'despesa' ? 'selected' : ''}>Despesas</option>
          </select>
          <select id="lancFiltroCategoria">
            <option value="todos">Todas as categorias</option>
            ${todosCatNomes.map((n) => `<option value="${escapeHtml(n)}" ${this._categoria === n ? 'selected' : ''}>${escapeHtml(n)}</option>`).join('')}
          </select>
          <select id="lancFiltroPeriodo">
            <option value="todos" ${this._periodo === 'todos' ? 'selected' : ''}>Todos os períodos</option>
            <option value="hoje" ${this._periodo === 'hoje' ? 'selected' : ''}>Hoje</option>
            <option value="semana" ${this._periodo === 'semana' ? 'selected' : ''}>Esta semana</option>
            <option value="mes" ${this._periodo === 'mes' ? 'selected' : ''}>Este mês</option>
            <option value="mesAnterior" ${this._periodo === 'mesAnterior' ? 'selected' : ''}>Mês anterior</option>
            <option value="ano" ${this._periodo === 'ano' ? 'selected' : ''}>Este ano</option>
            <option value="custom" ${this._periodo === 'custom' ? 'selected' : ''}>Período personalizado</option>
          </select>
        </div>
        <div id="lancCustomRange" class="${this._periodo === 'custom' ? '' : 'hidden'}" style="display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap;align-items:center;">
          <input type="date" id="lancDataInicio" value="${this._dataInicio || ''}" />
          <span>até</span>
          <input type="date" id="lancDataFim" value="${this._dataFim || ''}" />
        </div>
        ${lancamentos.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">📋</div>
            <div class="empty-title">Você ainda não possui lançamentos.</div>
            <div class="empty-text">Registre manualmente suas receitas e despesas para começar a acompanhar suas finanças.</div>
            <button class="btn btn-primary" id="btnLancEmpty">+ Adicionar meu primeiro lançamento</button>
          </div>
        ` : this._renderTable(this.filtrar(lancamentos))}
      </div>
    `;

    this._bindEvents(el, lancamentos);
  },

  _renderTable(filtered) {
    if (filtered.length === 0) {
      return `
        <div class="table-empty">Nenhum lançamento encontrado com os filtros atuais.</div>`;
    }
    const totalReceitas = filtered.filter((l) => l.tipo === 'receita').reduce((s, l) => s + Number(l.valor), 0);
    const totalDespesas = filtered.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + Number(l.valor), 0);

    const arrow = (k) => this._sortKey === k ? (this._sortDir === 'asc' ? ' ▲' : ' ▼') : '';
    const th = (label, k) => `<th class="sortable" data-sort="${k}">${label}${arrow(k)}</th>`;

    const rows = filtered.map((l) => `
      <tr>
        <td>${fmtDate(l.data)}</td>
        <td><strong>${escapeHtml(l.descricao)}</strong>${l.pagamento ? `<div class="stat-sub" style="margin-top:2px">${escapeHtml(l.pagamento)}</div>` : ''}</td>
        <td><span class="badge badge-${l.tipo}">${l.tipo === 'receita' ? '⬆ Receita' : '⬇ Despesa'}</span></td>
        <td><span class="tag">${escapeHtml(l.categoria || 'Outros')}</span></td>
        <td class="${l.tipo === 'receita' ? 'pos' : 'neg'}" style="font-weight:700;white-space:nowrap">${l.tipo === 'receita' ? '+' : '−'}${fmtMoney(l.valor)}</td>
        <td style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${escapeHtml(l.observacao || '')}">${escapeHtml(l.observacao || '—')}</td>
        <td>
          <div class="row-actions">
            <button class="icon-btn edit" data-edit="${l.id}" title="Editar">✏️</button>
            <button class="icon-btn del" data-del="${l.id}" title="Excluir">🗑️</button>
          </div>
        </td>
      </tr>`).join('');

    return `
      <div class="stat-sub" style="display:flex;gap:20px;margin-bottom:12px;flex-wrap:wrap;">
        <span>Receitas: <strong class="pos">${fmtMoney(totalReceitas)}</strong></span>
        <span>Despesas: <strong class="neg">${fmtMoney(totalDespesas)}</strong></span>
        <span>Resultado: <strong class="${totalReceitas - totalDespesas >= 0 ? 'pos' : 'neg'}">${fmtMoney(totalReceitas - totalDespesas)}</strong></span>
        <span style="margin-left:auto">${filtered.length} lançamento(s)</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>${th('Data', 'data')}${th('Descrição', 'descricao')}${th('Tipo', 'tipo')}${th('Categoria', 'categoria')}${th('Valor', 'valor')}<th>Observação</th><th></th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  },

  _bindEvents(el, lancamentos) {
    const busca = document.getElementById('lancBusca');
    if (busca) busca.addEventListener('input', (e) => { this._search = e.target.value; this.render(); });

    const fTipo = document.getElementById('lancFiltroTipo');
    if (fTipo) fTipo.addEventListener('change', (e) => { this._tipo = e.target.value; this.render(); });
    const fCat = document.getElementById('lancFiltroCategoria');
    if (fCat) fCat.addEventListener('change', (e) => { this._categoria = e.target.value; this.render(); });
    const fPer = document.getElementById('lancFiltroPeriodo');
    if (fPer) fPer.addEventListener('change', (e) => {
      this._periodo = e.target.value;
      if (this._periodo !== 'custom') {
        this._dataInicio = null; this._dataFim = null;
      }
      this.render();
    });

    const dIni = document.getElementById('lancDataInicio');
    const dFim = document.getElementById('lancDataFim');
    if (dIni) dIni.addEventListener('change', (e) => { this._dataInicio = e.target.value; this.render(); });
    if (dFim) dFim.addEventListener('change', (e) => { this._dataFim = e.target.value; this.render(); });

    el.querySelectorAll('th[data-sort]').forEach((thEl) => {
      thEl.addEventListener('click', () => {
        const k = thEl.dataset.sort;
        if (this._sortKey === k) this._sortDir = this._sortDir === 'asc' ? 'desc' : 'asc';
        else { this._sortKey = k; this._sortDir = 'asc'; }
        this.render();
      });
    });

    el.querySelectorAll('[data-edit]').forEach((b) => {
      b.addEventListener('click', () => {
        const l = lancamentos.find((x) => x.id === b.dataset.edit);
        if (l) this.openModal(l);
      });
    });
    el.querySelectorAll('[data-del]').forEach((b) => {
      b.addEventListener('click', () => this.confirmDelete(b.dataset.del));
    });

    const emptyBtn = document.getElementById('btnLancEmpty');
    if (emptyBtn) emptyBtn.addEventListener('click', () => this.openModal());
  },

  // ---------- Modal ----------
  openModal(lancamento) {
    this._editId = lancamento ? lancamento.id : null;
    document.getElementById('modalLancamentoTitle').textContent = lancamento ? 'Editar lançamento' : 'Novo lançamento';
    document.getElementById('lancPersistenceId').value = lancamento ? lancamento.id : '';

    const tipo = lancamento ? lancamento.tipo : 'receita';
    this._currentTipo = tipo;
    this._setTypeButtons(tipo);
    this._populateCategorias(tipo, lancamento ? lancamento.categoria : null);

    document.getElementById('lancDescricao').value = lancamento ? lancamento.descricao : '';
    document.getElementById('lancValor').value = lancamento ? lancamento.valor : '';
    document.getElementById('lancData').value = lancamento ? lancamento.data : hojeISO();
    document.getElementById('lancPagamento').value = lancamento ? (lancamento.pagamento || '') : '';
    document.getElementById('lancObservacao').value = lancamento ? (lancamento.observacao || '') : '';

    document.getElementById('formLancamento').dataset.mode = lancamento ? 'edit' : 'new';
    openModal('modalLancamento');
    document.getElementById('lancDescricao').focus();
  },

  _setTypeButtons(tipo) {
    document.querySelectorAll('#formLancamento .type-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.type === tipo);
    });
    this._currentTipo = tipo;
    this._populateCategorias(tipo, null);
  },

  _populateCategorias(tipo, selected) {
    const cats = categoriasDe(tipo);
    const sel = document.getElementById('lancCategoria');
    sel.innerHTML = cats.map((c) => `<option value="${escapeHtml(c)}" ${c === selected ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('');
    if (!selected || !cats.includes(selected)) sel.value = cats[0];
  },

  // ---------- Salvar ----------
  async salvar() {
    const id = document.getElementById('lancPersistenceId').value;
    const descricao = document.getElementById('lancDescricao').value.trim();
    const valor = Number(document.getElementById('lancValor').value);
    const data = document.getElementById('lancData').value;
    const categoria = document.getElementById('lancCategoria').value;
    const pagamento = document.getElementById('lancPagamento').value;
    const observacao = document.getElementById('lancObservacao').value.trim();

    if (!descricao || !valor || !data) {
      toast('Preencha os campos obrigatórios.', 'error');
      return;
    }

    const lancamentos = Storage.getLancamentos();
    const novo = {
      id: id || uid(),
      descricao,
      valor,
      data,
      categoria: categoria || (this._currentTipo === 'receita' ? 'Outros' : 'Outros'),
      pagamento,
      observacao,
      tipo: this._currentTipo,
    };

    try {
      if (id) {
        await Storage.atualizarLancamento(novo);
        const i = lancamentos.findIndex((l) => l.id === id);
        if (i > -1) lancamentos[i] = novo;
        toast('Lançamento atualizado!');
      } else {
        await Storage.criarLancamento(novo);
        lancamentos.push(novo);
        toast('Lançamento registrado!');
      }
      this._editId = null;
      closeModal('modalLancamento');
      App.refresh();
    } catch (e) {
      toast(e.message || 'Erro ao salvar.', 'error');
    }
  },

  // ---------- Excluir ----------
  confirmDelete(id) {
    this._deleteId = id;
    openModal('modalConfirm');
  },
};

const CategoriaModal = {
  _tipo: 'receita',

  open() {
    this._tipo = Lancamentos._currentTipo || 'receita';
    const form = document.getElementById('formCategoria');
    form.querySelectorAll('.type-btn').forEach((b) => b.classList.toggle('active', b.dataset.type === this._tipo));
    document.getElementById('catNome').value = '';
    openModal('modalCategoria');
    document.getElementById('catNome').focus();
  },

  async salvar() {
    const nome = document.getElementById('catNome').value.trim();
    if (!nome) { toast('Informe o nome da categoria.', 'error'); return; }
    const cats = categoriasPorTipo();
    if (cats.some((c) => c.tipo === this._tipo && c.nome.toLowerCase() === nome.toLowerCase())) {
      toast('Esta categoria já existe.', 'warn');
      return;
    }
    const cat = { nome, tipo: this._tipo };
    try {
      await Storage.adicionarCategoria(cat);
      const list = Storage.getCategorias();
      list.push(cat);
      Storage.setCategorias(list);
      toast('Categoria criada!');
      closeModal('modalCategoria');
      Lancamentos._populateCategorias(this._tipo, nome);
    } catch (e) {
      toast(e.message || 'Erro ao criar categoria.', 'error');
    }
  },
};

// Registo de handlers do modal (uma vez)
document.addEventListener('DOMContentLoaded', () => {
  const typeBtns = document.querySelectorAll('#formLancamento .type-btn, #formCategoria .type-btn');
  typeBtns.forEach((b) => {
    b.addEventListener('click', () => {
      const scope = b.closest('form');
      scope.querySelectorAll('.type-btn').forEach((x) => x.classList.toggle('active', x.dataset.type === b.dataset.type));
      if (scope.id === 'formLancamento') {
        Lancamentos._currentTipo = b.dataset.type;
        Lancamentos._populateCategorias(b.dataset.type);
      } else {
        CategoriaModal._tipo = b.dataset.type;
      }
    });
  });

  document.getElementById('formLancamento').addEventListener('submit', (e) => {
    e.preventDefault();
    Lancamentos.salvar();
  });

  document.getElementById('formCategoria').addEventListener('submit', (e) => {
    e.preventDefault();
    CategoriaModal.salvar();
  });

  document.getElementById('btnNovaCategoria').addEventListener('click', () => CategoriaModal.open());

  document.getElementById('btnConfirmDelete').addEventListener('click', async () => {
    const id = Lancamentos._deleteId;
    const lancamentos = Storage.getLancamentos();
    try {
      await Storage.excluirLancamento(id);
      const filtrados = lancamentos.filter((l) => l.id !== id);
      Storage.setLancamentos(filtrados);
      toast('Lançamento excluído.');
    } catch (e) {
      toast(e.message || 'Erro ao excluir.', 'error');
    }
    Lancamentos._deleteId = null;
    closeModal('modalConfirm');
    App.refresh();
  });
});

// Handlers globais de salvar/delete não escopados ao DOMContentLoaded para evitar duplicação
window.__initLancamentoForm = () => {};
