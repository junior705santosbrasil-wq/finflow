const Dashboard = {
  _periodFilter: 'mes',
  _typeFilter: 'todos',

  calculos(lancamentos, monthKeyFilter) {
    let list = [...lancamentos];
    let filtrados = [...lancamentos];

    if (monthKeyFilter) {
      filtrados = filtrados.filter((l) => monthKeyOf(l.data) === monthKeyFilter);
    }

    const totalReceitas = filtrados.filter((l) => l.tipo === 'receita').reduce((s, l) => s + Number(l.valor), 0);
    const totalDespesas = filtrados.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + Number(l.valor), 0);
    const saldo = totalReceitas - totalDespesas;

    const hoje = new Date();
    const inicioMesISO = toISO(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
    const diasPassados = Math.max(1, hoje.getDate());
    const mediaDiaria = totalDespesas / diasPassados;

    let maiorGasto = null;
    let gastosPorCategoria = {};
    const despesas = filtrados.filter((l) => l.tipo === 'despesa');
    despesas.forEach((l) => {
      if (!maiorGasto || Number(l.valor) > maiorGasto.valor) maiorGasto = l;
      const key = l.categoria || 'Outros';
      gastosPorCategoria[key] = (gastosPorCategoria[key] || 0) + Number(l.valor);
    });

    let topCategoria = null;
    let topValor = 0;
    for (const c in gastosPorCategoria) {
      if (gastosPorCategoria[c] > topValor) {
        topValor = gastosPorCategoria[c];
        topCategoria = c;
      }
    }

    const pctRendaComprometida = totalReceitas > 0 ? (totalDespesas / totalReceitas) * 100 : 0;
    const economizado = Math.max(0, saldo);
    const pctEconomizada = totalReceitas > 0 ? (economizado / totalReceitas) * 100 : 0;

    return {
      totalReceitas,
      totalDespesas,
      saldo,
      mediaDiaria,
      maiorGasto,
      topCategoria,
      qtdLancamentos: filtrados.length,
      qtdDespesas: despesas.length,
      pctRendaComprometida,
      pctEconomizada,
      diasPassados,
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
          <div class="empty-text">Cadastre sua primeira receita ou despesa para começar a acompanhar suas finanças de forma inteligente.</div>
          <button class="btn btn-primary" id="btnPrimeiroLancamento">+ Adicionar meu primeiro lançamento</button>
        </div>`;
      const btn = document.getElementById('btnPrimeiroLancamento');
      if (btn) btn.addEventListener('click', () => Lancamentos.openModal());
      return;
    }

    const monthKey = this._periodFilter === 'todos' ? null : thisMonthKey();
    let list = [...lancamentos];
    if (monthKey) list = list.filter((l) => monthKeyOf(l.data) === monthKey);
    if (this._typeFilter !== 'todos') list = list.filter((l) => l.tipo === this._typeFilter);

    const c = this.calculos(lancamentos, monthKey);

    el.innerHTML = `
      <div class="home-hero">
        <div>
          <div class="home-balance-label">Saldo ${this._periodFilter === 'todos' ? 'total' : 'do mês'}</div>
          <div class="home-balance ${c.saldo >= 0 ? '' : ''}" style="color:#fff">${fmtMoney(c.saldo)}</div>
          <div class="home-balance-sub">${c.qtdLancamentos} lançamento(s) neste período</div>
        </div>
        <div class="chips">
          <button class="chip ${this._periodFilter === 'mes' ? 'active' : ''}" data-df="mes">Este mês</button>
          <button class="chip ${this._periodFilter === 'todos' ? 'active' : ''}" data-df="todos">Todos</button>
          <button class="chip ${this._typeFilter === 'receita' ? 'green active' : ''}" data-dt="receita">⬆ Receitas</button>
          <button class="chip ${this._typeFilter === 'despesa' ? 'red active' : ''}" data-dt="despesa">⬇ Despesas</button>
          <button class="chip ${this._typeFilter === 'todos' ? 'active' : ''}" data-dt="todos">Geral</button>
        </div>
      </div>

      <div class="grid-stats">
        <div class="stat-card">
          <div class="stat-label">📥 Total recebido</div>
          <div class="stat-value pos">${fmtMoney(c.totalReceitas)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">📤 Total gasto</div>
          <div class="stat-value neg">${fmtMoney(c.totalDespesas)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">📆 Resultado do mês</div>
          <div class="stat-value ${c.saldo >= 0 ? 'pos' : 'neg'}">${fmtMoney(c.saldo)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">☀️ Média diária de gastos</div>
          <div class="stat-value info">${fmtMoney(c.mediaDiaria)}</div>
          <div class="stat-sub">${c.diasPassados} dia(s) decorridos</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">🔴 Maior gasto</div>
          <div class="stat-value info">${fmtMoney(c.maiorGasto ? c.maiorGasto.valor : 0)}</div>
          <div class="stat-sub">${c.maiorGasto ? escapeHtml(c.maiorGasto.descricao) : '—'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">🎯 Categoria que mais consome</div>
          <div class="stat-value info">${escapeHtml(c.topCategoria || '—')}</div>
          <div class="stat-sub">${c.topCategoria ? fmtMoney(gastosPorCatTotal(list, c.topCategoria)) : ''}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">📋 Quantidade de lançamentos</div>
          <div class="stat-value">${c.qtdLancamentos}</div>
          <div class="stat-sub">${c.qtdDespesas} despesa(s)</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">🧾 Renda comprometida</div>
          <div class="stat-value warn">${c.pctRendaComprometida.toFixed(1)}%</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">💾 Renda economizada</div>
          <div class="stat-value pos">${c.pctEconomizada.toFixed(1)}%</div>
        </div>
      </div>

      <div class="card-grid">
        <div class="card">
          <div class="card-title">Receitas × Despesas</div>
          <div class="chart-wrap"><canvas id="chartReceitasDespesas"></canvas></div>
        </div>
        <div class="card">
          <div class="card-title">Evolução do saldo</div>
          <div class="chart-wrap"><canvas id="chartSaldo"></canvas></div>
        </div>
        <div class="card">
          <div class="card-title">Gastos por categoria</div>
          <div class="chart-wrap"><canvas id="chartCategorias"></canvas></div>
        </div>
        <div class="card">
          <div class="card-title">Evolução dos gastos por mês</div>
          <div class="chart-wrap"><canvas id="chartMensal"></canvas></div>
        </div>
      </div>
      <div class="section-gap card">
        <div class="card-title">Comparação entre meses</div>
        <div class="chart-wrap"><canvas id="chartComparacao"></canvas></div>
      </div>
    `;

    this._bindChips(el);
    this._renderCharts(lancamentos, list, c, monthKey);
  },

  _bindChips(el) {
    el.querySelectorAll('[data-df]').forEach((b) => {
      b.addEventListener('click', () => {
        this._periodFilter = b.dataset.df;
        this.render();
      });
    });
    el.querySelectorAll('[data-dt]').forEach((b) => {
      b.addEventListener('click', () => {
        this._typeFilter = b.dataset.dt;
        this.render();
      });
    });
  },

  _renderCharts(all, list, c, monthKey) {
    // Receitas × Despesas (destaque: mês atual se filtro é mês, senão todos)
    destroyChart('recDesp');
    const ctx1 = document.getElementById('chartReceitasDespesas');
    if (ctx1) {
      makeChart('recDesp', ctx1, {
        type: 'doughnut',
        data: {
          labels: ['Receitas', 'Despesas'],
          datasets: [{
            data: [c.totalReceitas, c.totalDespesas],
            backgroundColor: ['#16a34a', '#dc2626'],
            borderWidth: 0,
          }],
        },
        options: baseOptions(),
      });
    }

    // Evolução do saldo
    destroyChart('saldo');
    const ctx2 = document.getElementById('chartSaldo');
    if (ctx2) {
      const saldoSeries = dailyBalanceSeries(list);
      makeChart('saldo', ctx2, {
        type: 'line',
        data: {
          labels: saldoSeries.map((p) => fmtDate(p.data).slice(0, 5)),
          datasets: [{
            label: 'Saldo',
            data: saldoSeries.map((p) => p.saldo),
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            fill: true,
            tension: 0.35,
            pointRadius: 2,
          }],
        },
        options: lineOptions(),
      });
    }

    // Gastos por categoria
    destroyChart('categorias');
    const ctx3 = document.getElementById('chartCategorias');
    if (ctx3) {
      const porCat = {};
      list.filter((l) => l.tipo === 'despesa').forEach((l2) => {
        const k = l2.categoria || 'Outros';
        porCat[k] = (porCat[k] || 0) + Number(l2.valor);
      });
      const labels = Object.keys(porCat);
      const values = Object.values(porCat);
      const colors = labels.map((_, i) => CHART_REDS[i % CHART_REDS.length]);
      makeChart('categorias', ctx3, {
        type: 'bar',
        data: {
          labels,
          datasets: [{ label: 'Gastos', data: values, backgroundColor: colors, borderRadius: 6 }],
        },
        options: {
          ...baseOptions(),
          plugins: { legend: { display: false } },
        },
      });
    }

    // Evolução dos gastos por mês
    destroyChart('mensal');
    const ctx4 = document.getElementById('chartMensal');
    if (ctx4) {
      const mensal = monthlyDespesas(all, 6);
      makeChart('mensal', ctx4, {
        type: 'line',
        data: {
          labels: mensal.map((m) => m.label),
          datasets: [{
            label: 'Gastos',
            data: mensal.map((m) => m.total),
            borderColor: '#dc2626',
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            fill: true,
            tension: 0.35,
            pointRadius: 3,
          }],
        },
        options: lineOptions(),
      });
    }

    // Comparação entre meses
    destroyChart('comparacao');
    const ctx5 = document.getElementById('chartComparacao');
    if (ctx5) {
      const meses = monthlyReceitasDespesas(all, 6);
      makeChart('comparacao', ctx5, {
        type: 'bar',
        data: {
          labels: meses.map((m) => m.label),
          datasets: [
            { label: 'Receitas', data: meses.map((m) => m.receitas), backgroundColor: '#16a34a', borderRadius: 6 },
            { label: 'Despesas', data: meses.map((m) => m.despesas), backgroundColor: '#dc2626', borderRadius: 6 },
          ],
        },
        options: {
          ...baseOptions(),
          scales: { y: baseY() },
        },
      });
    }
  },
};

function gastosPorCatTotal(lancamentos, cat) {
  return lancamentos.filter((l) => l.tipo === 'despesa' && (l.categoria || 'Outros') === cat)
    .reduce((s, l) => s + Number(l.valor), 0);
}

function dailyBalanceSeries(lancamentos) {
  const sorted = [...lancamentos].sort((a, b) => a.data.localeCompare(b.data));
  const map = {};
  sorted.forEach((l) => {
    map[l.data] = (map[l.data] || 0) + (l.tipo === 'receita' ? Number(l.valor) : -Number(l.valor));
  });
  const dates = Object.keys(map).sort();
  const result = [];
  let acc = 0;
  dates.forEach((d) => {
    acc += map[d];
    result.push({ data: d, saldo: acc });
  });
  if (result.length === 0) result.push({ data: hojeISO(), saldo: 0 });
  return result;
}

function monthlyDespesas(lancamentos, n) {
  const now = new Date();
  const result = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const total = lancamentos.filter((l) => l.tipo === 'despesa' && monthKeyOf(l.data) === mk)
      .reduce((s, l) => s + Number(l.valor), 0);
    result.push({ key: mk, label: monthLabel(d), total });
  }
  return result;
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
    plugins: {
      legend: { labels: { color: chartTextColor(), boxWidth: 12, boxHeight: 12 } },
    },
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
    plugins: {
      legend: { labels: { color: chartTextColor(), boxWidth: 12, boxHeight: 12 } },
    },
    scales: { y: baseY(), x: { ticks: { color: chartTextColor() }, grid: { color: chartGridColor() } } },
  };
}
