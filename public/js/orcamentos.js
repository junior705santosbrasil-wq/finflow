const Orcamentos = {
  _mesKey: thisMonthKey(),

  render() {
    const el = document.getElementById('page-orcamentos');
    const categorias = categoriasDe('despesa');
    const orcamentos = Storage.getOrcamentos();
    const lancamentos = Storage.getLancamentos();

    // gastos do mês por categoria
    const gastos = {};
    lancamentos
      .filter((l) => l.tipo === 'despesa' && monthKeyOf(l.data) === this._mesKey)
      .forEach((l) => {
        const k = l.categoria || 'Outros';
        gastos[k] = (gastos[k] || 0) + Number(l.valor);
      });

    el.innerHTML = `
      <div class="card section-gap" style="margin-top:0">
        <div class="card-title">
          <span>Limites mensais por categoria</span>
          <div class="table-toolbar" style="margin-bottom:0">
            <input type="month" id="orcMes" value="${this._mesKey}" style="padding:9px 13px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-card);color:var(--text);font-family:inherit;" />
            <button class="btn btn-ghost btn-sm" id="btnAdicionarLimite">+ Definir orçamento</button>
          </div>
        </div>

        ${categorias.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">🎯</div>
            <div class="empty-title">Nenhuma categoria de despesa.</div>
            <div class="empty-text">Adicione categorias para definir orçamentos.</div>
          </div>` : `
        <div class="budget-list">
          ${categorias.map((cat) => {
            const limite = orcamentos[cat] || 0;
            const gasto = gastos[cat] || 0;
            const pct = limite > 0 ? (gasto / limite) * 100 : 0;
            const restante = limite - gasto;
            const hasLimite = limite > 0;
            let cls = '';
            let msg = '';
            if (hasLimite && pct >= 100) { cls = 'alert'; msg = `⚠️ Limite atingido! Você ultrapassou ${fmtMoney(Math.abs(restante))} nesta categoria.`; }
            else if (hasLimite && pct >= 80) { cls = 'warn'; msg = `⚠️ Aviso: você já usou ${pct.toFixed(0)}% do orçamento. Restam ${fmtMoney(restante)}.`; }
            const fillCls = hasLimite ? (pct >= 100 ? 'alert' : pct >= 80 ? 'warn' : '') : '';

            return `
            <div class="budget-item">
              <div class="budget-head">
                <div class="budget-name">${escapeHtml(cat)}</div>
                ${hasLimite ? `
                  <div class="row-actions">
                    <button class="icon-btn edit" data-editcat="${escapeHtml(cat)}" title="Editar limite">✏️</button>
                    <button class="icon-btn del" data-delcat="${escapeHtml(cat)}" title="Remover limite">🗑️</button>
                  </div>` : `
                  <button class="btn btn-ghost btn-sm" data-setcat="${escapeHtml(cat)}">Definir limite</button>`}
              </div>
              <div class="budget-amounts">
                <div><span class="b-label">Orçamento</span><br><span class="b-val">${hasLimite ? fmtMoney(limite) : '—'}</span></div>
                <div><span class="b-label">Gasto</span><br><span class="b-val neg">${fmtMoney(gasto)}</span></div>
                <div><span class="b-label">Restante</span><br><span class="b-val ${restante >= 0 ? 'pos' : 'neg'}">${hasLimite ? fmtMoney(restante) : '—'}</span></div>
              </div>
              ${hasLimite ? `
                <div class="progress"><div class="progress-fill ${fillCls}" style="width:${Math.min(100, pct)}%"></div></div>
                <div class="meta-pct"><span>${pct.toFixed(1)}% utilizado</span><span>${fmtMoney(gasto)} / ${fmtMoney(limite)}</span></div>
                ${msg ? `<div class="budget-msg ${cls}">${msg}</div>` : ''}
              ` : `<div class="stat-sub" style="margin-top:8px">Sem limite definido para este mês.</div>`}
            </div>`;
          }).join('')}
        </div>`}
      </div>
    `;

    this._bindEvents(el, orcamentos);
  },

  _bindEvents(el, orcamentos) {
    const mes = document.getElementById('orcMes');
    if (mes) mes.addEventListener('change', (e) => { this._mesKey = e.target.value; this.render(); });

    el.querySelectorAll('[data-setcat]').forEach((b) => {
      b.addEventListener('click', () => this.promptLimite(b.dataset.setcat, 0));
    });
    el.querySelectorAll('[data-editcat]').forEach((b) => {
      b.addEventListener('click', () => this.promptLimite(b.dataset.editcat, orcamentos[b.dataset.editcat] || 0));
    });
    el.querySelectorAll('[data-delcat]').forEach((b) => {
      b.addEventListener('click', async () => {
        const orc = Storage.getOrcamentos();
        delete orc[b.dataset.delcat];
        Storage.setOrcamentos(orc);
        try { await Storage.salvarOrcamento(b.dataset.delcat, this._mesKey, 0); toast('Limite removido.'); }
        catch (e) { toast(e.message || 'Erro ao remover limite.', 'error'); }
        this.render();
      });
    });
    const btnAdd = document.getElementById('btnAdicionarLimite');
    if (btnAdd) btnAdd.addEventListener('click', () => {
      const cats = categoriasDe('despesa');
      const semLimite = cats.filter((c) => !(Storage.getOrcamentos()[c] > 0));
      const nome = window.prompt('Digite o nome da categoria para definir o orçamento:', semLimite[0] || cats[0] || '');
      if (nome) this.promptLimite(nome, 0);
    });
  },

  async promptLimite(cat, valor) {
    const v = window.prompt(`Defina o orçamento mensal para "${cat}" (R$):`, valor > 0 ? valor : '');
    if (v === null) return;
    const num = Number(String(v).replace(',', '.'));
    if (!num || num < 0) { toast('Valor inválido.', 'error'); return; }
    const orc = Storage.getOrcamentos();
    orc[cat] = num;
    Storage.setOrcamentos(orc);
    try {
      await Storage.salvarOrcamento(cat, this._mesKey, num);
      toast(num > 0 ? `Orçamento de ${fmtMoney(num)} definido para ${cat}.` : `Orçamento removido de ${cat}.`);
    } catch (e) {
      toast(e.message || 'Erro ao salvar orçamento.', 'error');
    }
    this.render();
  },
};
