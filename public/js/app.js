const App = {
  pages: ['dashboard', 'lancamentos', 'orcamentos', 'metas', 'relatorios'],
  _user: null,

  async init() {
    this.initTheme();
    this._bindNav();
    this._bindAuthUI();
    this._bindModals();

    // Novo lançamento
    document.getElementById('btnNovoLancamento').addEventListener('click', () => Lancamentos.openModal());

    // Logout
    document.getElementById('btnLogout').addEventListener('click', () => this.logout());

    // Verifica se há sessão salva
    if (Storage.usuarioAutenticado) {
      this.showLoading();
      try {
        await Storage.carregarDados();
        const me = await Storage._request('GET', '/api/me');
        this._user = me.user;
        this.entrarApp();
      } catch (e) {
        Storage.logout();
        this.mostrarLogin();
      }
      this.hideLoading();
    } else {
      this.mostrarLogin();
    }
  },

  _bindNav() {
    document.querySelectorAll('.nav-item').forEach((item) => {
      item.addEventListener('click', () => this.goTo(item.dataset.page));
    });
    document.getElementById('menuBtn').addEventListener('click', () => this.openSidebar(true));
    document.getElementById('sidebarClose').addEventListener('click', () => this.openSidebar(false));
    document.getElementById('sidebarOverlay').addEventListener('click', () => this.openSidebar(false));
  },

  _bindAuthUI() {
    // Tabs login/registro
    document.querySelectorAll('.auth-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const mode = tab.dataset.authtab;
        document.querySelectorAll('.auth-tab').forEach((t) => t.classList.toggle('active', t === tab));
        document.getElementById('authMode').value = mode;
        document.getElementById('authNomeField').style.display = mode === 'registrar' ? '' : 'none';
        document.getElementById('authSubmit').textContent = mode === 'registrar' ? 'Criar conta' : 'Entrar';
        document.getElementById('authError').classList.add('hidden');
      });
    });

    // Submit do formulário
    document.getElementById('authForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const mode = document.getElementById('authMode').value;
      const email = document.getElementById('authEmail').value.trim();
      const senha = document.getElementById('authSenha').value;
      const nome = document.getElementById('authNome').value.trim();
      const errEl = document.getElementById('authError');
      errEl.classList.add('hidden');
      const btn = document.getElementById('authSubmit');
      btn.disabled = true;
      try {
        let user;
        if (mode === 'registrar') {
          if (!nome) throw new Error('Informe seu nome.');
          user = await Storage.registrar(nome, email, senha);
        } else {
          user = await Storage.login(email, senha);
        }
        this._user = user;
        await Storage.carregarDados();
        this.entrarApp();
      } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
      } finally {
        btn.disabled = false;
      }
    });
  },

  _bindModals() {
    document.querySelectorAll('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => closeModal(btn.dataset.close));
    });
    document.querySelectorAll('.modal').forEach((m) => {
      m.querySelector('.modal-overlay').addEventListener('click', () => m.classList.add('hidden'));
    });
  },

  // ---------- Fluxo de sessão ----------
  mostrarLogin() {
    document.getElementById('authScreen').classList.remove('hidden');
    if (!this._loading) {
      document.querySelector('.app').classList.add('hidden');
    }
  },
  entrarApp() {
    document.getElementById('authScreen').classList.add('hidden');
    document.querySelector('.app').classList.remove('hidden');
    document.getElementById('userName').textContent = (this._user && this._user.nome) || 'Usuário';
    document.getElementById('userAvatar').textContent = (this._user && this._user.nome ? this._user.nome.charAt(0).toUpperCase() : '👤');
    this.goTo('dashboard');
    toast('Bem-vindo, ' + ((this._user && this._user.nome) || '') + '!');
  },
  logout() {
    Storage.logout();
    this._user = null;
    document.getElementById('authForm').reset();
    document.getElementById('authMode').value = 'login';
    document.getElementById('authNomeField').style.display = 'none';
    document.getElementById('authSubmit').textContent = 'Entrar';
    this.mostrarLogin();
  },

  showLoading() {
    // evita piscar a tela de login enquanto valida a sessão
    document.getElementById('authScreen').classList.add('hidden');
    document.querySelector('.app').classList.add('hidden');
    this._loading = true;
  },
  hideLoading() {
    this._loading = false;
  },

  // ---------- Navegação ----------
  openSidebar(open) {
    document.getElementById('sidebar').classList.toggle('open', open);
    document.getElementById('sidebarOverlay').classList.toggle('hidden', !open);
  },

  goTo(page) {
    if (!this.pages.includes(page)) page = 'dashboard';
    this.pages.forEach((p) => {
      document.getElementById('page-' + p).classList.toggle('hidden', p !== page);
    });
    document.querySelectorAll('.nav-item').forEach((n) => {
      n.classList.toggle('active', n.dataset.page === page);
    });
    const titles = {
      dashboard: 'Dashboard',
      lancamentos: 'Lançamentos',
      orcamentos: 'Orçamentos',
      metas: 'Metas',
      relatorios: 'Relatórios',
    };
    document.getElementById('pageTitle').textContent = titles[page];
    this.openSidebar(false);
    window.scrollTo(0, 0);
    this.renderPage(page);
  },

  renderPage(page) {
    switch (page) {
      case 'dashboard': Dashboard.render(); break;
      case 'lancamentos': Lancamentos.render(); break;
      case 'orcamentos': Orcamentos.render(); break;
      case 'metas': Metas.render(); break;
      case 'relatorios': Relatorios.render(); break;
    }
  },

  refresh() {
    const current = document.querySelector('.nav-item.active');
    if (current) this.goTo(current.dataset.page);
  },

  // ---------- Tema ----------
  initTheme() {
    const saved = localStorage.getItem(Storage.KEYS.theme);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const useDark = saved ? saved === 'dark' : prefersDark;
    this.applyTheme(useDark);
  },
  applyTheme(dark) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem(Storage.KEYS.theme, dark ? 'dark' : 'light');
    document.getElementById('darkToggle').innerHTML = dark
      ? '<span class="dark-toggle-icon">☀️</span><span>Modo claro</span>'
      : '<span class="dark-toggle-icon">🌙</span><span>Modo escuro</span>';
  },
  toggleTheme() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    this.applyTheme(!dark);
  },
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
