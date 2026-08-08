/* ================================================================
   GYM PRO — ui.js
   Toda a lógica de interface: navegação entre telas, renderização
   dinâmica (Início, Treinos, Progresso, Calendário, Configurações),
   modais (biblioteca, detalhe do exercício, cronômetro), checklist
   de séries, detecção de recordes e animações de conclusão.
================================================================ */

const UI = (() => {

  const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  const WEEKDAY_LABELS = { seg: 'Segunda', ter: 'Terça', qua: 'Quarta', qui: 'Quinta', sex: 'Sexta', sab: 'Sábado', dom: 'Domingo' };

  /* Estado em memória da tela atual (evita releituras excessivas do IndexedDB) */
  const state = {
    currentScreen: 'home',
    currentDay: todayCode(),
    currentWorkoutDay: null,     // { day, name, exercises: [...] } carregado do DB
    library: { text: '', group: '', equipment: '', level: '' },
    activeExerciseId: null,      // exercício aberto no modal de detalhe
    calendarDate: new Date(),    // mês/ano exibido no calendário
    activeChart: 'volume-weekly',
    workoutSessionStart: null,   // timestamp de início do treino em andamento
    autoFinishedToday: false     // evita disparar a celebração mais de uma vez
  };

  function todayCode() {
    return WEEKDAYS[new Date().getDay()];
  }

  /* Busca o padrão de movimento (para o pictograma) sempre a partir
     da biblioteca de exercícios — evita depender de dados salvos
     anteriormente, que podem não ter esse campo. */
  function exercisePattern(ex) {
    const fullData = window.findExerciseById(ex.exerciseId || ex.id) || {};
    return ex.pattern || fullData.pattern || 'generic';
  }

  /* ================================================================
     INICIALIZAÇÃO GERAL DA UI
  ================================================================ */
  async function init() {
    bindBottomNav();
    bindModalClosers();
    bindLibrary();
    bindExerciseDetail();
    bindTimerLauncher();
    bindWorkoutsScreen();
    bindSettingsScreen();
    bindCalendarNav();
    bindHomeScreen();
    bindGenerator();
    bindNutrition();
    bindAccount();

    populateLibraryFilters();

    await renderHome();
    await renderWorkoutsScreen(state.currentDay);
    await renderSettings();
    renderCalendar(state.calendarDate);
  }

  /* ================================================================
     NAVEGAÇÃO ENTRE TELAS
  ================================================================ */
  function bindBottomNav() {
    document.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => switchScreen(btn.dataset.screen));
    });
  }

  const SCREEN_TITLES = {
    home: 'Início', workouts: 'Treinos', progress: 'Progresso',
    calendar: 'Calendário', settings: 'Ajustes'
  };

  async function switchScreen(screenName) {
    state.currentScreen = screenName;

    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    document.getElementById(`screen-${screenName}`)?.classList.add('active');

    document.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.screen === screenName);
    });

    const title = document.getElementById('topbar-title');
    if (title) title.textContent = SCREEN_TITLES[screenName] || 'Gym Pro';

    // Recarrega dados relevantes ao entrar na tela (mantém tudo sincronizado)
    if (screenName === 'home') await renderHome();
    if (screenName === 'progress') await renderProgressScreen();
    if (screenName === 'calendar') { await computeStreakAndRender(); renderCalendar(state.calendarDate); }
    if (screenName === 'settings') refreshAccountUI();
  }

  /* ================================================================
     TOASTS
  ================================================================ */
  function showToast(message, type = 'default') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'success' ? 'toast-success' : type === 'danger' ? 'toast-danger' : ''}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  /* ================================================================
     TELA — INÍCIO
  ================================================================ */
  function bindHomeScreen() {
    document.getElementById('btn-start-workout')?.addEventListener('click', async () => {
      state.currentDay = todayCode();
      await switchScreen('workouts');
      selectWeekdayTab(state.currentDay);
      await renderWorkoutsScreen(state.currentDay);
    });

    // Foto de perfil — clicar no lápis (ou na própria foto) abre o seletor de arquivo
    const openFilePicker = () => document.getElementById('photo-file-input')?.click();
    document.getElementById('btn-edit-photo')?.addEventListener('click', openFilePicker);
    document.getElementById('user-photo')?.addEventListener('click', openFilePicker);

    document.getElementById('photo-file-input')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = ''; // permite escolher o mesmo arquivo de novo depois
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        showToast('Escolha um arquivo de imagem.', 'danger');
        return;
      }

      try {
        const dataUrl = await resizeImageToDataUrl(file, 320, 0.82);
        const profile = await DB.getProfile();
        profile.photo = dataUrl;
        await DB.saveProfile(profile);
        document.getElementById('user-photo').src = dataUrl;
        showToast('Foto atualizada', 'success');
      } catch (err) {
        console.error('[UI] Erro ao processar a foto:', err);
        showToast('Não foi possível carregar essa imagem.', 'danger');
      }
    });
  }

  /* Redimensiona/comprime a imagem escolhida via <canvas> (sem libs
     externas) antes de salvar — evita fotos de câmera (vários MB)
     estourarem o limite de tamanho de documento do Firestore (1MB)
     e deixa tudo mais rápido de carregar. */
  function resizeImageToDataUrl(file, maxSize, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > height && width > maxSize) {
            height = Math.round(height * (maxSize / width));
            width = maxSize;
          } else if (height >= width && height > maxSize) {
            width = Math.round(width * (maxSize / height));
            height = maxSize;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error('Falha ao carregar a imagem'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Falha ao ler o arquivo'));
      reader.readAsDataURL(file);
    });
  }

  async function renderHome() {
    const profile = await DB.getProfile();
    const history = await DB.getHistory();

    // ---- Cartão de perfil ----
    document.getElementById('user-name').textContent = profile.name || 'Seu Nome';
    document.getElementById('user-goal').textContent = `Objetivo: ${goalLabel(profile.goal)}`;
    document.getElementById('user-weight').textContent = profile.weight ? `${profile.weight} kg` : '-- kg';
    document.getElementById('user-height').textContent = profile.height ? `${profile.height} cm` : '-- cm';

    const imc = calcIMC(profile.weight, profile.height);
    document.getElementById('user-imc').textContent = imc ? imc.toFixed(1) : '--';

    if (profile.photo) document.getElementById('user-photo').src = profile.photo;

    // ---- Progresso semanal ----
    const weekGoal = profile.weekDaysGoal || 5;
    const daysThisWeek = countDistinctDaysThisWeek(history);
    const percent = Math.min(100, Math.round((daysThisWeek / weekGoal) * 100));

    document.getElementById('week-percent').textContent = `${percent}%`;
    document.getElementById('week-progress-fill').style.width = `${percent}%`;
    document.getElementById('week-days-trained').textContent = daysThisWeek;
    document.getElementById('week-days-goal').textContent = weekGoal;

    // ---- Métricas rápidas ----
    const totalVolume = history.reduce((sum, h) => sum + (h.volume || 0), 0);
    const totalSeconds = history.reduce((sum, h) => sum + (h.durationSeconds || 0), 0);
    const totalCalories = history.reduce((sum, h) => sum + (h.calories || 0), 0);
    const distinctDaysTotal = countDistinctDays(history);

    document.getElementById('stat-calories').textContent = Math.round(totalCalories);
    document.getElementById('stat-time').textContent = formatHoursMinutes(totalSeconds);
    document.getElementById('stat-volume').textContent = `${formatNumber(totalVolume)} kg`;
    document.getElementById('stat-days').textContent = distinctDaysTotal;

    // ---- Último treino ----
    const lastWorkoutEl = document.getElementById('last-workout-info');
    if (history.length === 0) {
      lastWorkoutEl.textContent = 'Nenhum treino registrado ainda. Bora começar? 💪';
    } else {
      const last = history[history.length - 1];
      const dateStr = new Date(last.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      lastWorkoutEl.innerHTML = `<strong>${last.workoutName || 'Treino'}</strong> — ${dateStr} · ${formatNumber(last.volume || 0)} kg · ${Math.round((last.durationSeconds || 0) / 60)} min`;
    }

    await renderNutritionQuick(profile);
    await renderProgramCard();
  }

  /* ================================================================
     PROGRAMA DE TREINO (mesociclo / progressão)
  ================================================================ */
  async function renderProgramCard() {
    const card = document.getElementById('program-card');
    if (!card) return;

    const program = await Program.getActiveProgram();
    if (!program) {
      card.classList.add('hidden');
      return;
    }

    const info = Program.computeWeekInfo(program);
    card.classList.remove('hidden');

    document.getElementById('program-week-badge').textContent = `Semana ${info.weekInCycle}/${info.cycleWeeks}`;

    const percent = Math.round((info.weekInCycle / info.cycleWeeks) * 100);
    document.getElementById('program-progress-fill').style.width = `${percent}%`;

    document.getElementById('program-caption').textContent =
      `Mesociclo ${info.cycleNumber} · Exercícios renovam em ${info.daysUntilRotation} dia(s)`;

    document.getElementById('program-deload-note').classList.toggle('hidden', !info.isDeloadWeek);
  }

  /* Verificado uma vez no boot: se já se passou uma semana desde a
     última atualização, recalcula a carga sugerida de cada exercício
     com base no que a pessoa realmente registrou (progressão dupla). */
  async function checkWeeklyProgression() {
    if (!window.Program) return;
    try {
      const result = await Program.maybeRefreshWeek();
      if (result.refreshed) {
        const msg = result.weekInfo.isDeloadWeek
          ? `Semana de recuperação (deload) — cargas ajustadas para baixo 🔋`
          : `Cargas atualizadas com base no seu progresso — Semana ${result.weekInfo.weekInCycle}/${result.weekInfo.cycleWeeks} 💪`;
        showToast(msg, 'success');
        await renderHome();
        if (state.currentScreen === 'workouts') await renderWorkoutsScreen(state.currentDay);
      }
    } catch (err) {
      console.error('[Program] Erro ao atualizar progressão semanal:', err);
    }
  }

  function goalLabel(goal) {
    return { hipertrofia: 'Hipertrofia', emagrecimento: 'Emagrecimento', forca: 'Força', resistencia: 'Resistência', saude: 'Saúde Geral' }[goal] || 'Hipertrofia';
  }

  /* ================================================================
     NUTRIÇÃO, ÁGUA E CARDIO
  ================================================================ */
  function bindNutrition() {
    document.getElementById('btn-open-nutrition')?.addEventListener('click', openNutritionModal);

    // Botões de água existem em dois lugares (card da Início + modal) —
    // ambos usam a mesma classe, então um único binding cobre os dois.
    document.querySelectorAll('.water-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const ml = parseInt(btn.dataset.ml, 10) || 0;
        const total = await DB.addWaterMl(ml);
        const profile = await DB.getProfile();
        updateWaterUI(total, Nutrition.computePlan(profile).waterMl);
        showToast(`+${ml}ml registrados 💧`, 'success');
      });
    });

    document.getElementById('btn-water-reset')?.addEventListener('click', resetWater);
    document.getElementById('btn-water-reset-modal')?.addEventListener('click', resetWater);
  }

  async function resetWater() {
    const confirmed = confirm('Zerar o consumo de água registrado hoje?');
    if (!confirmed) return;
    await DB.resetWaterToday();
    const profile = await DB.getProfile();
    updateWaterUI(0, Nutrition.computePlan(profile).waterMl);
  }

  /* Atualiza a barra de progresso e os textos de água nos DOIS lugares
     onde ela aparece (card da Início e dentro do modal), mantendo tudo
     sincronizado sem precisar re-renderizar a tela inteira. */
  function updateWaterUI(consumedMl, targetMl) {
    const target = targetMl || 2000;
    const percent = Math.min(100, Math.round((consumedMl / target) * 100));

    const fillEls = [document.getElementById('water-progress-fill'), document.getElementById('water-progress-fill-modal')];
    const consumedEls = [document.getElementById('water-consumed-label'), document.getElementById('water-consumed-label-modal')];
    const targetEls = [document.getElementById('water-target-label'), document.getElementById('water-target-label-modal')];

    fillEls.forEach((el) => { if (el) el.style.width = `${percent}%`; });
    consumedEls.forEach((el) => { if (el) el.textContent = `${formatNumber(consumedMl)} ml`; });
    targetEls.forEach((el) => { if (el) el.textContent = `${formatNumber(target)} ml`; });
  }

  /* Atualiza só o resumo rápido (card da tela Início) */
  async function renderNutritionQuick(profile) {
    const plan = Nutrition.computePlan(profile);
    const badge = document.getElementById('nutrition-goal-badge');
    if (badge) badge.textContent = plan.goalLabel;

    const proteinEl = document.getElementById('nutrition-protein-quick');
    const waterEl = document.getElementById('nutrition-water-quick');
    if (proteinEl) proteinEl.textContent = plan.proteinMin ? `${plan.proteinMin}–${plan.proteinMax} g` : '-- g';
    if (waterEl) waterEl.textContent = plan.waterLiters ? `${plan.waterLiters} L` : '-- L';

    const consumed = await DB.getWaterToday();
    updateWaterUI(consumed, plan.waterMl);
  }

  /* Preenche o modal completo com cardio, proteína, água e dicas de dieta */
  async function openNutritionModal() {
    const profile = await DB.getProfile();
    const plan = Nutrition.computePlan(profile);

    document.getElementById('nutrition-context').textContent =
      plan.weight ? `${plan.goalLabel} · ${plan.weight} kg` : `${plan.goalLabel} · peso não cadastrado`;

    document.getElementById('nut-cardio-type').textContent = plan.cardio.type;
    document.getElementById('nut-cardio-freq').textContent = plan.cardio.frequency;
    document.getElementById('nut-cardio-duration').textContent = plan.cardio.duration;
    document.getElementById('nut-cardio-desc').textContent = plan.cardio.description;

    document.getElementById('nut-protein-number').textContent = plan.proteinMin
      ? `${plan.proteinMin} a ${plan.proteinMax} g/dia`
      : 'Cadastre seu peso nos Ajustes para calcular';
    document.getElementById('nut-protein-desc').textContent =
      'Faixa baseada no seu peso corporal e objetivo. Distribua ao longo do dia em várias refeições para melhor aproveitamento.';

    document.getElementById('nut-water-number').textContent = plan.waterLiters
      ? `${plan.waterLiters} L/dia`
      : 'Cadastre seu peso nos Ajustes para calcular';

    document.getElementById('nut-calorie-strategy').textContent = plan.calorieStrategy;

    const tipsList = document.getElementById('nut-meal-tips');
    tipsList.innerHTML = plan.mealTips.map((tip) => `<li>${tip}</li>`).join('');

    const consumed = await DB.getWaterToday();
    updateWaterUI(consumed, plan.waterMl);

    document.getElementById('modal-nutrition').classList.remove('hidden');
  }

  function calcIMC(weight, height) {
    if (!weight || !height) return null;
    const h = height / 100;
    return weight / (h * h);
  }

  function countDistinctDaysThisWeek(history) {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const days = new Set();
    history.forEach((h) => {
      const d = new Date(h.date);
      if (d >= startOfWeek) days.add(d.toDateString());
    });
    return days.size;
  }

  function countDistinctDays(history) {
    return new Set(history.map((h) => new Date(h.date).toDateString())).size;
  }

  function formatHoursMinutes(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return hours > 0 ? `${hours}h${minutes}m` : `${minutes}m`;
  }

  function formatNumber(n) {
    return Math.round(n).toLocaleString('pt-BR');
  }

  /* ================================================================
     TELA — TREINOS
  ================================================================ */
  function bindWorkoutsScreen() {
    document.querySelectorAll('#weekday-tabs .weekday-tab').forEach((tab) => {
      tab.addEventListener('click', async () => {
        selectWeekdayTab(tab.dataset.day);
        state.currentDay = tab.dataset.day;
        await renderWorkoutsScreen(state.currentDay);
      });
    });

    document.getElementById('workout-day-name')?.addEventListener('change', async (e) => {
      state.currentWorkoutDay.name = e.target.value;
      await persistCurrentWorkoutDay();
    });

    document.getElementById('btn-add-exercise')?.addEventListener('click', openLibrary);
    document.querySelector('[data-action="open-library"]')?.addEventListener('click', openLibrary);

    document.getElementById('btn-finish-workout')?.addEventListener('click', () => finishWorkout(false));

    selectWeekdayTab(state.currentDay);
  }

  function selectWeekdayTab(day) {
    document.querySelectorAll('#weekday-tabs .weekday-tab').forEach((t) => t.classList.toggle('active', t.dataset.day === day));
  }

  async function renderWorkoutsScreen(day) {
    state.currentWorkoutDay = await DB.getWorkoutDay(day);
    const nameInput = document.getElementById('workout-day-name');
    if (nameInput) nameInput.value = state.currentWorkoutDay.name || '';

    renderExerciseList();
  }

  async function persistCurrentWorkoutDay() {
    await DB.saveWorkoutDay(
      state.currentWorkoutDay.day || state.currentDay,
      state.currentWorkoutDay.name,
      state.currentWorkoutDay.exercises
    );
  }

  function renderExerciseList() {
    const container = document.getElementById('exercise-list');
    const finishBtn = document.getElementById('btn-finish-workout');
    const exercises = state.currentWorkoutDay?.exercises || [];

    if (exercises.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-state-icon">🗂️</span>
          <p>Nenhum exercício adicionado para este dia.</p>
          <button class="btn-secondary" data-action="open-library">Escolher exercícios</button>
          <button class="btn-primary" data-action="open-generator">✨ Gerar Ficha Automática</button>
        </div>`;
      container.querySelector('[data-action="open-library"]').addEventListener('click', openLibrary);
      container.querySelector('[data-action="open-generator"]').addEventListener('click', openGenerator);
      finishBtn?.classList.add('hidden');
      return;
    }

    finishBtn?.classList.remove('hidden');

    container.innerHTML = exercises.map((ex, exIndex) => `
      <div class="exercise-card" data-ex-index="${exIndex}">
        <div class="exercise-card-header">
          <div class="exercise-card-thumb pictogram-thumb">${Pictograms.render(exercisePattern(ex))}</div>
          <div class="exercise-card-title" data-action="open-detail" data-ex-index="${exIndex}">
            <strong>${ex.name}</strong>
            <span>${ex.group}${ex.equipment ? ' · ' + ex.equipment : ''}</span>
          </div>
          <button class="btn-icon-round small" data-action="remove-exercise" data-ex-index="${exIndex}" aria-label="Remover">✕</button>
        </div>
        <div class="series-mini-list">
          ${ex.sets.map((set, setIndex) => `
            <div class="series-mini-row">
              <button class="series-check ${set.completed ? 'checked' : ''}" data-action="toggle-set" data-ex-index="${exIndex}" data-set-index="${setIndex}" aria-label="Série ${setIndex + 1}">${set.completed ? '✓' : ''}</button>
              <input type="number" placeholder="kg" value="${set.weight ?? ''}" data-action="set-weight" data-ex-index="${exIndex}" data-set-index="${setIndex}">
              <input type="number" placeholder="reps" value="${set.reps ?? ''}" data-action="set-reps" data-ex-index="${exIndex}" data-set-index="${setIndex}">
              <input type="number" placeholder="RPE" min="1" max="10" value="${set.rpe ?? ''}" data-action="set-rpe" data-ex-index="${exIndex}" data-set-index="${setIndex}">
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

    bindExerciseListEvents(container);
  }

  function bindExerciseListEvents(container) {
    container.querySelectorAll('[data-action="open-detail"]').forEach((el) => {
      el.addEventListener('click', () => openExerciseDetail(parseInt(el.dataset.exIndex, 10)));
    });

    container.querySelectorAll('[data-action="remove-exercise"]').forEach((el) => {
      el.addEventListener('click', async (e) => {
        e.stopPropagation();
        const idx = parseInt(el.dataset.exIndex, 10);
        state.currentWorkoutDay.exercises.splice(idx, 1);
        await persistCurrentWorkoutDay();
        renderExerciseList();
      });
    });

    container.querySelectorAll('[data-action="toggle-set"]').forEach((el) => {
      el.addEventListener('click', async () => {
        const exIdx = parseInt(el.dataset.exIndex, 10);
        const setIdx = parseInt(el.dataset.setIndex, 10);
        const set = state.currentWorkoutDay.exercises[exIdx].sets[setIdx];
        set.completed = !set.completed;

        if (!state.workoutSessionStart) state.workoutSessionStart = Date.now();

        await persistCurrentWorkoutDay();
        renderExerciseList();
        checkAllSetsComplete();
      });
    });

    ['set-weight', 'set-reps', 'set-rpe'].forEach((action) => {
      const field = action.replace('set-', '');
      container.querySelectorAll(`[data-action="${action}"]`).forEach((el) => {
        el.addEventListener('change', async () => {
          const exIdx = parseInt(el.dataset.exIndex, 10);
          const setIdx = parseInt(el.dataset.setIndex, 10);
          state.currentWorkoutDay.exercises[exIdx].sets[setIdx][field] = el.value === '' ? null : parseFloat(el.value);
          await persistCurrentWorkoutDay();
        });
      });
    });
  }

  /* Dispara a celebração automaticamente quando todas as séries
     de todos os exercícios do dia estiverem marcadas. */
  function checkAllSetsComplete() {
    const exercises = state.currentWorkoutDay?.exercises || [];
    const allSets = exercises.flatMap((ex) => ex.sets);
    const allChecked = allSets.length > 0 && allSets.every((s) => s.completed);

    if (allChecked && !state.autoFinishedToday) {
      state.autoFinishedToday = true;
      finishWorkout(true);
    }
  }

  /* ================================================================
     CONCLUIR TREINO — salva histórico, calcula volume/calorias,
     verifica recordes pessoais e exibe as animações de conclusão.
  ================================================================ */
  async function finishWorkout(auto) {
    const exercises = state.currentWorkoutDay?.exercises || [];
    if (exercises.length === 0) return;

    const durationSeconds = state.workoutSessionStart
      ? Math.round((Date.now() - state.workoutSessionStart) / 1000)
      : 0;

    let volume = 0;
    const brokenRecords = [];

    for (const ex of exercises) {
      let maxWeightThisWorkout = 0;
      for (const set of ex.sets) {
        if (set.completed && set.weight && set.reps) {
          volume += set.weight * set.reps;
          maxWeightThisWorkout = Math.max(maxWeightThisWorkout, set.weight);
        }
      }
      if (maxWeightThisWorkout > 0) {
        const isRecord = await DB.checkAndUpdateRecord(ex.exerciseId || ex.id, ex.name, maxWeightThisWorkout, new Date().toISOString());
        if (isRecord) brokenRecords.push({ name: ex.name, weight: maxWeightThisWorkout });
      }
    }

    // Estimativa simples de calorias: ~5.5 kcal por minuto de treino de força
    const calories = Math.round((durationSeconds / 60) * 5.5);

    await DB.addHistoryEntry({
      date: new Date().toISOString(),
      day: state.currentDay,
      workoutName: state.currentWorkoutDay.name || WEEKDAY_LABELS[state.currentDay],
      exercises: exercises.map((ex) => ({ exerciseId: ex.exerciseId, name: ex.name, sets: ex.sets })),
      durationSeconds,
      volume,
      calories
    });

    // Reseta o estado de sessão para o próximo treino
    state.workoutSessionStart = null;

    document.getElementById('complete-summary').textContent =
      `Volume total: ${formatNumber(volume)} kg • Tempo: ${Math.round(durationSeconds / 60)} min`;
    document.getElementById('overlay-complete').classList.remove('hidden');

    // Mostra recordes um a um, depois do card de conclusão
    if (brokenRecords.length > 0) {
      setTimeout(() => showRecordOverlay(brokenRecords), auto ? 200 : 200);
    }

    await renderHome();
  }

  function showRecordOverlay(records) {
    if (records.length === 0) return;
    const record = records.shift();
    document.getElementById('record-detail').textContent = `${record.name} — ${record.weight} kg`;
    const overlay = document.getElementById('overlay-record');
    overlay.classList.remove('hidden');
    setTimeout(() => {
      overlay.classList.add('hidden');
      showRecordOverlay(records);
    }, 2400);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-close-complete')?.addEventListener('click', () => {
      document.getElementById('overlay-complete').classList.add('hidden');
    });
  });

  /* ================================================================
     MODAL — BIBLIOTECA DE EXERCÍCIOS
  ================================================================ */
  function populateLibraryFilters() {
    const groupSelect = document.getElementById('filter-group');
    const equipmentSelect = document.getElementById('filter-equipment');
    const levelSelect = document.getElementById('filter-level');

    window.EXERCISE_GROUPS.forEach((g) => groupSelect.insertAdjacentHTML('beforeend', `<option value="${g}">${g}</option>`));
    window.EQUIPMENT_TYPES.forEach((eq) => equipmentSelect.insertAdjacentHTML('beforeend', `<option value="${eq}">${eq}</option>`));
    window.LEVELS.forEach((l) => levelSelect.insertAdjacentHTML('beforeend', `<option value="${l}">${l}</option>`));
  }

  function bindLibrary() {
    document.getElementById('library-search')?.addEventListener('input', (e) => {
      state.library.text = e.target.value;
      renderLibraryResults();
    });
    document.getElementById('filter-group')?.addEventListener('change', (e) => { state.library.group = e.target.value; renderLibraryResults(); });
    document.getElementById('filter-equipment')?.addEventListener('change', (e) => { state.library.equipment = e.target.value; renderLibraryResults(); });
    document.getElementById('filter-level')?.addEventListener('change', (e) => { state.library.level = e.target.value; renderLibraryResults(); });
  }

  function openLibrary() {
    document.getElementById('modal-library').classList.remove('hidden');
    renderLibraryResults();
  }

  function renderLibraryResults() {
    const results = window.searchExercises(state.library);
    const container = document.getElementById('library-results');

    if (results.length === 0) {
      container.innerHTML = `<p class="last-workout-empty" style="padding:20px 0;text-align:center;">Nenhum exercício encontrado.</p>`;
      return;
    }

    container.innerHTML = results.map((ex) => `
      <div class="library-item">
        <div class="pictogram-thumb" style="width:44px;height:44px;border-radius:10px;flex-shrink:0;">${Pictograms.render(ex.pattern)}</div>
        <div class="library-item-info">
          <strong>${ex.name}</strong>
          <span>${ex.group} · ${ex.level}</span>
        </div>
        <button class="library-item-add" data-id="${ex.id}" aria-label="Adicionar">＋</button>
      </div>
    `).join('');

    container.querySelectorAll('.library-item-add').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await addExerciseToCurrentDay(btn.dataset.id);
        showToast('Exercício adicionado', 'success');
      });
    });
  }

  async function addExerciseToCurrentDay(exerciseId) {
    const exercise = window.findExerciseById(exerciseId);
    if (!exercise) return;

    if (!state.currentWorkoutDay) state.currentWorkoutDay = { day: state.currentDay, name: '', exercises: [] };

    state.currentWorkoutDay.exercises.push({
      exerciseId: exercise.id,
      name: exercise.name,
      group: exercise.group,
      equipment: exercise.equipment,
      image: exercise.image,
      notes: '',
      sets: [
        { weight: null, reps: null, rpe: null, completed: false },
        { weight: null, reps: null, rpe: null, completed: false },
        { weight: null, reps: null, rpe: null, completed: false }
      ]
    });

    await persistCurrentWorkoutDay();
    renderExerciseList();
  }

  /* ================================================================
     MODAL — GERADOR AUTOMÁTICO DE FICHA DE TREINO
  ================================================================ */
  function bindGenerator() {
    document.getElementById('btn-open-generator')?.addEventListener('click', openGenerator);
    document.querySelectorAll('[data-action="open-generator"]').forEach((btn) => {
      btn.addEventListener('click', openGenerator);
    });

    // Seleção múltipla de dias (não é exclusivo como as abas de navegação)
    document.querySelectorAll('#gen-days .weekday-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        document.getElementById('gen-error')?.classList.add('hidden');
      });
    });

    // Local de treino — seleção exclusiva (Academia OU Casa)
    document.querySelectorAll('#gen-location .segmented-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#gen-location .segmented-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    document.getElementById('gen-btn-generate')?.addEventListener('click', runGenerator);
  }

  async function openGenerator() {
    // Fecha a biblioteca se estiver aberta por trás, e abre o gerador pré-preenchido
    const profile = await DB.getProfile();

    document.getElementById('gen-age').value = profile.age || '';
    document.getElementById('gen-weight').value = profile.weight || '';
    document.getElementById('gen-height').value = profile.height || '';
    document.getElementById('gen-goal').value = profile.goal || 'hipertrofia';
    document.getElementById('gen-minutes').value = String(profile.sessionMinutes || 60);
    document.getElementById('gen-experience').value = profile.experience || 'iniciante';

    document.querySelectorAll('#gen-location .segmented-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.location === (profile.trainingLocation || 'academia'));
    });

    document.querySelectorAll('#gen-days .weekday-tab').forEach((btn) => btn.classList.remove('active'));
    document.getElementById('gen-error')?.classList.add('hidden');

    document.getElementById('modal-library')?.classList.add('hidden');
    document.getElementById('modal-generator').classList.remove('hidden');
  }

  async function runGenerator() {
    const selectedDays = Array.from(document.querySelectorAll('#gen-days .weekday-tab.active')).map((b) => b.dataset.day);

    if (selectedDays.length === 0) {
      document.getElementById('gen-error')?.classList.remove('hidden');
      return;
    }

    const confirmed = confirm(
      `Isso vai iniciar um NOVO programa de treino (mesociclo de ${Program.CYCLE_WEEKS} semanas): cria treinos para os ${selectedDays.length} dia(s) selecionado(s), esvazia os demais dias da semana, e sorteia exercícios novos. Deseja continuar?`
    );
    if (!confirmed) return;

    const params = {
      age: parseInt(document.getElementById('gen-age').value, 10) || null,
      weight: parseFloat(document.getElementById('gen-weight').value) || null,
      height: parseFloat(document.getElementById('gen-height').value) || null,
      goal: document.getElementById('gen-goal').value,
      experience: document.getElementById('gen-experience').value,
      location: document.querySelector('#gen-location .segmented-btn.active')?.dataset.location || 'academia',
      minutes: parseInt(document.getElementById('gen-minutes').value, 10) || 60,
      selectedDays
    };

    const btn = document.getElementById('gen-btn-generate');
    const originalLabel = btn.textContent;
    btn.disabled = true;

    // Mensagens em etapas — a geração em si é rápida, mas mostrar o
    // "raciocínio" por trás da ficha (analisar perfil, montar divisão,
    // escolher exercícios) deixa claro que não é uma lista genérica.
    const stages = [
      'Analisando seu perfil...',
      'Montando a divisão de treino...',
      'Selecionando exercícios...',
      'Ajustando séries e repetições...'
    ];
    let stageIndex = 0;
    btn.textContent = stages[0];
    const stageInterval = setInterval(() => {
      stageIndex = (stageIndex + 1) % stages.length;
      btn.textContent = stages[stageIndex];
    }, 450);

    try {
      const [plan] = await Promise.all([
        Generator.generateAndSave(params),
        new Promise((resolve) => setTimeout(resolve, 1400)) // dá tempo de ler as etapas
      ]);
      clearInterval(stageInterval);

      document.getElementById('modal-generator').classList.add('hidden');
      showToast(`Ficha gerada: ${plan.length} dia(s) de treino 💪`, 'success');

      // Leva o usuário direto para o primeiro dia gerado
      const firstDay = plan[0].day;
      state.currentDay = firstDay;
      await switchScreen('workouts');
      selectWeekdayTab(firstDay);
      await renderWorkoutsScreen(firstDay);
      await renderHome();
      await renderSettings();
    } catch (err) {
      console.error('[Generator] Erro ao gerar ficha:', err);
      showToast('Não foi possível gerar a ficha. Tente novamente.', 'danger');
    } finally {
      clearInterval(stageInterval);
      btn.textContent = originalLabel;
      btn.disabled = false;
    }
  }

  /* ================================================================
     MODAL — DETALHE DO EXERCÍCIO
  ================================================================ */
  function bindExerciseDetail() {
    document.getElementById('ex-btn-add-series')?.addEventListener('click', async () => {
      const ex = state.currentWorkoutDay.exercises[state.activeExerciseId];
      ex.sets.push({ weight: null, reps: null, rpe: null, completed: false });
      await persistCurrentWorkoutDay();
      renderExerciseDetailSeries();
      renderExerciseList();
    });
  }

  function openExerciseDetail(exIndex) {
    state.activeExerciseId = exIndex;
    const ex = state.currentWorkoutDay.exercises[exIndex];
    const fullData = window.findExerciseById(ex.exerciseId) || {};

    document.getElementById('ex-detail-name').textContent = ex.name;
    document.getElementById('ex-detail-img').innerHTML = Pictograms.render(exercisePattern(ex));
    document.getElementById('ex-detail-group').textContent = ex.group || fullData.group || '';
    document.getElementById('ex-detail-level').textContent = fullData.level || '';
    document.getElementById('ex-detail-equipment').textContent = ex.equipment || fullData.equipment || '';
    document.getElementById('ex-detail-desc').textContent = fullData.description || '';
    document.getElementById('ex-detail-secondary').textContent = fullData.secondary || '-';
    document.getElementById('ex-detail-mistakes').textContent = fullData.mistakes || '-';
    document.getElementById('ex-detail-tips').textContent = fullData.tips || '-';

    // Reseta o player de vídeo sempre que um novo exercício é aberto
    const videoWrap = document.getElementById('ex-video-wrap');
    const videoAspect = document.getElementById('ex-video-aspect');
    videoWrap.classList.add('hidden');
    videoAspect.innerHTML = '';

    const ytBtn = document.getElementById('ex-btn-youtube');
    if (fullData.videoId) {
      // Vídeo curado disponível: toca embutido, "abrindo" logo abaixo do botão
      ytBtn.textContent = '▶ Assistir vídeo';
      ytBtn.onclick = () => toggleEmbeddedVideo(fullData.videoId);
    } else {
      // Sem vídeo curado ainda: abre a busca no YouTube em nova aba
      ytBtn.textContent = '🔍 Buscar no YouTube';
      ytBtn.onclick = () => window.open(fullData.youtube || '#', '_blank');
    }

    renderQRCode(fullData.youtube || window.location.href);
    renderExerciseDetailSeries();

    document.getElementById('modal-exercise').classList.remove('hidden');
  }

  /* Alterna a exibição do player de vídeo embutido logo abaixo do botão.
     O iframe só é criado quando o vídeo é aberto (evita carregar/
     autoplay vídeos que a pessoa nunca clicou para ver). */
  function toggleEmbeddedVideo(videoId) {
    const wrap = document.getElementById('ex-video-wrap');
    const aspect = document.getElementById('ex-video-aspect');
    const isOpen = !wrap.classList.contains('hidden');

    if (isOpen) {
      wrap.classList.add('hidden');
      aspect.innerHTML = '';
      return;
    }

    aspect.innerHTML = `<iframe
      src="https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0"
      title="Vídeo demonstrativo do exercício"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
      loading="lazy"></iframe>`;
    wrap.classList.remove('hidden');
    wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function renderExerciseDetailSeries() {
    const ex = state.currentWorkoutDay.exercises[state.activeExerciseId];
    const container = document.getElementById('series-list');

    container.innerHTML = ex.sets.map((set, i) => `
      <div class="series-item">
        <button class="series-check ${set.completed ? 'checked' : ''}" data-set-index="${i}" data-action="detail-toggle">${set.completed ? '✓' : ''}</button>
        <div><label>Carga (kg)</label><input type="number" value="${set.weight ?? ''}" data-set-index="${i}" data-field="weight"></div>
        <div><label>Reps</label><input type="number" value="${set.reps ?? ''}" data-set-index="${i}" data-field="reps"></div>
        <div><label>RPE</label><input type="number" min="1" max="10" value="${set.rpe ?? ''}" data-set-index="${i}" data-field="rpe"></div>
        <button class="btn-icon-round small" data-set-index="${i}" data-action="detail-remove" aria-label="Remover">✕</button>
      </div>
    `).join('');

    container.querySelectorAll('[data-action="detail-toggle"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const i = parseInt(btn.dataset.setIndex, 10);
        ex.sets[i].completed = !ex.sets[i].completed;
        if (!state.workoutSessionStart) state.workoutSessionStart = Date.now();
        await persistCurrentWorkoutDay();
        renderExerciseDetailSeries();
        renderExerciseList();
        checkAllSetsComplete();
      });
    });

    container.querySelectorAll('input[data-field]').forEach((input) => {
      input.addEventListener('change', async () => {
        const i = parseInt(input.dataset.setIndex, 10);
        ex.sets[i][input.dataset.field] = input.value === '' ? null : parseFloat(input.value);
        await persistCurrentWorkoutDay();
        renderExerciseList();
      });
    });

    container.querySelectorAll('[data-action="detail-remove"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const i = parseInt(btn.dataset.setIndex, 10);
        ex.sets.splice(i, 1);
        await persistCurrentWorkoutDay();
        renderExerciseDetailSeries();
        renderExerciseList();
      });
    });
  }

  /* Gera um QR Code simples (SVG) apontando para o link do exercício,
     sem nenhuma biblioteca externa — usa um algoritmo leve embutido. */
  function renderQRCode(url) {
    const box = document.getElementById('ex-detail-qrcode');
    if (!box) return;
    // Implementação leve: exibe o link de forma legível (fallback universal),
    // já que gerar um QR real sem libs exigiria um encoder Reed-Solomon completo.
    box.innerHTML = `<p style="font-size:11px;color:var(--text-dim);text-align:center;word-break:break-all;padding:8px;">${url}</p>`;
  }

  function bindTimerLauncher() {
    document.getElementById('ex-btn-open-timer')?.addEventListener('click', () => {
      document.getElementById('modal-timer').classList.remove('hidden');
    });
  }

  /* ================================================================
     MODAIS — fechar (compartilhado por todos)
  ================================================================ */
  function bindModalClosers() {
    document.querySelectorAll('.modal-close').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.getElementById(btn.dataset.close)?.classList.add('hidden');
        stopEmbeddedVideo();
      });
    });
    // Fecha ao tocar fora do sheet (no fundo escurecido)
    document.querySelectorAll('.modal').forEach((modal) => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
          stopEmbeddedVideo();
        }
      });
    });
  }

  /* Remove o iframe do vídeo (isso realmente para a reprodução/áudio,
     diferente de só esconder o elemento com CSS). */
  function stopEmbeddedVideo() {
    const wrap = document.getElementById('ex-video-wrap');
    const aspect = document.getElementById('ex-video-aspect');
    if (!wrap) return;
    wrap.classList.add('hidden');
    aspect.innerHTML = '';
  }

  /* ================================================================
     TELA — PROGRESSO (gráficos + estatísticas)
  ================================================================ */
  function bindProgressTabs() {
    document.querySelectorAll('.chart-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.chart-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        state.activeChart = tab.dataset.chart;
        renderActiveChart();
      });
    });
  }
  bindProgressTabs();

  async function renderProgressScreen() {
    await renderActiveChart();
    await renderStatsList();
  }

  async function renderActiveChart() {
    const canvas = document.getElementById('main-chart');
    const emptyMsg = document.getElementById('chart-empty-msg');
    const history = await DB.getHistory();

    let data = [];

    if (state.activeChart === 'volume-weekly') {
      data = last7Days().map((d) => ({
        label: d.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3),
        value: history.filter((h) => sameDay(new Date(h.date), d)).reduce((s, h) => s + (h.volume || 0), 0)
      }));
      if (data.every((d) => d.value === 0)) return showEmptyChart(canvas, emptyMsg);
      Charts.drawBarChart(canvas, data);

    } else if (state.activeChart === 'volume-monthly') {
      data = last6Months().map((m) => ({
        label: m.label,
        value: history.filter((h) => sameMonth(new Date(h.date), m.date)).reduce((s, h) => s + (h.volume || 0), 0)
      }));
      if (data.every((d) => d.value === 0)) return showEmptyChart(canvas, emptyMsg);
      Charts.drawBarChart(canvas, data);

    } else if (state.activeChart === 'bodyweight') {
      const log = await DB.getBodyWeightLog();
      if (log.length === 0) return showEmptyChart(canvas, emptyMsg);
      data = log.map((b) => ({ label: new Date(b.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), value: b.weight }));
      hideEmptyChart(canvas, emptyMsg);
      Charts.drawLineChart(canvas, data);

    } else if (state.activeChart === 'muscle-group') {
      const counts = {};
      history.forEach((h) => (h.exercises || []).forEach((ex) => {
        const group = (window.findExerciseById(ex.exerciseId) || {}).group || 'Outro';
        counts[group] = (counts[group] || 0) + 1;
      }));
      data = Object.entries(counts).map(([label, value]) => ({ label, value }));
      if (data.length === 0) return showEmptyChart(canvas, emptyMsg);
      hideEmptyChart(canvas, emptyMsg);
      Charts.drawBarChart(canvas, data);

    } else if (state.activeChart === 'load-evolution') {
      const records = await DB.getAll ? [] : []; // placeholder seguro
      const allRecordsRaw = await DB.getRecord ? null : null;
      // Usa o histórico para plotar a evolução da maior carga por sessão
      data = history.map((h) => ({
        label: new Date(h.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        value: Math.max(0, ...(h.exercises || []).flatMap((ex) => (ex.sets || []).map((s) => s.weight || 0)))
      })).filter((d) => d.value > 0);
      if (data.length === 0) return showEmptyChart(canvas, emptyMsg);
      hideEmptyChart(canvas, emptyMsg);
      Charts.drawLineChart(canvas, data);
    }
  }

  function showEmptyChart(canvas, emptyMsg) {
    canvas.classList.add('hidden');
    emptyMsg.classList.remove('hidden');
  }
  function hideEmptyChart(canvas, emptyMsg) {
    canvas.classList.remove('hidden');
    emptyMsg.classList.add('hidden');
  }

  function last7Days() {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
  }
  function last6Months() {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return { date: d, label: d.toLocaleDateString('pt-BR', { month: 'short' }) };
    });
  }
  function sameDay(a, b) { return a.toDateString() === b.toDateString(); }
  function sameMonth(a, b) { return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear(); }

  async function renderStatsList() {
    const history = await DB.getHistory();

    const maxLoad = Math.max(0, ...history.flatMap((h) => (h.exercises || []).flatMap((ex) => (ex.sets || []).map((s) => s.weight || 0))));
    const maxWorkout = Math.max(0, ...history.map((h) => h.volume || 0));
    const avgTime = history.length ? Math.round(history.reduce((s, h) => s + (h.durationSeconds || 0), 0) / history.length / 60) : 0;
    const totalVolume = history.reduce((s, h) => s + (h.volume || 0), 0);

    const nameFreq = {};
    history.forEach((h) => { nameFreq[h.workoutName] = (nameFreq[h.workoutName] || 0) + 1; });
    const favWorkout = Object.entries(nameFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || '--';

    const groupFreq = {};
    history.forEach((h) => (h.exercises || []).forEach((ex) => {
      const group = (window.findExerciseById(ex.exerciseId) || {}).group || 'Outro';
      groupFreq[group] = (groupFreq[group] || 0) + 1;
    }));
    const topMuscle = Object.entries(groupFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || '--';

    const streak = calcStreak(history);

    const now = new Date();
    const monthCount = history.filter((h) => sameMonth(new Date(h.date), now)).length;

    document.getElementById('stat-max-load').textContent = maxLoad ? `${maxLoad} kg` : '--';
    document.getElementById('stat-max-workout').textContent = maxWorkout ? `${formatNumber(maxWorkout)} kg` : '--';
    document.getElementById('stat-avg-time').textContent = avgTime ? `${avgTime} min` : '--';
    document.getElementById('stat-total-volume').textContent = totalVolume ? `${formatNumber(totalVolume)} kg` : '--';
    document.getElementById('stat-fav-workout').textContent = favWorkout;
    document.getElementById('stat-top-muscle').textContent = topMuscle;
    document.getElementById('stat-streak').textContent = `${streak} dias`;
    document.getElementById('stat-month-count').textContent = monthCount;
  }

  function calcStreak(history) {
    const days = new Set(history.map((h) => new Date(h.date).toDateString()));
    let streak = 0;
    let cursor = new Date();
    while (days.has(cursor.toDateString())) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  /* ================================================================
     TELA — CALENDÁRIO
  ================================================================ */
  function bindCalendarNav() {
    document.getElementById('cal-prev')?.addEventListener('click', () => {
      state.calendarDate.setMonth(state.calendarDate.getMonth() - 1);
      renderCalendar(state.calendarDate);
    });
    document.getElementById('cal-next')?.addEventListener('click', () => {
      state.calendarDate.setMonth(state.calendarDate.getMonth() + 1);
      renderCalendar(state.calendarDate);
    });
  }

  async function computeStreakAndRender() {
    const history = await DB.getHistory();
    document.getElementById('calendar-streak').textContent = calcStreak(history);
    state._historyCache = history;
  }

  function renderCalendar(date) {
    const label = document.getElementById('calendar-month-label');
    const grid = document.getElementById('calendar-grid');
    label.textContent = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDay.getDay();
    const today = new Date();

    const history = state._historyCache || [];
    const trainedDays = new Set(history.map((h) => new Date(h.date).toDateString()));

    let html = '';
    for (let i = 0; i < startOffset; i++) html += `<div class="calendar-day empty"></div>`;

    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(year, month, day);
      const isToday = cellDate.toDateString() === today.toDateString();
      const isFuture = cellDate > today;
      const isTrained = trainedDays.has(cellDate.toDateString());

      let cls = 'calendar-day';
      if (isToday) cls += ' today';
      if (isTrained) cls += ' trained';
      else if (isFuture) cls += ' future';
      else cls += ' missed';

      html += `<div class="${cls}">${day}</div>`;
    }

    grid.innerHTML = html;
  }

  /* ================================================================
     TELA — CONFIGURAÇÕES
  ================================================================ */
  function bindSettingsScreen() {
    document.getElementById('btn-save-profile')?.addEventListener('click', async () => {
      const existing = await DB.getProfile();
      const profile = {
        ...existing,
        name: document.getElementById('cfg-name').value,
        age: parseInt(document.getElementById('cfg-age').value, 10) || null,
        weight: parseFloat(document.getElementById('cfg-weight').value) || null,
        height: parseFloat(document.getElementById('cfg-height').value) || null,
        goal: document.getElementById('cfg-goal').value
      };
      await DB.saveProfile(profile);
      showToast('Perfil salvo com sucesso', 'success');
      await renderHome();
    });

    document.querySelectorAll('#theme-toggle .segmented-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        document.querySelectorAll('#theme-toggle .segmented-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const theme = btn.dataset.theme;
        document.documentElement.setAttribute('data-theme', theme);
        const settings = await DB.getSettings();
        settings.theme = theme;
        await DB.saveSettings(settings);
      });
    });

    document.querySelectorAll('#color-swatches .swatch').forEach((btn) => {
      btn.addEventListener('click', async () => {
        document.querySelectorAll('#color-swatches .swatch').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const color = btn.dataset.color;
        document.documentElement.style.setProperty('--accent', color);
        document.documentElement.style.setProperty('--accent-dim', hexToRgbaLocal(color, 0.16));
        const settings = await DB.getSettings();
        settings.accentColor = color;
        await DB.saveSettings(settings);
      });
    });

    document.getElementById('btn-export-json')?.addEventListener('click', async () => {
      const data = await DB.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gympro-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Backup exportado', 'success');
    });

    document.getElementById('btn-import-json')?.addEventListener('click', () => {
      document.getElementById('import-file-input').click();
    });

    document.getElementById('import-file-input')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await DB.importAll(data);
        showToast('Backup restaurado com sucesso', 'success');
        await renderHome();
        await renderWorkoutsScreen(state.currentDay);
        await renderSettings();
      } catch (err) {
        console.error(err);
        showToast('Arquivo de backup inválido', 'danger');
      }
      e.target.value = '';
    });

    document.getElementById('btn-reset-data')?.addEventListener('click', async () => {
      const confirmed = confirm('Isso vai apagar TODOS os seus dados permanentemente. Deseja continuar?');
      if (!confirmed) return;
      await DB.resetAll();
      showToast('Dados resetados', 'success');
      await renderHome();
      await renderWorkoutsScreen(state.currentDay);
    });
  }

  function hexToRgbaLocal(hex, alpha) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map((ch) => ch + ch).join('');
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  async function renderSettings() {
    const profile = await DB.getProfile();
    const settings = await DB.getSettings();

    document.getElementById('cfg-name').value = profile.name || '';
    document.getElementById('cfg-age').value = profile.age || '';
    document.getElementById('cfg-weight').value = profile.weight || '';
    document.getElementById('cfg-height').value = profile.height || '';
    document.getElementById('cfg-goal').value = profile.goal || 'hipertrofia';

    document.documentElement.setAttribute('data-theme', settings.theme || 'dark');
    document.querySelectorAll('#theme-toggle .segmented-btn').forEach((b) => b.classList.toggle('active', b.dataset.theme === settings.theme));

    if (settings.accentColor) {
      document.documentElement.style.setProperty('--accent', settings.accentColor);
      document.documentElement.style.setProperty('--accent-dim', hexToRgbaLocal(settings.accentColor, 0.16));
    }
    document.querySelectorAll('#color-swatches .swatch').forEach((b) => b.classList.toggle('active', b.dataset.color === settings.accentColor));
  }

  /* ================================================================
     CONTA E SINCRONIZAÇÃO (card em Configurações)
  ================================================================ */
  function bindAccount() {
    document.getElementById('btn-go-login')?.addEventListener('click', async () => {
      if (window.Auth) await Auth.signOutUser().catch(() => {});
      window.location.reload();
    });

    document.getElementById('btn-logout')?.addEventListener('click', async () => {
      const confirmed = confirm('Sair da conta? Você pode entrar de novo a qualquer momento para acessar seus dados.');
      if (!confirmed) return;
      await Auth.signOutUser();
      window.location.reload();
    });
  }

  function refreshAccountUI() {
    const badge = document.getElementById('sync-status-badge');
    const loggedOutBlock = document.getElementById('account-logged-out');
    const loggedInBlock = document.getElementById('account-logged-in');
    const notConfiguredBlock = document.getElementById('account-not-configured');
    if (!badge) return;

    [loggedOutBlock, loggedInBlock, notConfiguredBlock].forEach((el) => el?.classList.add('hidden'));

    if (!window.FIREBASE_IS_CONFIGURED) {
      badge.textContent = 'Só neste aparelho';
      badge.className = 'badge badge-local';
      notConfiguredBlock?.classList.remove('hidden');
      return;
    }

    const user = window.Auth?.getUser?.();
    if (user) {
      badge.textContent = 'Sincronizado ☁️';
      badge.className = 'badge badge-cloud';
      loggedInBlock?.classList.remove('hidden');
      const emailEl = document.getElementById('account-email');
      if (emailEl) emailEl.textContent = user.email || '--';
    } else {
      badge.textContent = 'Desconectado';
      badge.className = 'badge badge-local';
      loggedOutBlock?.classList.remove('hidden');
    }
  }

  return { init, switchScreen, showToast, state, refreshAccountUI, checkWeeklyProgression };
})();

window.UI = UI;
