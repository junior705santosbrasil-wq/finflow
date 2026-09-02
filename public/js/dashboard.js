const Dashboard = {
  // Estado de período: { mode: 'mes'|'ano', offset }
  _period: { mode: 'mes', offset: 0 },

  agora() {
    const now = new Date();
    let y = now.getFullYear();
    let m = now.getMonth() + 1;
    if (this._period.mode === 'mes') {
      const d = new Date(now.getFullYear(), now.getMonth() + this._period.offset, 1);
      y = d.getFullYear(); m = d.getMonth() + 1;
    } else {
      y = now.getFullYear() + this._period.offset;
    }
    return { y, m };
  },

  _monthKeyFilter() {
    if (this._period.mode === 'ano') return null;
    const { y, m } = this.agora();
    return `${y}-${String(m).padStart(2, '0')}`;
  },

  _yearFilter() {
    if (this._period.mode === 'mes') return null;
    return String(this.agora().y);
  },

  _periodoLabel() {
    const now = new Date();
    if (this._period.mode === 'mes') {
      const d = new Date(now.getFullYear(), now.getMonth() + this._period.offset, 1);
      return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }
    return String(now.getFullYear() + this._period.offset);
  },

  calculos(lancamentos, filtroMonth, filtroYear) {
    let filtrados = [...lancamentos];
    if (filtroMonth) filtrados = filtrados.filter((l) => monthKeyOf(l.data) === filtroMonth);
    if (filtroYear) filtrados = filtrados.filter((l) => (l.data || '').startsWith(filtroYear));

    const totalReceitas = filtrados.filter((l) => l.tipo === 'receita').reduce((s, l) => s + Number(l.valor), 0);
    const totalDespesas = filtrados.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + Number(l.valor), 0);
    const saldo = totalReceitas - totalDespesas;

    const hoje = new Date();
    const diasPassados = Math.max(1, hoje.getDate());
    const mediaDiaria = totalDespesas / diasPassados;

    let maiorGasto = null;
    let gastosPorCategoria = {};
    const despesas = filtrados.filter((l) => l.tipo === 'despesa');
    despesas.forEach((l) => {
      if (Number(l.valor) > (maiorGasto ? maiorGasto.valor : 0)) maiorGasto = l;
      const key = l.categoria || 'Outros';
      gastosPorCategoria[key] = (gastosPorCategoria[key] || 0) + Number(l.valor);
    });

    let entradasPorCategoria = {};
    filtrados.filter((l) => l.tipo === 'receita').forEach((l) => {
      const key = l.categoria || 'Outros';
      entradasPorCategoria[key] = (entradasPorCategoria[key] || 0) + Number(l.valor);
    });

    let topCategoria = null, topValor = 0;
    for (const c in gastosPorCategoria) if (gastosPorCategoria[c] > topValor) { topValor = gastosPorCategoria[c]; topCategoria = c; }

    const pctRendaComprometida = totalReceitas > 0 ? (totalDespesas / totalReceitas) * 100 : 0;
    const pctEconomizada = totalReceitas > 0 ? (Math.max(0, saldo) / totalReceitas) * 100 : 0;

    return {
      totalReceitas, totalDespesas, saldo, mediaDiaria, maiorGasto, topCategoria,
      qtdLancamentos: filtrados.length,
      qtdDespesas: despesas.length,
      pctRendaComprometida, pctEconomizada, diasPassados,
      gastosPorCategoria, entradasPorCategoria,
    };
  },

  render() {
    const el = document.getElementById('page-dashboard');
    const lancamentos = Storage.getLancamentos();

    if (lancamentos.length === 0) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🌱</div>
          <div class="empty-title">Você ainda não possui lançamentos.</div>
          <div class="empty-text">Cadastre sua primeira receita ou despesa para começar a acompanhar suas finanças.</div>
          <button class="btn btn-primary" id="btnPrimeiroLancamento">+ Adicionar meu primeiro lançamento</button>
        </div>`;
      const btn = document.getElementById('btnPrimeiroLancamento');
      if (btn) btn.addEventListener('click', () => Lancamentos.openModal());
      return;
    }

    const monthFilter = this._monthKeyFilter();
    const yearFilter = this._yearFilter();
    const periodoLabel = this._periodoLabel();
    const periodoTitle = this._period.mode === 'mes'
      ? periodoLabel.charAt(0).toUpperCase() + periodoLabel.slice(1)
      : 'Visão anual de ' + periodoLabel;

    let list = [...lancamentos];
    if (monthFilter) list = list.filter((l) => monthKeyOf(l.data) === monthFilter);
    if (yearFilter) list = list.filter((l) => (l.data || '').startsWith(yearFilter));

    const c = this.calculos(lancamentos, monthFilter, yearFilter);

    // Meta mensal demonstrativa
    const META_MES = 5000;
    const pctMeta = c.totalReceitas > 0 ? Math.min(100, (c.totalReceitas / META_MES) * 100) : 0;

    // Lançamentos recentes (mais recentes primeiro)
    const recentes = [...lancamentos]
      .sort((a, b) => (b.data || '').localeCompare(a.data || ''))
      .slice(0, 6);

    el.innerHTML = `
      <section class="dash-banner">
        <span class="dash-banner-icon">💡</span>
        <div>
          <strong>DICA</strong> · Tudo salvo automaticamente! Seus lançamentos são registrados automaticamente.
        </div>
      </section>

      <div class="period-bar">
        <div class="period-nav">
          <button class="period-btn" id="periodPrev" title="Anterior">‹</button>
          <div class="period-title">${escapeHtml(periodoTitle)}</div>
          <button class="period-btn" id="periodNext" title="Próximo">›</button>
        </div>
        <div class="period-toggle">
          <button class="chip ${this._period.mode === 'mes' ? 'active' : ''}" data-mode="mes">Mensal</button>
          <button class="chip ${this._period.mode === 'ano' ? 'active' : ''}" data-mode="ano">Anual</button>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card kpi-card--saldo">
          <div class="kpi-label">Saldo em conta agora</div>
          <div class="kpi-value">${fmtMoney(c.saldo)}</div>
          <div class="kpi-sub">${c.qtdLancamentos} lançamento(s) no período</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label kpi-up">Receitas</div>
          <div class="kpi-value">${fmtMoney(c.totalReceitas)}</div>
          <div class="kpi-sub">Valor recebido no período</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label kpi-down">Despesas</div>
          <div class="kpi-value">${fmtMoney(c.totalDespesas)}</div>
          <div class="kpi-sub">Total de despesas</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Lucro</div>
          <div class="kpi-value ${c.saldo >= 0 ? 'pos' : 'neg'}">${fmtMoney(Math.max(0, c.saldo))}</div>
          <div class="kpi-sub ${c.saldo >= 0 ? '' : 'neg'}">${c.saldo >= 0 ? 'Resultado positivo' : 'Resultado negativo'}</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Meta do mês</div>
          <div class="kpi-value">${fmtMoney(META_MES)}</div>
          <div class="kpi-progress"><div class="kpi-progress-fill" style="width:${pctMeta}%"></div></div>
          <div class="kpi-sub">${pctMeta.toFixed(0)}% da meta</div>
        </div>
      </div>

      <div class="dash-grid dash-grid--charts">
        <div class="card card-wide">
          <div class="card-title">Receitas × Despesas</div>
          <div class="chart-wrap"><canvas id="chartReceitasDespesas"></canvas></div>
        </div>
        <div class="card">
          <div class="card-title">Despesas por categoria</div>
          <div class="chart-wrap"><canvas id="chartCategorias"></canvas></div>
        </div>
        <div class="card card-wide">
          <div class="card-title">Comparativo mensal</div>
          <div class="chart-wrap"><canvas id="chartComparacao"></canvas></div>
        </div>
        <div class="card">
          <div class="card-title">Entradas por categoria</div>
          <div class="chart-wrap"><canvas id="chartEntradas"></canvas></div>
        </div>
      </div>

      ${recentes.length ? `
        <div class="card section-gap">
          <div class="card-title">Últimos lançamentos</div>
          <div class="table-wrap">
            <table class="min-table">
              <thead>
                <tr>
                  <th>Descrição</th><th>Categoria</th><th>Data</th><th>Tipo</th><th>Valor</th>
                </tr>
              </thead>
              <tbody>
                ${recentes.map((l) => `
                  <tr>
                    <td><strong>${escapeHtml(l.descricao)}</strong></td>
                    <td><span class="tag">${escapeHtml(l.categoria || 'Outros')}</span></td>
                    <td>${fmtDate(l.data)}</td>
                    <td><span class="badge badge-${l.tipo}">${l.tipo === 'receita' ? 'Receita' : 'Despesa'}</span></td>
                    <td class="${l.tipo === 'receita' ? 'pos' : 'neg'}" style="font-weight:700;white-space:nowrap">${l.tipo === 'receita' ? '+' : '−'}${fmtMoney(l.valor)}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>` : ''}
    `;

    this._bindPeriod(el);

    // Gráficos
    const series12 = monthlyReceitasDespesas(lancamentos, 12);
    const comparativo = monthlyReceitasDespesas(lancamentos, 6);

    this._chartReceitasDespesas(series12);
    this._chartCategorias(c.gastosPorCategoria);
    this._chartComparativo(comparativo);
    this._chartEntradas(c.entradasPorCategoria);
  },

  _bindPeriod(el) {
    const prev = document.getElementById('periodPrev');
    const next = document.getElementById('periodNext');
    if (prev) prev.addEventListener('click', () => { this._period.offset -= 1; this.render(); });
    if (next) next.addEventListener('click', () => { this._period.offset += 1; this.render(); });
    el.querySelectorAll('[data-mode]').forEach((b) => {
      b.addEventListener('click', () => {
        this._period.mode = b.dataset.mode;
        this._period.offset = 0;
        this.render();
      });
    });
  },

  _chartReceitasDespesas(series) {
    destroyChart('recDesp');
    const ctx = document.getElementById('chartReceitasDespesas');
    if (!ctx) return;
    makeChart('recDesp', ctx, {
      type: 'line',
      data: {
        labels: series.map((m) => m.label),
        datasets: [
          { label: 'Receitas', data: series.map((m) => m.receitas), borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.08)', fill: true, tension: 0.35, pointRadius: 3, borderWidth: 2.5 },
          { label: 'Despesas', data: series.map((m) => m.despesas), borderColor: '#dc2626', backgroundColor: 'rgba(220,38,38,0.06)', fill: true, tension: 0.35, pointRadius: 3, borderWidth: 2.5 },
        ],
      },
      options: lineOptions(),
    });
  },

  _chartCategorias(porCat) {
    destroyChart('categorias');
    const ctx = document.getElementById('chartCategorias');
    if (!ctx) return;
    const labels = Object.keys(porCat);
    const values = Object.values(porCat);
    const colors = labels.map((_, i) => CHART_REDS[i % CHART_REDS.length]);
    makeChart('categorias', ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }],
      },
      options: doughnutOptions(),
    });
  },

  _chartComparativo(series) {
    destroyChart('comparacao');
    const ctx = document.getElementById('chartComparacao');
    if (!ctx) return;
    const lucro = series.map((m) => m.receitas - m.despesas);
    makeChart('comparacao', ctx, {
      type: 'bar',
      data: {
        labels: series.map((m) => m.label),
        datasets: [
          { label: 'Receitas', data: series.map((m) => m.receitas), backgroundColor: 'rgba(37,99,235,0.85)', borderRadius: 6 },
          { label: 'Despesas', data: series.map((m) => m.despesas), backgroundColor: 'rgba(220,38,38,0.85)', borderRadius: 6 },
          { label: 'Lucro', data: lucro, backgroundColor: 'rgba(22,163,74,0.85)', borderRadius: 6 },
        ],
      },
      options: { ...baseOptions(), scales: { y: baseY() } },
    });
  },

  _chartEntradas(porCat) {
    destroyChart('entradas');
    const ctx = document.getElementById('chartEntradas');
    if (!ctx) return;
    const labels = Object.keys(porCat);
    const values = Object.values(porCat);
    const colors = labels.map((_, i) => CHART_GREENS[i % CHART_GREENS.length]);
    makeChart('entradas', ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }],
      },
      options: doughnutOptions(),
    });
  },
};

function doughnutOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { color: chartTextColor(), boxWidth: 12, boxHeight: 12, padding: 12 } } },
  };
}

function monthlyReceitasDespesas(lancamentos, n) {
  const now = new Date();
  const result = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const rec = lancamentos.filter((l) => l.tipo === 'receita' && monthKeyOf(l.data) === mk).reduce((s, l) => s + Number(l.valor), 0);
    const desp = lancamentos.filter((l) => l.tipo === 'despesa' && monthKeyOf(l.data) === mk).reduce((s, l) => s + Number(l.valor), 0);
    result.push({ key: mk, label: monthLabel(d), receitas: rec, despesas: desp });
  }
  return result;
}

function monthLabel(d) {
  return d.toLocaleDateString('pt-BR', { month: 'short' });
}

function baseOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: chartTextColor(), boxWidth: 12, boxHeight: 12 } } },
  };
}

function baseY() {
  return {
    ticks: { color: chartTextColor(), callback: (v) => fmtMoneyCompact(v) },
    grid: { color: chartGridColor() },
    border: { color: chartGridColor() },
  };
}

function lineOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: chartTextColor(), boxWidth: 12, boxHeight: 12 } } },
    scales: { y: baseY(), x: { ticks: { color: chartTextColor() }, grid: { color: chartGridColor() } } },
  };
}
