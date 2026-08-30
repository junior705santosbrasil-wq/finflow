const Relatorios = {
  _ano: String(new Date().getFullYear()),
  _mes: 'todos',

  render() {
    const el = document.getElementById('page-relatorios');
    const lancamentos = Storage.getLancamentos();

    el.innerHTML = `
      <div class="filter-bar">
        <select id="repAno">
          ${this._anosDisponiveis(lancamentos)}
        </select>
        <select id="repMes">
          <option value="todos">Todos os meses</option>
          <option value="01">Janeiro</option>
          <option value="02">Fevereiro</option>
          <option value="03">Março</option>
          <option value="04">Abril</option>
          <option value="05">Maio</option>
          <option value="06">Junho</option>
          <option value="07">Julho</option>
          <option value="08">Agosto</option>
          <option value="09">Setembro</option>
          <option value="10">Outubro</option>
          <option value="11">Novembro</option>
          <option value="12">Dezembro</option>
        </select>
        <div style="flex:1"></div>
        <button class="btn btn-green" id="btnExportCSV">⬇ Exportar CSV</button>
        <button class="btn btn-primary" id="btnExportExcel">⬇ Exportar Excel</button>
      </div>
      ${lancamentos.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">📈</div>
          <div class="empty-title">Sem dados para exibir.</div>
          <div class="empty-text">Registre lançamentos para gerar relatórios.</div>
        </div>` : this._renderRelatorio(lancamentos)}
    `;

    document.getElementById('repAno').value = this._ano;
    document.getElementById('repMes').value = document.getElementById('repMes').querySelector(`option[value="${this._mes}"]`) ? this._mes : 'todos';
    document.getElementById('repAno').addEventListener('change', (e) => { this._ano = e.target.value; this.render(); });
    document.getElementById('repMes').addEventListener('change', (e) => { this._mes = e.target.value; this.render(); });
    document.getElementById('btnExportCSV').addEventListener('click', () => this.exportar('csv'));
    document.getElementById('btnExportExcel').addEventListener('click', () => this.exportar('xlsx'));
  },

  _anosDisponiveis(lancamentos) {
    const anos = new Set([new Date().getFullYear()]);
    lancamentos.forEach((l) => {
      if (l.data && l.data.length >= 4) anos.add(Number(l.data.slice(0, 4)));
    });
    return [...anos].sort((a, b) => b - a)
      .map((a) => `<option value="${a}" ${this._ano == a ? 'selected' : ''}>${a}</option>`).join('');
  },

  _filtrados(lancamentos) {
    let list = lancamentos.filter((l) => (l.data || '').startsWith(this._ano));
    if (this._mes !== 'todos') list = list.filter((l) => l.data.slice(5, 7) === this._mes);
    return list;
  },

  _filtradosAno(lancamentos) {
    return lancamentos.filter((l) => (l.data || '').startsWith(this._ano));
  },

  _renderRelatorio(lancamentos) {
    const list = this._filtrados(lancamentos);
    const c = Dashboard.calculos(list);

    // Maiores despesas
    const despesas = list.filter((l) => l.tipo === 'despesa').sort((a, b) => b.valor - a.valor).slice(0, 10);

    // Gastos por categoria (para o render)
    const porCat = {};
    list.filter((l) => l.tipo === 'despesa').forEach((l) => {
      const k = l.categoria || 'Outros';
      porCat[k] = (porCat[k] || 0) + Number(l.valor);
    });
    const catLabels = Object.keys(porCat);
    const catValues = Object.values(porCat);
    const catColors = catLabels.map((_, i) => CHART_REDS[i % CHART_REDS.length]);

    // Evolução mensal
    const mensal = monthlyReceitasDespesas(list, 12);

    return `
      <div class="report-summary">
        <div class="stat-card"><div class="stat-label">Total recebido</div><div class="stat-value pos">${fmtMoney(c.totalReceitas)}</div></div>
        <div class="stat-card"><div class="stat-label">Total gasto</div><div class="stat-value neg">${fmtMoney(c.totalDespesas)}</div></div>
        <div class="stat-card"><div class="stat-label">Saldo</div><div class="stat-value ${c.saldo >= 0 ? 'pos' : 'neg'}">${fmtMoney(c.saldo)}</div></div>
        <div class="stat-card"><div class="stat-label">Lançamentos</div><div class="stat-value">${list.length}</div></div>
      </div>

      <div class="card-grid">
        <div class="card">
          <div class="card-title">Gastos por categoria</div>
          <div class="chart-wrap" style="height:280px"><canvas id="repCat"></canvas></div>
        </div>
        <div class="card">
          <div class="card-title">Evolução mensal</div>
          <div class="chart-wrap" style="height:280px"><canvas id="repMensal"></canvas></div>
        </div>
      </div>

      <div class="card-grid">
        <div class="card">
          <div class="card-title">Maiores despesas</div>
          ${despesas.length === 0 ? '<p class="stat-sub">Nenhuma despesa neste período.</p>' : `
          <ul class="top-expenses">
            ${despesas.map((d, i) => `
              <li>
                <span class="te-label">
                  <span class="te-rank">${i + 1}</span>
                  <span><strong>${escapeHtml(d.descricao)}</strong><br><span class="stat-sub">${escapeHtml(d.categoria || 'Outros')} · ${fmtDate(d.data)}</span></span>
                </span>
                <span class="neg" style="font-weight:700">−${fmtMoney(d.valor)}</span>
              </li>`).join('')}
          </ul>`}
        </div>
        <div class="card">
          <div class="card-title">Comparação entre períodos</div>
          <div class="chart-wrap" style="height:280px"><canvas id="repComparado"></canvas></div>
        </div>
      </div>
    ` +
    this._renderCharts(porCat, catLabels, catValues, catColors, mensal, list, despesas);
  },

  _renderCharts(porCat, catLabels, catValues, catColors, mensal, list, despesas) {
    const anoList = this._filtradosAno(Storage.getLancamentos());
    destroyChart('repCat');
    const ctx1 = document.getElementById('repCat');
    if (ctx1) {
      makeChart('repCat', ctx1, {
        type: 'doughnut',
        data: { labels: catLabels, datasets: [{ data: catValues, backgroundColor: catColors, borderWidth: 0 }] },
        options: baseOptions(),
      });
    }

    destroyChart('repMensal');
    const ctx2 = document.getElementById('repMensal');
    if (ctx2) {
      // dados do ano selecionado
      const series = monthlyReceitasDespesas(anoList, 12);
      makeChart('repMensal', ctx2, {
        type: 'line',
        data: {
          labels: series.map((m) => m.label),
          datasets: [
            { label: 'Receitas', data: series.map((m) => m.receitas), borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,.1)', fill: true, tension: 0.35, pointRadius: 2 },
            { label: 'Despesas', data: series.map((m) => m.despesas), borderColor: '#dc2626', backgroundColor: 'rgba(220,38,38,.1)', fill: true, tension: 0.35, pointRadius: 2 },
          ],
        },
        options: lineOptions(),
      });
    }

    destroyChart('repComparado');
    const ctx3 = document.getElementById('repComparado');
    if (ctx3) {
      // comparação do período selecionado com o anterior
      const comp = this._comparacao(anoList);
      makeChart('repComparado', ctx3, {
        type: 'bar',
        data: {
          labels: comp.map((p) => p.label),
          datasets: [
            { label: 'Receitas', data: comp.map((p) => p.receitas), backgroundColor: '#16a34a', borderRadius: 6 },
            { label: 'Despesas', data: comp.map((p) => p.despesas), backgroundColor: '#dc2626', borderRadius: 6 },
          ],
        },
        options: { ...baseOptions(), scales: { y: baseY() } },
      });
    }
    return '';
  },

  _comparacao(list) {
    const labels = ['Atual', 'Anterior'];
    if (this._mes !== 'todos') {
      const d = new Date(Number(this._ano), Number(this._mes) - 1, 1);
      const dPrev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const cur = `${this._ano}-${this._mes}`;
      const prev = `${dPrev.getFullYear()}-${String(dPrev.getMonth() + 1).padStart(2, '0')}`;
      const calc = (mk) => {
        const rec = list.filter((l) => l.tipo === 'receita' && monthKeyOf(l.data) === mk).reduce((s, l) => s + Number(l.valor), 0);
        const desp = list.filter((l) => l.tipo === 'despesa' && monthKeyOf(l.data) === mk).reduce((s, l) => s + Number(l.valor), 0);
        return { rec, desp };
      };
      const a = calc(cur), b = calc(prev);
      return [
        { label: monthLabel(d), receitas: a.rec, despesas: a.desp },
        { label: monthLabel(dPrev), receitas: b.rec, despesas: b.desp },
      ];
    }
    // ano: comparar com ano anterior
    const calcAno = (yr) => {
      const rec = list.filter((l) => l.tipo === 'receita' && (l.data || '').startsWith(String(yr))).reduce((s, l) => s + Number(l.valor), 0);
      const desp = list.filter((l) => l.tipo === 'despesa' && (l.data || '').startsWith(String(yr))).reduce((s, l) => s + Number(l.valor), 0);
      return { rec, desp };
    };
    const a = calcAno(this._ano), b = calcAno(Number(this._ano) - 1);
    return [
      { label: String(this._ano), receitas: a.rec, despesas: a.desp },
      { label: String(Number(this._ano) - 1), receitas: b.rec, despesas: b.desp },
    ];
  },

  exportar(tipo) {
    const all = Storage.getLancamentos();
    const list = this._filtrados(all).sort((a, b) => a.data.localeCompare(b.data));
    if (list.length === 0) { toast('Nenhum dado para exportar.', 'warn'); return; }

    const t = list.map((l) => ({
      Data: l.data,
      Descricao: l.descricao,
      Tipo: l.tipo === 'receita' ? 'Receita' : 'Despesa',
      Categoria: l.categoria || 'Outros',
      Valor: Number(l.valor),
      'Forma de pagamento': l.pagamento || '',
      Observacao: l.observacao || '',
    }));

    if (tipo === 'xlsx') {
      this.exportarExcel(t);
    } else {
      this.exportarCSV(t);
    }
  },

  exportarCSV(rows) {
    const headers = Object.keys(rows[0]);
    const esc = (v) => {
      const s = String(v == null ? '' : v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const csv = '\uFEFF' + [headers.join(';'), ...rows.map((r) => headers.map((h) => esc(r[h])).join(';'))].join('\r\n');
    this.download(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `finflow_${this._ano}.csv`);
    toast('CSV exportado!');
  },

  exportarExcel(rows) {
    const headers = Object.keys(rows[0]);
    const esc = (v) => {
      const s = String(v == null ? '' : v);
      // Excel formula injection safe
      if (/^[=+\-@]/.test(s)) return "'" + s;
      return s;
    };
    const csv = '\uFEFF' + [headers.join(';'), ...rows.map((r) => headers.map((h) => esc(r[h])).join(';'))].join('\r\n');
    this.download(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `finflow_${this._ano}.csv`);
    toast('Excel exportado! Abra o arquivo CSV no Excel, que converte automaticamente.');
  },

  download(blob, nome) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
