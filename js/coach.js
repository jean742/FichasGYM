/* ================================================================
   GYM PRO — coach.js
   O "Coach" analisa os dados reais da pessoa (programa, histórico,
   recordes, água, nutrição) e gera dicas e respostas personalizadas
   — sem precisar de nenhuma IA externa, funciona 100% offline.

   Se a pessoa configurar uma chave de API da Anthropic (Configurações
   → IA do Coach), as respostas de perguntas livres passam a ser
   geradas por um modelo de verdade (Claude) em vez de respostas
   prontas — veja js/ai-coach.js.
================================================================ */

const Coach = (() => {

  const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

  /* ----------------------------------------------------------------
     Reúne todos os dados relevantes de uma vez, para não repetir
     leituras do banco em cada gerador de dica.
  ---------------------------------------------------------------- */
  async function gatherContext() {
    const profile = await window.DB.getProfile();
    const program = await window.Program.getActiveProgram();
    const weekInfo = program ? window.Program.computeWeekInfo(program) : null;
    const history = await window.DB.getHistory();
    const waterToday = await window.DB.getWaterToday();
    const nutritionPlan = window.Nutrition.computePlan(profile);
    const records = await window.DB.getAllRecords();

    return { profile, program, weekInfo, history, waterToday, nutritionPlan, records };
  }

  function todayCode() {
    return WEEKDAYS[new Date().getDay()];
  }

  function daysTrainedThisWeek(history) {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const days = new Set();
    history.forEach((h) => { if (new Date(h.date) >= startOfWeek) days.add(new Date(h.date).toDateString()); });
    return days.size;
  }

  function volumeInRange(history, daysBack, offsetDays = 0) {
    const now = Date.now();
    const end = now - offsetDays * 86400000;
    const start = end - daysBack * 86400000;
    return history
      .filter((h) => { const t = new Date(h.date).getTime(); return t >= start && t < end; })
      .reduce((sum, h) => sum + (h.volume || 0), 0);
  }

  function calcStreak(history) {
    const days = new Set(history.map((h) => new Date(h.date).toDateString()));
    let streak = 0;
    let cursor = new Date();
    while (days.has(cursor.toDateString())) { streak++; cursor.setDate(cursor.getDate() - 1); }
    return streak;
  }

  /* ================================================================
     GERADORES DE INSIGHT — cada um analisa um aspecto e retorna
     { icon, text, priority } ou null se não for relevante agora.
     Quanto maior a prioridade, mais em destaque a dica aparece.
  ================================================================ */
  function insightDeload(ctx) {
    if (!ctx.weekInfo?.isDeloadWeek) return null;
    return { icon: '🔋', priority: 95,
      text: 'Essa é sua semana de deload. Reduzi as cargas de propósito — aproveite pra treinar com boa técnica e chegar descansado(a) pro próximo ciclo.' };
  }

  function insightMissedDays(ctx) {
    const trained = daysTrainedThisWeek(ctx.history);
    const goal = ctx.profile.weekDaysGoal || 5;
    const dayOfWeek = new Date().getDay(); // 0=dom
    if (trained === 0 && dayOfWeek >= 3) {
      return { icon: '👀', priority: 90, text: 'Você ainda não treinou essa semana. Sem pressão, mas bora encaixar um treino hoje ou amanhã?' };
    }
    if (trained >= goal) {
      return { icon: '🏆', priority: 60, text: `Você já bateu sua meta de ${goal} dias essa semana! Se treinar mais, é bônus — meu respeito.` };
    }
    return null;
  }

  function insightRotationSoon(ctx) {
    if (!ctx.weekInfo) return null;
    if (ctx.weekInfo.daysUntilRotation <= 3 && !ctx.weekInfo.isDeloadWeek) {
      return { icon: '🔄', priority: 55, text: `Faltam ${ctx.weekInfo.daysUntilRotation} dia(s) pra sua ficha renovar os exercícios. Ótima hora pra tentar bater algum recorde antes da troca.` };
    }
    return null;
  }

  function insightNewRecord(ctx) {
    const recent = ctx.records.filter((r) => {
      const days = (Date.now() - new Date(r.date).getTime()) / 86400000;
      return days <= 7;
    });
    if (recent.length === 0) return null;
    const names = recent.slice(0, 2).map((r) => r.exerciseName).join(' e ');
    return { icon: '🥇', priority: 85, text: `Recorde pessoal essa semana em ${names}! Isso é evolução de verdade, continue assim.` };
  }

  function insightStreak(ctx) {
    const streak = calcStreak(ctx.history);
    if (streak >= 3) {
      return { icon: '🔥', priority: 70, text: `${streak} dias seguidos treinando! Constância é o que mais importa a longo prazo — muito bom.` };
    }
    return null;
  }

  function insightVolumeTrend(ctx) {
    const thisWeek = volumeInRange(ctx.history, 7, 0);
    const lastWeek = volumeInRange(ctx.history, 7, 7);
    if (thisWeek === 0 || lastWeek === 0) return null;
    const change = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
    if (change >= 10) return { icon: '📈', priority: 65, text: `Seu volume total subiu ${change}% essa semana comparado à anterior. Está funcionando!` };
    if (change <= -20) return { icon: '📉', priority: 50, text: `Seu volume caiu ${Math.abs(change)}% essa semana. Tudo bem, semanas mais leves acontecem — só fica de olho se virar tendência.` };
    return null;
  }

  function insightWater(ctx) {
    const target = ctx.nutritionPlan.waterMl;
    if (!target) return null;
    const percent = Math.round((ctx.waterToday / target) * 100);
    const hour = new Date().getHours();
    if (hour >= 18 && percent < 50) {
      return { icon: '💧', priority: 45, text: `Você bebeu só ${percent}% da sua meta de água hoje. Ainda dá tempo de recuperar.` };
    }
    if (percent >= 100) {
      return { icon: '💧', priority: 40, text: 'Meta de água batida hoje! Hidratação em dia ajuda demais na recuperação.' };
    }
    return null;
  }

  function insightGeneric(ctx) {
    const byGoal = {
      hipertrofia: 'Foco em técnica e amplitude completa — hipertrofia se constrói com consistência, não com treinos perfeitos.',
      emagrecimento: 'Lembre-se: o déficit calórico é o que mais importa pro emagrecimento. O treino ajuda a preservar músculo no caminho.',
      forca: 'Força é uma habilidade — quanto mais você pratica o movimento com boa técnica, mais forte fica.',
      resistencia: 'Resistência se constrói aos poucos. Não force demais numa sessão só — a consistência ao longo das semanas é o que conta.',
      saude: 'Treinar por saúde é uma maratona, não corrida de 100m. Qualquer treino feito é melhor que nenhum.'
    };
    return { icon: '💬', priority: 10, text: byGoal[ctx.profile.goal] || 'Continue firme — cada treino é um investimento no seu futuro.' };
  }

  /* ----------------------------------------------------------------
     Roda todos os geradores, ordena por prioridade e devolve a lista
     (a primeira é a "manchete", exibida em destaque no card da Início)
  ---------------------------------------------------------------- */
  async function getInsights() {
    const ctx = await gatherContext();
    const generators = [
      insightDeload, insightMissedDays, insightNewRecord, insightStreak,
      insightRotationSoon, insightVolumeTrend, insightWater, insightGeneric
    ];
    const insights = generators.map((fn) => fn(ctx)).filter(Boolean);
    insights.sort((a, b) => b.priority - a.priority);
    return insights.length ? insights : [insightGeneric(ctx)];
  }

  /* ================================================================
     PERGUNTAS PRONTAS (funcionam sempre, mesmo sem IA configurada)
  ================================================================ */
  async function answerToday() {
    const dayPlan = await window.DB.getWorkoutDay(todayCode());
    if (!dayPlan.exercises || dayPlan.exercises.length === 0) {
      return 'Hoje não tem treino planejado na sua ficha atual. Pode ser um dia de descanso, ou você escolhe algo na biblioteca se quiser treinar mesmo assim.';
    }
    const names = dayPlan.exercises.map((e) => e.name).join(', ');
    return `Hoje é dia de "${dayPlan.name || 'treino'}": ${names}.`;
  }

  async function answerWeekProgress() {
    const ctx = await gatherContext();
    const trained = daysTrainedThisWeek(ctx.history);
    const goal = ctx.profile.weekDaysGoal || 5;
    const volume = volumeInRange(ctx.history, 7, 0);
    let extra = '';
    if (ctx.weekInfo) extra = ` Você está na semana ${ctx.weekInfo.weekInCycle} de ${ctx.weekInfo.cycleWeeks} do seu mesociclo${ctx.weekInfo.isDeloadWeek ? ' (semana de deload)' : ''}.`;
    return `Essa semana você treinou ${trained} de ${goal} dias planejados, somando ${Math.round(volume).toLocaleString('pt-BR')} kg de volume total.${extra}`;
  }

  async function answerReadyToProgress() {
    return 'Toda semana eu já ajusto a carga sugerida da sua ficha automaticamente: se você bateu a meta de repetições em todas as séries de um exercício, sugiro subir o peso na próxima vez; se não bateu, sugiro repetir o mesmo peso pra consolidar. Pode confiar no número que já vem preenchido — ele já considera seu histórico.';
  }

  async function answerWaterStatus() {
    const ctx = await gatherContext();
    const target = ctx.nutritionPlan.waterMl;
    if (!target) return 'Cadastre seu peso nas Configurações pra eu calcular sua meta de água.';
    const percent = Math.round((ctx.waterToday / target) * 100);
    return `Você já bebeu ${ctx.waterToday} ml hoje, de uma meta de ${target} ml (${percent}%).`;
  }

  async function answerRecords() {
    const ctx = await gatherContext();
    if (ctx.records.length === 0) return 'Você ainda não tem recordes registrados — eles aparecem automaticamente conforme você registra cargas nos treinos.';
    const top = [...ctx.records].sort((a, b) => b.maxWeight - a.maxWeight).slice(0, 5);
    const lines = top.map((r) => `${r.exerciseName}: ${r.maxWeight} kg`).join('; ');
    return `Seus recordes atuais: ${lines}.`;
  }

  const QUICK_QUESTIONS = [
    { id: 'today', label: 'O que eu treino hoje?', handler: answerToday },
    { id: 'week', label: 'Como está minha semana?', handler: answerWeekProgress },
    { id: 'progress', label: 'Estou pronto pra subir a carga?', handler: answerReadyToProgress },
    { id: 'water', label: 'Estou bebendo água suficiente?', handler: answerWaterStatus },
    { id: 'records', label: 'Quais são meus recordes?', handler: answerRecords }
  ];

  return { gatherContext, getInsights, QUICK_QUESTIONS };
})();

window.Coach = Coach;
