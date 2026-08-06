/* ================================================================
   GYM PRO — generator.js
   Gerador automático de fichas de treino.

   Recebe os parâmetros informados pela pessoa (idade, peso, altura,
   objetivo, dias disponíveis na semana e tempo de treino por sessão)
   e devolve uma ficha completa: qual divisão de treino (split) usar,
   quais exercícios entram em cada dia, e quantas séries/repetições
   alvo para cada um — pronta para ser salva no IndexedDB via db.js.

   Não é um substituto para orientação de um profissional de
   Educação Física — é um ponto de partida sensato baseado em
   heurísticas comuns de prescrição de treino.
================================================================ */

const Generator = (() => {

  const WEEKDAY_ORDER = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];

  /* Equipamentos considerados disponíveis para quem treina em casa
     (calistenia + elástico — o mínimo que não depende de academia). */
  const HOME_EQUIPMENT = ['Peso Corporal', 'Elástico'];

  /* Cada nível de experiência libera progressivamente exercícios
     mais técnicos/exigentes cadastrados como "Intermediário" ou
     "Avançado" na biblioteca. */
  const EXPERIENCE_LEVELS = {
    iniciante:     ['Iniciante'],
    intermediario: ['Iniciante', 'Intermediário'],
    avancado:      ['Iniciante', 'Intermediário', 'Avançado']
  };

  /* ----------------------------------------------------------------
     1) DIVISÕES DE TREINO (splits) por número de dias disponíveis.
     Cada dia da divisão é uma lista de grupos musculares trabalhados.
  ---------------------------------------------------------------- */
  const SPLIT_TEMPLATES = {
    1: [
      { label: 'Corpo Inteiro', groups: ['Pernas', 'Peito', 'Costas', 'Ombro', 'Bíceps', 'Tríceps', 'Abdômen'] }
    ],
    2: [
      { label: 'Superior', groups: ['Peito', 'Costas', 'Ombro', 'Bíceps', 'Tríceps'] },
      { label: 'Inferior + Abdômen', groups: ['Pernas', 'Panturrilha', 'Abdômen'] }
    ],
    3: [
      { label: 'Peito, Ombro e Tríceps', groups: ['Peito', 'Ombro', 'Tríceps'] },
      { label: 'Costas e Bíceps', groups: ['Costas', 'Bíceps'] },
      { label: 'Pernas e Abdômen', groups: ['Pernas', 'Panturrilha', 'Abdômen'] }
    ],
    4: [
      { label: 'Peito e Tríceps', groups: ['Peito', 'Tríceps'] },
      { label: 'Costas e Bíceps', groups: ['Costas', 'Bíceps'] },
      { label: 'Pernas e Panturrilha', groups: ['Pernas', 'Panturrilha'] },
      { label: 'Ombro e Abdômen', groups: ['Ombro', 'Abdômen'] }
    ],
    5: [
      { label: 'Peito', groups: ['Peito'] },
      { label: 'Costas', groups: ['Costas'] },
      { label: 'Pernas e Panturrilha', groups: ['Pernas', 'Panturrilha'] },
      { label: 'Ombro e Abdômen', groups: ['Ombro', 'Abdômen'] },
      { label: 'Bíceps e Tríceps', groups: ['Bíceps', 'Tríceps'] }
    ],
    6: [
      { label: 'Peito e Tríceps', groups: ['Peito', 'Tríceps'] },
      { label: 'Costas e Bíceps', groups: ['Costas', 'Bíceps'] },
      { label: 'Pernas e Panturrilha', groups: ['Pernas', 'Panturrilha'] },
      { label: 'Ombro e Abdômen', groups: ['Ombro', 'Abdômen'] },
      { label: 'Peito e Tríceps (B)', groups: ['Peito', 'Tríceps'] },
      { label: 'Costas e Bíceps (B)', groups: ['Costas', 'Bíceps'] }
    ],
    7: [
      { label: 'Peito e Tríceps', groups: ['Peito', 'Tríceps'] },
      { label: 'Costas e Bíceps', groups: ['Costas', 'Bíceps'] },
      { label: 'Pernas e Panturrilha', groups: ['Pernas', 'Panturrilha'] },
      { label: 'Ombro e Abdômen', groups: ['Ombro', 'Abdômen'] },
      { label: 'Peito e Tríceps (B)', groups: ['Peito', 'Tríceps'] },
      { label: 'Costas e Bíceps (B)', groups: ['Costas', 'Bíceps'] },
      { label: 'Cardio e Mobilidade', groups: ['Cardio', 'Abdômen'] }
    ]
  };

  /* ----------------------------------------------------------------
     2) PARÂMETROS DE TREINO POR OBJETIVO
     (séries, faixa de repetições alvo e RPE alvo sugerido)
  ---------------------------------------------------------------- */
  const GOAL_PARAMS = {
    hipertrofia:   { sets: 4, reps: 10, rpe: 8, cardioExtra: false },
    emagrecimento: { sets: 3, reps: 15, rpe: 7, cardioExtra: true },
    forca:         { sets: 5, reps: 5,  rpe: 9, cardioExtra: false },
    resistencia:   { sets: 3, reps: 18, rpe: 6, cardioExtra: true },
    saude:         { sets: 3, reps: 12, rpe: 6, cardioExtra: false }
  };

  /* ----------------------------------------------------------------
     3) QUANTIDADE DE EXERCÍCIOS POR SESSÃO conforme o tempo disponível
     (estimativa: ~3min de execução + ~2min de descanso por série)
  ---------------------------------------------------------------- */
  function exercisesForMinutes(minutes) {
    if (minutes <= 30) return 4;
    if (minutes <= 45) return 5;
    if (minutes <= 60) return 6;
    if (minutes <= 75) return 7;
    return 8; // 90+ minutos
  }

  /* ----------------------------------------------------------------
     4) Combina o nível de experiência informado com um teto de
     segurança por idade — mesmo quem se declara "Avançado" mas tem
     50+ anos ou menos de 16 anos não recebe exercícios "Avançado"
     por padrão (podem ser trocados manualmente na biblioteca depois).
  ---------------------------------------------------------------- */
  function resolveAllowedLevels(experience, age, goal) {
    let levels = EXPERIENCE_LEVELS[experience] || EXPERIENCE_LEVELS.iniciante;

    const ageRestricted = age && (age >= 50 || age < 16) && goal !== 'forca';
    if (ageRestricted && levels.includes('Avançado')) {
      levels = levels.filter((l) => l !== 'Avançado');
    }
    return levels;
  }

  /* ----------------------------------------------------------------
     5) Filtro de equipamento conforme o local de treino escolhido.
     'casa' → apenas peso corporal / elástico. 'academia' → tudo.
  ---------------------------------------------------------------- */
  function resolveAllowedEquipment(location) {
    return location === 'casa' ? HOME_EQUIPMENT : null; // null = sem restrição
  }

  /* ----------------------------------------------------------------
     Seleciona N exercícios distribuídos entre os grupos musculares
     do dia, priorizando exercícios compostos (que aparecem primeiro
     no cadastro de cada grupo) antes dos de isolamento.
  ---------------------------------------------------------------- */
  function pickExercisesForDay(groups, count, allowedLevels, allowedEquipment) {
    const pool = groups.map((group) =>
      window.EXERCISES.filter((ex) =>
        ex.group === group &&
        allowedLevels.includes(ex.level) &&
        (!allowedEquipment || allowedEquipment.includes(ex.equipment))
      )
    );

    const picked = [];
    let round = 0;
    // Distribui em "rodadas": 1 exercício de cada grupo por vez,
    // até atingir a quantidade desejada — garante equilíbrio entre grupos.
    while (picked.length < count && pool.some((list) => list.length > round)) {
      for (const list of pool) {
        if (picked.length >= count) break;
        if (list[round]) picked.push(list[round]);
      }
      round++;
    }
    return picked;
  }

  /* ----------------------------------------------------------------
     Monta o array de séries padrão para um exercício recém-gerado.
     O peso fica em branco (a pessoa preenche na primeira execução);
     as repetições já vêm com o alvo sugerido para o objetivo.
  ---------------------------------------------------------------- */
  function buildDefaultSets(setsCount, targetReps) {
    return Array.from({ length: setsCount }, () => ({
      weight: null,
      reps: targetReps,
      rpe: null,
      completed: false
    }));
  }

  /* ----------------------------------------------------------------
     FUNÇÃO PRINCIPAL — gera a ficha completa
     params: {
       age, weight, height, goal,
       selectedDays: ['seg','qua','sex', ...]  (códigos de dia),
       minutes: 60
     }
     Retorna: [{ day, name, exercises: [...] }, ...] pronto para salvar
  ---------------------------------------------------------------- */
  function generatePlan(params) {
    const { age, goal, minutes, experience, location } = params;

    // Ordena os dias escolhidos na ordem natural da semana (seg → dom)
    const selectedDays = [...params.selectedDays].sort(
      (a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b)
    );
    const numDays = selectedDays.length;

    const template = SPLIT_TEMPLATES[numDays] || SPLIT_TEMPLATES[3];
    const goalParams = GOAL_PARAMS[goal] || GOAL_PARAMS.hipertrofia;
    const exerciseCount = exercisesForMinutes(minutes);
    const allowedLevels = resolveAllowedLevels(experience, age, goal);
    const allowedEquipment = resolveAllowedEquipment(location);

    const plan = selectedDays.map((dayCode, index) => {
      const splitDay = template[index % template.length];

      // Reserva 1 vaga para cardio extra no fim do dia se o objetivo pedir
      const strengthSlots = goalParams.cardioExtra ? Math.max(1, exerciseCount - 1) : exerciseCount;

      let dayExercises = pickExercisesForDay(splitDay.groups, strengthSlots, allowedLevels, allowedEquipment)
        .map((ex) => ({
          exerciseId: ex.id,
          name: ex.name,
          group: ex.group,
          equipment: ex.equipment,
          image: ex.image,
          notes: '',
          sets: buildDefaultSets(goalParams.sets, goalParams.reps)
        }));

      if (goalParams.cardioExtra) {
        const cardioOptions = window.EXERCISES.filter((ex) =>
          ex.group === 'Cardio' && (!allowedEquipment || allowedEquipment.includes(ex.equipment))
        );
        const cardioPick = cardioOptions[index % Math.max(1, cardioOptions.length)];
        if (cardioPick) {
          dayExercises.push({
            exerciseId: cardioPick.id,
            name: cardioPick.name,
            group: cardioPick.group,
            equipment: cardioPick.equipment,
            image: cardioPick.image,
            notes: '15–20 min em intensidade moderada',
            sets: buildDefaultSets(1, null)
          });
        }
      }

      return { day: dayCode, name: splitDay.label, exercises: dayExercises };
    });

    return plan;
  }

  /* ----------------------------------------------------------------
     Gera a ficha E já salva no IndexedDB (sobrescrevendo apenas os
     dias selecionados — os demais dias da semana ficam intactos).
  ---------------------------------------------------------------- */
  async function generateAndSave(params) {
    const plan = generatePlan(params);
    for (const dayPlan of plan) {
      await window.DB.saveWorkoutDay(dayPlan.day, dayPlan.name, dayPlan.exercises);
    }
    // Também guarda a meta semanal de dias treinados, usada na Início
    const profile = await window.DB.getProfile();
    profile.weekDaysGoal = params.selectedDays.length;
    profile.sessionMinutes = params.minutes;
    if (params.age) profile.age = params.age;
    if (params.weight) profile.weight = params.weight;
    if (params.height) profile.height = params.height;
    if (params.goal) profile.goal = params.goal;
    if (params.experience) profile.experience = params.experience;
    if (params.location) profile.trainingLocation = params.location;
    await window.DB.saveProfile(profile);

    return plan;
  }

  return { generatePlan, generateAndSave, SPLIT_TEMPLATES, GOAL_PARAMS };
})();

window.Generator = Generator;
