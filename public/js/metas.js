const Metas = {
  render() {
    const el = document.getElementById('page-metas');
    const metas = Storage.getMetas();

    el.innerHTML = `
      <div class="section-gap" style="margin-top:0">
        <button class="btn btn-primary" id="btnNovaMeta" style="margin-bottom:20px">+ Nova meta</button>

        ${metas.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">🏆</div>
            <div class="empty-title">Você ainda não possui metas.</div>
            <div class="empty-text">Crie metas financeiras como economizar, fazer uma viagem ou comprar um computador.</div>
            <button class="btn btn-primary" id="btnNovaMetaEmpty">+ Criar minha primeira meta</button>
          </div>` : `
        <div class="metas-grid">
          ${metas.map((m) => {
            const obj = Number(m.objetivo) || 0;
            const acc = Number(m.acumulado) || 0;
            const pct = obj > 0 ? Math.min(100, (acc / obj) * 100) : 0;
            const done = obj > 0 && acc >= obj;
            const hoje = new Date();
            const prazo = m.prazo ? new Date(m.prazo + 'T00:00:00') : null;
            let prazoTxt = 'Sem prazo';
            if (prazo) {
              if (prazo < hoje) prazoTxt = 'Prazo vencido';
              else {
                const dias = Math.ceil((prazo - hoje) / 86400000);
                prazoTxt = `${dias} dia(s) restante(s)`;
              }
            }
            const fillCls = done ? '' : pct >= 80 ? 'warn' : pct >= 100 ? 'alert' : '';
            return `
            <div class="card meta-card">
              <div class="meta-actions">
                <button class="icon-btn edit" data-editmeta="${m.id}" title="Editar">✏️</button>
                <button class="icon-btn del" data-delmeta="${m.id}" title="Excluir">🗑️</button>
              </div>
              <div class="meta-name">${escapeHtml(m.nome)}</div>
              <div class="meta-amounts">
                <span class="m-obj">${fmtMoney(acc)} <span class="stat-sub" style="font-weight:500">de ${fmtMoney(obj)}</span></span>
              </div>
              <div class="progress"><div class="progress-fill ${fillCls}" style="width:${pct}%"></div></div>
              <div class="meta-pct">
                <span>${pct.toFixed(0)}% concluído</span>
                <span class="${done ? 'meta-done' : ''}">${done ? '✅ Concluída' : ''}</span>
              </div>
              <div class="meta-deadline">
                <span>📅 ${prazoTxt}</span>
              </div>
              <button class="btn btn-ghost btn-sm" data-addmeta="${m.id}" style="width:100%;margin-top:14px">+ Adicionar valor</button>
            </div>`;
          }).join('')}
        </div>`}
      </div>
    `;

    this._bindEvents(el, metas);
  },

  _bindEvents(el, metas) {
    const nova = document.getElementById('btnNovaMeta');
    if (nova) nova.addEventListener('click', () => this.openModal());
    const novaE = document.getElementById('btnNovaMetaEmpty');
    if (novaE) novaE.addEventListener('click', () => this.openModal());

    el.querySelectorAll('[data-editmeta]').forEach((b) => {
      b.addEventListener('click', () => {
        const m = metas.find((x) => x.id === b.dataset.editmeta);
        if (m) this.openModal(m);
      });
    });
    el.querySelectorAll('[data-delmeta]').forEach((b) => {
      b.addEventListener('click', async () => {
        if (!confirm('Excluir esta meta?')) return;
        const id = b.dataset.delmeta;
        try {
          await Storage.excluirMeta(id);
          const list = Storage.getMetas().filter((x) => x.id !== id);
          Storage.setMetas(list);
          toast('Meta excluída.');
        } catch (e) {
          toast(e.message || 'Erro ao excluir.', 'error');
        }
        this.render();
      });
    });
    el.querySelectorAll('[data-addmeta]').forEach((b) => {
      b.addEventListener('click', async () => {
        const m = metas.find((x) => x.id === b.dataset.addmeta);
        if (!m) return;
        const v = window.prompt(`Quanto deseja adicionar a "${m.nome}"? (R$)`, '0');
        if (v === null) return;
        const num = Number(String(v).replace(',', '.'));
        if (isNaN(num) || num < 0) { toast('Valor inválido.', 'error'); return; }
        try {
          await Storage.addValorMeta(m.id, num);
          const list = Storage.getMetas();
          const target = list.find((x) => x.id === m.id);
          if (target) target.acumulado = (Number(target.acumulado) || 0) + num;
          toast(`Valor adicionado! ${fmtMoney(target.acumulado)} de ${fmtMoney(target.objetivo)}.`);
        } catch (e) {
          toast(e.message || 'Erro ao adicionar valor.', 'error');
        }
        this.render();
      });
    });
  },

  openModal(meta) {
    document.getElementById('modalMetaTitle').textContent = meta ? 'Editar meta' : 'Nova meta';
    document.getElementById('metaEditId').value = meta ? meta.id : '';
    document.getElementById('metaNome').value = meta ? meta.nome : '';
    document.getElementById('metaObjetivo').value = meta ? meta.objetivo : '';
    document.getElementById('metaAcumulado').value = meta ? (meta.acumulado || 0) : '0';
    document.getElementById('metaPrazo').value = meta ? (meta.prazo || '') : '';
    openModal('modalMeta');
    document.getElementById('metaNome').focus();
  },

  async salvar() {
    const id = document.getElementById('metaEditId').value;
    const nome = document.getElementById('metaNome').value.trim();
    const objetivo = Number(document.getElementById('metaObjetivo').value);
    const acumulado = Number(document.getElementById('metaAcumulado').value) || 0;
    const prazo = document.getElementById('metaPrazo').value;

    if (!nome || !objetivo) { toast('Preencha nome e valor objetivo.', 'error'); return; }

    const metas = Storage.getMetas();
    const meta = { id: id || uid(), nome, objetivo, acumulado: Math.max(0, acumulado), prazo };
    try {
      if (id) {
        await Storage.atualizarMeta(meta);
        const i = metas.findIndex((x) => x.id === id);
        if (i > -1) metas[i] = meta;
        toast('Meta atualizada!');
      } else {
        await Storage.criarMeta(meta);
        metas.push(meta);
        toast('Meta criada!');
      }
      closeModal('modalMeta');
    } catch (e) {
      toast(e.message || 'Erro ao salvar.', 'error');
      return;
    }
    this.render();
  },
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('formMeta').addEventListener('submit', (e) => {
    e.preventDefault();
    Metas.salvar();
  });
});
