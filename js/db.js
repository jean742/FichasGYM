/* ================================================================
   GYM PRO — db.js (roteador)
   Decide qual camada de dados usar:

   • Se o Firebase estiver configurado (js/firebase-config.js
     preenchido com as chaves do seu projeto) → usa DBCloud, que
     sincroniza tudo entre qualquer aparelho onde você fizer login.

   • Se ainda não estiver configurado → usa DBLocal (IndexedDB),
     exatamente como o app funcionava antes, salvando só neste
     aparelho. Assim o app nunca quebra por falta de configuração.

   Todo o resto do app (ui.js, generator.js, nutrition.js) só
   conhece "DB.alguma_coisa()" — não sabe nem precisa saber qual
   das duas camadas está realmente respondendo por trás.
================================================================ */

const DB = window.FIREBASE_IS_CONFIGURED ? window.DBCloud : window.DBLocal;

if (!window.FIREBASE_IS_CONFIGURED) {
  console.info('[DB] Firebase não configurado — usando armazenamento local (este aparelho apenas). Veja o README para ativar a sincronização entre dispositivos.');
} else {
  console.info('[DB] Firebase configurado — usando armazenamento na nuvem (sincronizado entre dispositivos).');
}

window.DB = DB;
