/* ================================================================
   GYM PRO — app.js
   Ponto de entrada da aplicação. Orquestra a ordem de inicialização:

   1) Se o Firebase estiver configurado, aguarda o estado de login:
      - sem login → mostra a tela de login e PARA aqui
      - com login → segue o boot normal, usando dados da nuvem
      Se o Firebase NÃO estiver configurado, pula direto pro boot
      normal usando armazenamento local (comportamento original).
   2) Abre a camada de dados (DB.open)
   3) Aplica tema/cor salvos
   4) Inicializa o cronômetro
   5) Inicializa a UI (telas, navegação, eventos)
   6) Registra o Service Worker / lógica de PWA
   7) Remove a tela de splash
================================================================ */

(function bootstrap() {
  const splash = document.getElementById('splash-screen');
  const loginScreen = document.getElementById('login-screen');

  function hideSplash() {
    setTimeout(() => {
      splash?.classList.add('fade-out');
      setTimeout(() => splash?.remove(), 600);
    }, 300);
  }

  async function startApp() {
    try {
      await DB.open();

      const settings = await DB.getSettings();
      document.documentElement.setAttribute('data-theme', settings.theme || 'dark');
      if (settings.accentColor) {
        document.documentElement.style.setProperty('--accent', settings.accentColor);
      }

      Timer.init();
      await UI.init();
      UI.refreshAccountUI?.();
      PWA.init();
    } catch (err) {
      console.error('[App] Erro crítico na inicialização:', err);
      UI?.showToast?.('Ocorreu um erro ao carregar seus dados. Tente recarregar a página.', 'danger');
    } finally {
      hideSplash();
    }
  }

  function showLoginScreen() {
    loginScreen?.classList.remove('hidden');
    hideSplash();
    bindLoginForm();
    resetLoginButton();
  }

  function resetLoginButton() {
    const submitBtn = document.getElementById('login-submit');
    if (!submitBtn) return;
    submitBtn.disabled = false;
    submitBtn.textContent = loginMode === 'signup' ? 'Criar conta' : 'Entrar';
  }

  function hideLoginScreen() {
    loginScreen?.classList.add('hidden');
  }

  /* --------------------------------------------------------------
     Formulário de login/criação de conta
  -------------------------------------------------------------- */
  let loginMode = 'signin';
  let loginBound = false;

  function bindLoginForm() {
    if (loginBound) return;
    loginBound = true;

    document.querySelectorAll('#login-tabs .segmented-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        loginMode = btn.dataset.mode;
        document.querySelectorAll('#login-tabs .segmented-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('login-submit').textContent = loginMode === 'signup' ? 'Criar conta' : 'Entrar';
        document.getElementById('login-error').classList.add('hidden');
      });
    });

    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      const errorEl = document.getElementById('login-error');
      const submitBtn = document.getElementById('login-submit');

      errorEl.classList.add('hidden');
      submitBtn.disabled = true;
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Aguarde...';

      try {
        if (loginMode === 'signup') {
          await Auth.signUp(email, password);
        } else {
          await Auth.signIn(email, password);
        }
        // onAuthStateChanged (registrado em initAuthFlow) cuida do resto
      } catch (err) {
        errorEl.textContent = Auth.friendlyError(err);
        errorEl.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });

    document.getElementById('login-forgot').addEventListener('click', async () => {
      const email = document.getElementById('login-email').value;
      const errorEl = document.getElementById('login-error');
      if (!email) {
        errorEl.textContent = 'Digite seu e-mail no campo acima primeiro.';
        errorEl.classList.remove('hidden');
        return;
      }
      try {
        await Auth.resetPassword(email);
        errorEl.classList.add('hidden');
        alert('Enviamos um link de redefinição de senha para o seu e-mail.');
      } catch (err) {
        errorEl.textContent = Auth.friendlyError(err);
        errorEl.classList.remove('hidden');
      }
    });
  }

  /* --------------------------------------------------------------
     Fluxo principal
  -------------------------------------------------------------- */
  let appStarted = false;

  if (window.FIREBASE_IS_CONFIGURED) {
    Auth.initFirebase();
    Auth.listen((user) => {
      if (user) {
        hideLoginScreen();
        if (!appStarted) {
          appStarted = true;
          startApp();
        }
      } else {
        appStarted = false;
        showLoginScreen();
      }
    });
  } else {
    // Sem Firebase configurado: comportamento original, 100% local
    startApp();
  }

})();

/* ----------------------------------------------------------------
   Tratamento global de erros não capturados
---------------------------------------------------------------- */
window.addEventListener('error', (event) => {
  console.error('[App] Erro não tratado:', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[App] Promise rejeitada não tratada:', event.reason);
});
