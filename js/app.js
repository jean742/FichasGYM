/* ================================================================
   GYM PRO — app.js
   Ponto de entrada da aplicação. Orquestra a ordem de inicialização:
   1) Abre o IndexedDB
   2) Aplica tema/cor salvos
   3) Inicializa o cronômetro
   4) Inicializa a UI (telas, navegação, eventos)
   5) Registra o Service Worker / lógica de PWA
   6) Remove a tela de splash
================================================================ */

(async function bootstrap() {
  const splash = document.getElementById('splash-screen');

  try {
    // 1) Garante que o banco de dados está pronto antes de qualquer render
    await DB.open();

    // 2) Aplica tema e cor de destaque salvos ANTES de mostrar a UI,
    //    evitando "flash" de tema errado.
    const settings = await DB.getSettings();
    document.documentElement.setAttribute('data-theme', settings.theme || 'dark');
    if (settings.accentColor) {
      document.documentElement.style.setProperty('--accent', settings.accentColor);
    }

    // 3) Cronômetro
    Timer.init();

    // 4) Interface completa (telas, listeners, dados iniciais)
    await UI.init();

    // 5) PWA — service worker + dicas de instalação
    PWA.init();

  } catch (err) {
    console.error('[App] Erro crítico na inicialização:', err);
    UI?.showToast?.('Ocorreu um erro ao carregar o app. Tente recarregar a página.', 'danger');
  } finally {
    // 6) Esconde a splash screen com uma pequena transição suave
    setTimeout(() => {
      splash?.classList.add('fade-out');
      setTimeout(() => splash?.remove(), 600);
    }, 400);
  }
})();

/* ----------------------------------------------------------------
   Tratamento global de erros não capturados — evita que o app
   trave silenciosamente e ajuda a depurar em produção.
---------------------------------------------------------------- */
window.addEventListener('error', (event) => {
  console.error('[App] Erro não tratado:', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[App] Promise rejeitada não tratada:', event.reason);
});
