/* ================================================================
   GYM PRO — firebase-config.js
   Configurado com as chaves do projeto "gym-pro-e2936".
================================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyCUWerRIkb0LtaEwQeW0xax_2z9NxezQ3g",
  authDomain: "gym-pro-e2936.firebaseapp.com",
  projectId: "gym-pro-e2936",
  storageBucket: "gym-pro-e2936.firebasestorage.app",
  messagingSenderId: "507012856047",
  appId: "1:507012856047:web:a47be019fdc0293357431a"
};

window.FIREBASE_CONFIG = firebaseConfig;

// Sinaliza se o app ainda está com os valores de exemplo (não configurado)
window.FIREBASE_IS_CONFIGURED = firebaseConfig.apiKey !== "COLE_AQUI_SUA_API_KEY";
