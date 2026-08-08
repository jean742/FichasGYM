/* ================================================================
   GYM PRO — auth.js
   Autenticação por e-mail/senha via Firebase Authentication.
   É essa camada que garante que "seus" dados no Firestore sejam
   sempre os mesmos em qualquer aparelho — o login identifica você.
================================================================ */

const Auth = (() => {

  let currentUser = null;
  let authReadyResolve;
  const authReady = new Promise((resolve) => { authReadyResolve = resolve; });

  /* Inicializa o Firebase App (uma única vez) usando o config do
     arquivo js/firebase-config.js. */
  function initFirebase() {
    if (!window.FIREBASE_IS_CONFIGURED) return false;
    if (!firebase.apps.length) {
      firebase.initializeApp(window.FIREBASE_CONFIG);
    }
    return true;
  }

  /* Observa mudanças no estado de login (chamado uma vez no boot) */
  function listen(onChange) {
    firebase.auth().onAuthStateChanged((user) => {
      currentUser = user;
      authReadyResolve();
      onChange(user);
    });
  }

  async function signUp(email, password) {
    const cred = await firebase.auth().createUserWithEmailAndPassword(email.trim(), password);
    return cred.user;
  }

  async function signIn(email, password) {
    const cred = await firebase.auth().signInWithEmailAndPassword(email.trim(), password);
    return cred.user;
  }

  async function signOutUser() {
    await firebase.auth().signOut();
  }

  async function resetPassword(email) {
    await firebase.auth().sendPasswordResetEmail(email.trim());
  }

  /* Login com Google — tenta popup primeiro (mais rápido); se o
     navegador bloquear o popup (comum em PWA instalado / iOS às
     vezes), cai automaticamente para redirect. */
  async function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      const cred = await firebase.auth().signInWithPopup(provider);
      return cred.user;
    } catch (err) {
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        if (err.code === 'auth/popup-blocked') {
          await firebase.auth().signInWithRedirect(provider);
          return null; // a página recarrega; o resultado vem via checkRedirectResult()
        }
      }
      throw err;
    }
  }

  /* Verifica se o usuário acabou de voltar de um login por redirect
     (fallback do Google quando o popup é bloqueado). Chamado uma vez
     no boot, antes de qualquer outra coisa. */
  async function checkRedirectResult() {
    try {
      await firebase.auth().getRedirectResult();
    } catch (err) {
      console.warn('[Auth] Erro ao concluir login por redirect:', err.code || err.message);
    }
  }

  function getUser() {
    return currentUser;
  }

  function getUid() {
    return currentUser ? currentUser.uid : null;
  }

  /* Traduz os códigos de erro do Firebase para mensagens em português,
     mais úteis para quem está usando o app. */
  function friendlyError(error) {
    const map = {
      'auth/invalid-email': 'E-mail inválido.',
      'auth/missing-password': 'Digite uma senha.',
      'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
      'auth/email-already-in-use': 'Já existe uma conta com esse e-mail. Tente entrar em vez de criar uma nova conta.',
      'auth/user-not-found': 'Não encontramos uma conta com esse e-mail.',
      'auth/wrong-password': 'Senha incorreta.',
      'auth/invalid-credential': 'E-mail ou senha incorretos.',
      'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco antes de tentar de novo.',
      'auth/network-request-failed': 'Falha de conexão. Verifique sua internet.',
      'auth/operation-not-allowed': 'O login por e-mail/senha ainda não foi ativado no Firebase. No console: Authentication → Sign-in method → ative "E-mail/senha".',
      'auth/configuration-not-found': 'A Authentication ainda não foi configurada neste projeto Firebase. Abra o console → Authentication → Get started.',
      'auth/unauthorized-domain': 'Este domínio ainda não está autorizado no Firebase. No console: Authentication → Settings → Authorized domains → adicione este domínio.',
      'auth/popup-closed-by-user': 'Login cancelado.',
      'auth/cancelled-popup-request': 'Login cancelado.',
      'auth/account-exists-with-different-credential': 'Já existe uma conta com esse e-mail usando outro método de login (ex: senha). Tente entrar com e-mail/senha.'
    };
    const message = map[error?.code];
    if (message) return message;
    // Fallback: mostra o código bruto do erro para facilitar o diagnóstico
    console.error('[Auth] Código de erro não mapeado:', error?.code, error?.message);
    return `Não foi possível completar a ação${error?.code ? ` (${error.code})` : ''}. Tente novamente.`;
  }

  return {
    initFirebase, listen,
    signUp, signIn, signOutUser, resetPassword,
    signInWithGoogle, checkRedirectResult,
    getUser, getUid, friendlyError,
    ready: () => authReady
  };
})();

window.Auth = Auth;
