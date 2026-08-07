/* ================================================================
   GYM PRO — firebase-config.js
   COLE AQUI as chaves do SEU projeto Firebase (veja o passo a passo
   no README.md, seção "Sincronização entre dispositivos").

   Como pegar essas chaves:
   1. console.firebase.google.com → crie um projeto (grátis)
   2. No projeto, clique no ícone "</>" (Web) para registrar um app
   3. O Firebase mostra um objeto firebaseConfig — copie os valores
      e cole exatamente nos campos abaixo.

   Este arquivo é seguro de deixar público no GitHub: essas chaves
   identificam o projeto, mas não dão acesso a nada por si só — quem
   protege seus dados são as REGRAS DE SEGURANÇA do Firestore (veja
   o README) e o login de cada usuário.
================================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyCUverRIkb0LtaEwQeW0xax_2z9NxezQ3g",
  authDomain: "gym-pro-e2936.firebaseapp.com",
  projectId: "gym-pro-e2936",
  storageBucket: "gym-pro-e2936.firebasestorage.app",
  messagingSenderId: "507012856047",
  appId: "1:507012856047:web:a47be019fdc0293357431a"
};

window.FIREBASE_CONFIG = firebaseConfig;

// Sinaliza se o app ainda está com os valores de exemplo (não configurado)
window.FIREBASE_IS_CONFIGURED = firebaseConfig.apiKey !== "COLE_AQUI_SUA_API_KEY";
