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
      'auth/network-request-failed': 'Falha de conexão. Verifique sua internet.'
    };
    return map[error?.code] || 'Não foi possível completar a ação. Tente novamente.';
  }

  return {
    initFirebase, listen,
    signUp, signIn, signOutUser, resetPassword,
    getUser, getUid, friendlyError,
    ready: () => authReady
  };
})();

window.Auth = Auth;
