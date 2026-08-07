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
  apiKey: "COLE_AQUI_SUA_API_KEY",
  authDomain: "COLE_AQUI_SEU_PROJETO.firebaseapp.com",
  projectId: "COLE_AQUI_SEU_PROJECT_ID",
  storageBucket: "COLE_AQUI_SEU_PROJETO.appspot.com",
  messagingSenderId: "COLE_AQUI_SEU_SENDER_ID",
  appId: "COLE_AQUI_SEU_APP_ID"
};

window.FIREBASE_CONFIG = firebaseConfig;

// Sinaliza se o app ainda está com os valores de exemplo (não configurado)
window.FIREBASE_IS_CONFIGURED = firebaseConfig.apiKey !== "COLE_AQUI_SUA_API_KEY";
