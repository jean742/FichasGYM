/* ================================================================
   GYM PRO — ai-coach.js
   Integração OPCIONAL com a API da Anthropic (Claude) para respostas
   de verdade do Coach, usando a chave de API da PRÓPRIA pessoa.

   Importante sobre segurança: a chave fica salva só neste aparelho
   (localStorage — nunca vai pro Firestore/backup/nuvem) e as chamadas
   saem direto do navegador da pessoa para a Anthropic. Isso é
   conveniente para uso pessoal, mas significa que, tecnicamente,
   qualquer pessoa com acesso físico a este navegador (DevTools)
   poderia ver a chave. Por isso: use uma chave própria, nunca
   compartilhada, e você pode revogá-la a qualquer momento no console
   da Anthropic caso ache que ela vazou.
================================================================ */

const AICoach = (() => {

  const STORAGE_KEY = 'gympro_ai_api_key';
  const MODEL = 'claude-haiku-4-5-20251001'; // rápido e barato, ideal pra esse uso

  function getApiKey() {
    return localStorage.getItem(STORAGE_KEY) || '';
  }

  function saveApiKey(key) {
    if (key) localStorage.setItem(STORAGE_KEY, key.trim());
    else localStorage.removeItem(STORAGE_KEY);
  }

  function isConfigured() {
    return !!getApiKey();
  }

  /* Resume o contexto da pessoa em texto simples, pra dar à IA
     informação suficiente sem expor mais dados do que o necessário. */
  function buildContextSummary(ctx) {
    const lines = [];
    lines.push(`Nome: ${ctx.profile.name || 'não informado'}`);
    lines.push(`Objetivo: ${ctx.profile.goal}`);
    if (ctx.profile.age) lines.push(`Idade: ${ctx.profile.age}`);
    if (ctx.profile.weight) lines.push(`Peso: ${ctx.profile.weight} kg`);
    if (ctx.weekInfo) {
      lines.push(`Programa: semana ${ctx.weekInfo.weekInCycle} de ${ctx.weekInfo.cycleWeeks} do mesociclo${ctx.weekInfo.isDeloadWeek ? ' (semana de deload)' : ''}`);
    }
    lines.push(`Água hoje: ${ctx.waterToday} ml de ${ctx.nutritionPlan.waterMl || '?'} ml`);
    if (ctx.records.length) {
      const top = [...ctx.records].sort((a, b) => b.maxWeight - a.maxWeight).slice(0, 5);
      lines.push(`Recordes: ${top.map((r) => `${r.exerciseName} ${r.maxWeight}kg`).join(', ')}`);
    }
    lines.push(`Treinos registrados no total: ${ctx.history.length}`);
    return lines.join('\n');
  }

  /* Envia a pergunta da pessoa + o resumo do contexto pra API da
     Anthropic e devolve a resposta em texto. */
  async function ask(question) {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('Nenhuma chave de API configurada.');

    const ctx = await window.Coach.gatherContext();
    const contextSummary = buildContextSummary(ctx);

    const systemPrompt = `Você é um personal trainer virtual dentro do app Gym Pro, conversando em português do Brasil. Seja direto, encorajador e prático — respostas curtas (2-4 frases), sem enrolação. Use os dados reais da pessoa abaixo para personalizar sua resposta. Não invente números que não foram informados. Se não souber algo específico, diga isso com naturalidade.\n\nDados da pessoa:\n${contextSummary}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system: systemPrompt,
        messages: [{ role: 'user', content: question }]
      })
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const message = errBody?.error?.message || `Erro ${response.status}`;
      throw new Error(message);
    }

    const data = await response.json();
    const textBlock = data.content?.find((b) => b.type === 'text');
    return textBlock?.text || 'Não consegui gerar uma resposta agora.';
  }

  return { getApiKey, saveApiKey, isConfigured, ask };
})();

window.AICoach = AICoach;
