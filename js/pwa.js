/* ================================================================
   GYM PRO — pwa.js
   Registro do Service Worker, tratamento de atualizações e
   suporte à instalação como app (Android/Chrome via prompt nativo,
   iOS/Safari via instrução manual "Adicionar à Tela de Início").
================================================================ */

const PWA = (() => {

  let deferredInstallPrompt = null;

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true; // Safari iOS
  }

  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  /* --------------------------------------------------------------
     Registra o Service Worker (necessário para funcionar offline
     e para o app ser instalável como PWA).
  -------------------------------------------------------------- */
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registrado:', registration.scope);

          // Detecta quando há uma nova versão do app disponível
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Há uma versão nova pronta — ativa e recarrega
                newWorker.postMessage('SKIP_WAITING');
              }
            });
          });
        })
        .catch((err) => console.error('[PWA] Falha ao registrar o Service Worker:', err));

      // Quando o novo Service Worker assume o controle, recarrega a página
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    });
  }

  /* --------------------------------------------------------------
     Captura o prompt nativo de instalação (Android/Chrome/Edge).
     No iOS/Safari esse evento não existe — o usuário instala via
     Compartilhar → Adicionar à Tela de Início.
  -------------------------------------------------------------- */
  function listenForInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
    });

    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      UI?.showToast('Gym Pro instalado com sucesso!', 'success');
    });
  }

  /* Pode ser chamado a partir de um botão (ex: nas Configurações)
     para disparar o prompt de instalação nativo do Android/Chrome. */
  async function promptInstall() {
    if (!deferredInstallPrompt) return false;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    return outcome === 'accepted';
  }

  /* --------------------------------------------------------------
     Mostra uma dica única para usuários de iPhone/iPad explicando
     como instalar o app (Safari não tem prompt automático).
  -------------------------------------------------------------- */
  function showIOSInstallHintIfNeeded() {
    if (!isIOS() || isStandalone()) return;

    const alreadyShown = sessionStorage.getItem('gympro-ios-hint-shown');
    if (alreadyShown) return;

    setTimeout(() => {
      UI?.showToast('Dica: toque em Compartilhar ⬆️ e escolha "Adicionar à Tela de Início" para instalar o app.');
      sessionStorage.setItem('gympro-ios-hint-shown', '1');
    }, 1500);
  }

  function init() {
    registerServiceWorker();
    listenForInstallPrompt();
    showIOSInstallHintIfNeeded();
  }

  return { init, promptInstall, isStandalone, isIOS };
})();

window.PWA = PWA;
