/* ================================================================
   GYM PRO — program.js
   Transforma a "ficha" de uma lista solta de exercícios em um
   PROGRAMA de treino de verdade, com lógica de periodização simples:

   • Os exercícios de cada dia ficam FIXOS por um mesociclo (padrão:
     5 semanas) — isso é o que permite comparar carga/reps de uma
     semana pra outra e ver evolução real. Só trocam quando um novo
     mesociclo começa (a pessoa decide, ou o app avisa quando o ciclo
     acaba).
   • Toda semana, o app recalcula sozinho a carga sugerida de cada
     exercício com base no que a pessoa REALMENTE registrou na sessão
     anterior (progressão dupla: bateu a meta de reps? sugere subir
     um pouco a carga. Não bateu? sugere repetir o mesmo peso).
   • A última semana de cada mesociclo é automaticamente uma semana
     de "deload" (menos volume/carga), para recuperação.
================================================================ */

const Program = (() => {

  const CYCLE_WEEKS = 5;          // duração do mesociclo (4 semanas de progressão + 1 de deload)
  const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
  const MIN_WEIGHT_INCREMENT = 1; // menor incremento de carga sugerido (kg)

  /* ----------------------------------------------------------------
     Estado do programa: { startDate, cycleWeeks, params, lastRefreshedAt }
  ---------------------------------------------------------------- */
  async function getActiveProgram() {
    return window.DB.getProgram();
  }

  /* Cria (ou reinicia) um programa novo — chamado pelo generator.js
     assim que uma ficha nova é gerada. */
  async function startNewProgram(generatorParams) {
    const program = {
      startDate: new Date().toISOString(),
      cycleWeeks: CYCLE_WEEKS,
      params: generatorParams,
      lastRefreshedAt: new Date().toISOString()
    };
    await window.DB.saveProgram(program);
    return program;
  }

  /* ----------------------------------------------------------------
     Calcula em que semana do mesociclo a pessoa está, se é semana de
     deload, e quantos dias faltam até o ciclo terminar (e por tanto
     até fazer sentido gerar uma ficha nova com exercícios renovados).
  ---------------------------------------------------------------- */
  function computeWeekInfo(program) {
    if (!program) return null;

    const start = new Date(program.startDate);
    const now = new Date();
    const cycleWeeks = program.cycleWeeks || CYCLE_WEEKS;
    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    const totalDaysElapsed = Math.floor((now - start) / MS_PER_DAY);
    const totalCycleDays = cycleWeeks * 7;
    const daysIntoCycle = totalDaysElapsed % totalCycleDays;

    const weeksElapsed = Math.floor(totalDaysElapsed / 7);
    const weekInCycle = Math.floor(daysIntoCycle / 7) + 1; // 1-indexado
    const cycleNumber = Math.floor(totalDaysElapsed / totalCycleDays) + 1;
    const isDeloadWeek = weekInCycle === cycleWeeks;
    const isCycleComplete = totalDaysElapsed > 0 && daysIntoCycle === 0;
    const daysUntilRotation = totalCycleDays - daysIntoCycle;

    return {
      weeksElapsed, weekInCycle, cycleWeeks, cycleNumber,
      isDeloadWeek, isCycleComplete,
      daysUntilRotation
    };
  }

  /* ----------------------------------------------------------------
     PROGRESSÃO DUPLA (double progression) — a lógica central de
     "a ficha evolui com a pessoa":

     1) Procura a sessão mais recente no histórico em que esse
        exercício específico foi feito.
     2) Se em TODAS as séries registradas a pessoa bateu (ou passou)
        a meta de repetições com aquele peso → sugere aumentar a
        carga um pouco na próxima vez (progressão de carga).
     3) Se não bateu a meta em alguma série → sugere repetir o mesmo
        peso (tentar de novo antes de subir).
     4) Sem histórico ainda → usa o recorde pessoal (90%) como ponto
        de partida, ou deixa em branco.
     5) Em semana de deload, reduz a sugestão de carga (~10%) e uma
        série a menos, para facilitar a recuperação.
  ---------------------------------------------------------------- */
  async function computeSuggestedSets(exerciseId, baseSetsCount, targetReps, isDeloadWeek) {
    const history = await window.DB.getHistory();

    // Procura a sessão mais recente (histórico já vem ordenado por data crescente)
    let lastEntry = null;
    for (let i = history.length - 1; i >= 0; i--) {
      const found = (history[i].exercises || []).find((ex) => ex.exerciseId === exerciseId);
      if (found) { lastEntry = found; break; }
    }

    let suggestedWeight = null;
    let suggestedReps = targetReps;

    if (lastEntry && lastEntry.sets?.length) {
      const loggedSets = lastEntry.sets.filter((s) => s.completed && s.weight != null && s.reps != null);
      if (loggedSets.length > 0) {
        const lastWeight = Math.max(...loggedSets.map((s) => s.weight));
        const metTargetEverywhere = loggedSets.every((s) => s.reps >= targetReps);

        if (metTargetEverywhere) {
          // Bateu a meta em todas as séries -> sugere subir a carga
          const increment = Math.max(MIN_WEIGHT_INCREMENT, Math.round(lastWeight * 0.025 * 2) / 2);
          suggestedWeight = Math.round((lastWeight + increment) * 2) / 2; // arredonda pra 0.5kg
        } else {
          // Não bateu em alguma série -> repete o mesmo peso pra consolidar
          suggestedWeight = lastWeight;
        }
      }
    }

    // Sem histórico ainda: usa o recorde pessoal como referência inicial
    if (suggestedWeight === null) {
      const record = await window.DB.getRecord(exerciseId);
      if (record && record.maxWeight) {
        suggestedWeight = Math.round(record.maxWeight * 0.9 * 2) / 2;
      }
    }

    let setsCount = baseSetsCount;
    if (isDeloadWeek) {
      setsCount = Math.max(2, baseSetsCount - 1);
      if (suggestedWeight !== null) suggestedWeight = Math.round(suggestedWeight * 0.9 * 2) / 2;
    }

    return {
      setsCount,
      sets: Array.from({ length: setsCount }, () => ({
        weight: suggestedWeight,
        reps: suggestedReps,
        rpe: null,
        completed: false
      }))
    };
  }

  /* ----------------------------------------------------------------
     Roda uma vez por semana (verificado no boot do app): recalcula a
     sugestão de carga/reps de TODOS os exercícios da ficha atual,
     preparando a próxima sessão de cada dia com base no progresso
     real registrado. Não mexe nos dias que estão vazios.
  ---------------------------------------------------------------- */
  async function maybeRefreshWeek() {
    const program = await getActiveProgram();
    if (!program) return { refreshed: false };

    const lastRefreshed = new Date(program.lastRefreshedAt || program.startDate);
    const daysSinceRefresh = (Date.now() - lastRefreshed.getTime()) / (24 * 60 * 60 * 1000);
    if (daysSinceRefresh < 7) return { refreshed: false, program };

    const weekInfo = computeWeekInfo(program);
    const allDays = await window.DB.getAllWorkoutDays();

    for (const dayPlan of allDays) {
      if (!dayPlan.exercises || dayPlan.exercises.length === 0) continue;

      const updatedExercises = [];
      for (const ex of dayPlan.exercises) {
        const currentReps = ex.sets?.[0]?.reps || 10;
        const currentSetsCount = ex.sets?.length || 3;
        const { sets } = await computeSuggestedSets(ex.exerciseId, currentSetsCount, currentReps, weekInfo.isDeloadWeek);
        updatedExercises.push({ ...ex, sets });
      }
      await window.DB.saveWorkoutDay(dayPlan.day, dayPlan.name, updatedExercises);
    }

    program.lastRefreshedAt = new Date().toISOString();
    await window.DB.saveProgram(program);

    return { refreshed: true, program, weekInfo };
  }

  return {
    CYCLE_WEEKS,
    getActiveProgram, startNewProgram,
    computeWeekInfo, computeSuggestedSets, maybeRefreshWeek
  };
})();

window.Program = Program;
