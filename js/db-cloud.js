/* ================================================================
   GYM PRO — db-cloud.js
   Camada de persistência baseada em Cloud Firestore — os mesmos
   dados (perfil, treinos, histórico, cargas, água) ficam disponíveis
   em QUALQUER aparelho onde a pessoa fizer login.

   O Firestore já vem com cache offline embutido: se a internet cair,
   o app continua lendo/escrevendo normalmente a partir do cache local
   e sincroniza sozinho assim que a conexão voltar — não precisamos
   reimplementar essa parte manualmente.

   IMPORTANTE: expõe exatamente a mesma API pública do db-local.js
   (mesmos nomes de função, mesmos formatos de retorno), para que
   ui.js / generator.js / nutrition.js funcionem sem nenhuma alteração
   independente de qual camada (local ou nuvem) está ativa.
================================================================ */

const DBCloud = (() => {

  const STORES = {
    PROFILE: 'profile',
    SETTINGS: 'settings',
    WORKOUT_PLAN: 'workoutPlan',
    HISTORY: 'history',
    BODYWEIGHT: 'bodyweight',
    RECORDS: 'records',
    WATERLOG: 'waterLog'
  };
  let persistenceAttempted = false;

  /* --------------------------------------------------------------
     Garante que o Firebase está inicializado, o usuário autenticado,
     e a persistência offline do Firestore habilitada (uma vez só).
  -------------------------------------------------------------- */
  async function open() {
    Auth.initFirebase();
    await Auth.ready();

    if (!Auth.getUid()) {
      throw new Error('Usuário não autenticado — não é possível acessar os dados na nuvem.');
    }

    if (!persistenceAttempted) {
      persistenceAttempted = true;
      try {
        await firebase.firestore().enablePersistence({ synchronizeTabs: true });
      } catch (err) {
        // Não é fatal: em abas múltiplas sem synchronizeTabs, navegadores
        // privados, ou navegadores sem suporte, o app segue funcionando
        // — só perde o cache offline automático do Firestore.
        console.warn('[DBCloud] Persistência offline não disponível:', err.code || err.message);
      }
    }

    return firebase.firestore();
  }

  function userDocRef() {
    return firebase.firestore().collection('users').doc(Auth.getUid());
  }

  async function collectionRef(name) {
    await open();
    return userDocRef().collection(name);
  }

  async function getAllFromCollection(name) {
    const col = await collectionRef(name);
    const snap = await col.get();
    return snap.docs.map((d) => d.data());
  }

  async function clearCollection(name) {
    const col = await collectionRef(name);
    const snap = await col.get();
    const db = firebase.firestore();
    const batch = db.batch();
    snap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
    if (snap.docs.length > 0) await batch.commit();
  }

  /* ================================================================
     API PÚBLICA — PERFIL DO USUÁRIO
     (guardado como campo "profile" no documento raiz do usuário)
  ================================================================ */
  const DEFAULT_PROFILE = {
    id: 1, name: '', photo: '', age: null, weight: null, height: null,
    goal: 'hipertrofia', experience: 'iniciante', trainingLocation: 'academia',
    weekDaysGoal: 5, sessionMinutes: 60
  };

  async function getProfile() {
    await open();
    const snap = await userDocRef().get();
    const data = snap.exists ? snap.data().profile : null;
    return data || { ...DEFAULT_PROFILE };
  }

  async function saveProfile(profileData) {
    await open();
    return userDocRef().set({ profile: { ...profileData, id: 1 } }, { merge: true });
  }

  /* ================================================================
     API PÚBLICA — CONFIGURAÇÕES
  ================================================================ */
  const DEFAULT_SETTINGS = { id: 1, theme: 'dark', accentColor: '#3D8BFF', soundEnabled: true, vibrationEnabled: true };

  async function getSettings() {
    await open();
    const snap = await userDocRef().get();
    const data = snap.exists ? snap.data().settings : null;
    return data || { ...DEFAULT_SETTINGS };
  }

  async function saveSettings(settingsData) {
    await open();
    return userDocRef().set({ settings: { ...settingsData, id: 1 } }, { merge: true });
  }

  /* ================================================================
     API PÚBLICA — PLANO DE TREINO (por dia da semana)
  ================================================================ */
  async function getWorkoutDay(day) {
    const col = await collectionRef(STORES.WORKOUT_PLAN);
    const snap = await col.doc(day).get();
    return snap.exists ? snap.data() : { day, name: '', exercises: [] };
  }

  async function getAllWorkoutDays() {
    return getAllFromCollection(STORES.WORKOUT_PLAN);
  }

  async function saveWorkoutDay(day, name, exercises) {
    const col = await collectionRef(STORES.WORKOUT_PLAN);
    return col.doc(day).set({ day, name, exercises });
  }

  /* ================================================================
     API PÚBLICA — HISTÓRICO DE TREINOS CONCLUÍDOS
  ================================================================ */
  async function addHistoryEntry(entry) {
    const col = await collectionRef(STORES.HISTORY);
    return col.add(entry);
  }

  async function getHistory() {
    const all = await getAllFromCollection(STORES.HISTORY);
    return all.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  async function getHistoryByDateRange(startDate, endDate) {
    const all = await getHistory();
    return all.filter((h) => {
      const d = new Date(h.date);
      return d >= startDate && d <= endDate;
    });
  }

  /* ================================================================
     API PÚBLICA — PESO CORPORAL
  ================================================================ */
  async function addBodyWeight(date, weight) {
    const col = await collectionRef(STORES.BODYWEIGHT);
    return col.add({ date, weight });
  }

  async function getBodyWeightLog() {
    const all = await getAllFromCollection(STORES.BODYWEIGHT);
    return all.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /* ================================================================
     API PÚBLICA — RECORDES PESSOAIS (detecção de progressão)
  ================================================================ */
  async function getRecord(exerciseId) {
    const col = await collectionRef(STORES.RECORDS);
    const snap = await col.doc(exerciseId).get();
    return snap.exists ? snap.data() : null;
  }

  async function setRecord(exerciseId, exerciseName, weight, date) {
    const col = await collectionRef(STORES.RECORDS);
    return col.doc(exerciseId).set({ exerciseId, exerciseName, maxWeight: weight, date });
  }

  async function checkAndUpdateRecord(exerciseId, exerciseName, weight, date) {
    const current = await getRecord(exerciseId);
    if (!current || weight > current.maxWeight) {
      await setRecord(exerciseId, exerciseName, weight, date);
      return true;
    }
    return false;
  }

  /* ================================================================
     API PÚBLICA — HIDRATAÇÃO (consumo de água por dia)
  ================================================================ */
  function todayDateKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  async function getWaterToday() {
    const col = await collectionRef(STORES.WATERLOG);
    const snap = await col.doc(todayDateKey()).get();
    return snap.exists ? snap.data().ml : 0;
  }

  async function addWaterMl(amountMl) {
    const col = await collectionRef(STORES.WATERLOG);
    const key = todayDateKey();
    const snap = await col.doc(key).get();
    const newTotal = Math.max(0, (snap.exists ? snap.data().ml : 0) + amountMl);
    await col.doc(key).set({ date: key, ml: newTotal });
    return newTotal;
  }

  async function resetWaterToday() {
    const col = await collectionRef(STORES.WATERLOG);
    const key = todayDateKey();
    await col.doc(key).set({ date: key, ml: 0 });
    return 0;
  }

  /* ================================================================
     API PÚBLICA — PROGRAMA / MESOCICLO ATUAL
     (guardado como campo "program" no documento raiz do usuário)
  ================================================================ */
  async function getProgram() {
    await open();
    const snap = await userDocRef().get();
    return snap.exists ? (snap.data().program || null) : null;
  }

  async function saveProgram(programData) {
    await open();
    return userDocRef().set({ program: programData }, { merge: true });
  }

  /* ================================================================
     API PÚBLICA — BACKUP / RESTAURAÇÃO / RESET
  ================================================================ */
  async function exportAll() {
    const [profile, settings, plans, history, bodyweight, records, waterLog, program] = await Promise.all([
      getProfile(),
      getSettings(),
      getAllWorkoutDays(),
      getHistory(),
      getBodyWeightLog(),
      getAllFromCollection(STORES.RECORDS),
      getAllFromCollection(STORES.WATERLOG),
      getProgram()
    ]);
    return {
      exportedAt: new Date().toISOString(),
      version: 'cloud-1',
      profile, settings, plans, history, bodyweight, records, waterLog, program
    };
  }

  async function importAll(data) {
    if (!data || typeof data !== 'object') throw new Error('Arquivo de backup inválido.');

    await clearCollection(STORES.WORKOUT_PLAN);
    await clearCollection(STORES.HISTORY);
    await clearCollection(STORES.BODYWEIGHT);
    await clearCollection(STORES.RECORDS);
    await clearCollection(STORES.WATERLOG);

    if (data.profile) await saveProfile(data.profile);
    if (data.settings) await saveSettings(data.settings);
    if (Array.isArray(data.plans)) for (const p of data.plans) await saveWorkoutDay(p.day, p.name, p.exercises);
    if (Array.isArray(data.history)) for (const h of data.history) await addHistoryEntry(h);
    if (Array.isArray(data.bodyweight)) for (const b of data.bodyweight) await addBodyWeight(b.date, b.weight);
    if (Array.isArray(data.records)) for (const r of data.records) await setRecord(r.exerciseId, r.exerciseName, r.maxWeight, r.date);
    if (Array.isArray(data.waterLog)) {
      const col = await collectionRef(STORES.WATERLOG);
      for (const w of data.waterLog) await col.doc(w.date).set(w);
    }
    if (data.program) await saveProgram(data.program);

    return true;
  }

  async function resetAll() {
    await userDocRef().set(
      { profile: firebase.firestore.FieldValue.delete(), settings: firebase.firestore.FieldValue.delete(), program: firebase.firestore.FieldValue.delete() },
      { merge: true }
    );
    await clearCollection(STORES.WORKOUT_PLAN);
    await clearCollection(STORES.HISTORY);
    await clearCollection(STORES.BODYWEIGHT);
    await clearCollection(STORES.RECORDS);
    await clearCollection(STORES.WATERLOG);
    return true;
  }

  /* --------------------------------------------------------------
     Exposição pública do módulo (mesma "forma" do db-local.js)
  -------------------------------------------------------------- */
  return {
    STORES,
    open,
    getProfile, saveProfile,
    getSettings, saveSettings,
    getWorkoutDay, getAllWorkoutDays, saveWorkoutDay,
    addHistoryEntry, getHistory, getHistoryByDateRange,
    addBodyWeight, getBodyWeightLog,
    getRecord, setRecord, checkAndUpdateRecord,
    getWaterToday, addWaterMl, resetWaterToday,
    getProgram, saveProgram,
    exportAll, importAll, resetAll
  };
})();

window.DBCloud = DBCloud;
