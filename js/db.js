/* ================================================================
   GYM PRO — db.js
   Camada de persistência 100% baseada em IndexedDB.
   Nunca usamos apenas localStorage — todo dado estruturado
   (treinos, histórico, cargas, peso corporal, configurações)
   fica no IndexedDB, que suporta muito mais dados e consultas.
================================================================ */

const DB = (() => {

  const DB_NAME = 'GymProDB';
  const DB_VERSION = 2;

  // Nomes das object stores (equivalentes a "tabelas")
  const STORES = {
    PROFILE: 'profile',           // dados do usuário (registro único, id=1)
    SETTINGS: 'settings',         // preferências do app (registro único, id=1)
    WORKOUT_PLAN: 'workoutPlan',  // treino planejado por dia da semana (keyPath: day)
    HISTORY: 'history',           // histórico de treinos concluídos (autoIncrement)
    BODYWEIGHT: 'bodyweight',     // log de peso corporal ao longo do tempo (autoIncrement)
    RECORDS: 'records',            // recordes pessoais por exercício (keyPath: exerciseId)
    WATERLOG: 'waterLog'           // consumo de água por dia (keyPath: date, 1 registro/dia)
  };

  let dbInstance = null;

  /* --------------------------------------------------------------
     Abre (ou cria/atualiza) o banco de dados.
     Retorna uma Promise<IDBDatabase>.
  -------------------------------------------------------------- */
  function open() {
    return new Promise((resolve, reject) => {
      if (dbInstance) return resolve(dbInstance);

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(STORES.PROFILE)) {
          db.createObjectStore(STORES.PROFILE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.WORKOUT_PLAN)) {
          db.createObjectStore(STORES.WORKOUT_PLAN, { keyPath: 'day' });
        }
        if (!db.objectStoreNames.contains(STORES.HISTORY)) {
          const historyStore = db.createObjectStore(STORES.HISTORY, { keyPath: 'id', autoIncrement: true });
          historyStore.createIndex('byDate', 'date', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.BODYWEIGHT)) {
          const bwStore = db.createObjectStore(STORES.BODYWEIGHT, { keyPath: 'id', autoIncrement: true });
          bwStore.createIndex('byDate', 'date', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.RECORDS)) {
          db.createObjectStore(STORES.RECORDS, { keyPath: 'exerciseId' });
        }
        if (!db.objectStoreNames.contains(STORES.WATERLOG)) {
          db.createObjectStore(STORES.WATERLOG, { keyPath: 'date' });
        }
      };

      request.onsuccess = (event) => {
        dbInstance = event.target.result;
        resolve(dbInstance);
      };

      request.onerror = (event) => {
        console.error('[DB] Erro ao abrir o banco de dados:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  /* --------------------------------------------------------------
     Helpers genéricos de transação
  -------------------------------------------------------------- */
  async function tx(storeName, mode = 'readonly') {
    const db = await open();
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function put(storeName, value) {
    const store = await tx(storeName, 'readwrite');
    return requestToPromise(store.put(value));
  }

  async function get(storeName, key) {
    const store = await tx(storeName, 'readonly');
    return requestToPromise(store.get(key));
  }

  async function getAll(storeName) {
    const store = await tx(storeName, 'readonly');
    return requestToPromise(store.getAll());
  }

  async function del(storeName, key) {
    const store = await tx(storeName, 'readwrite');
    return requestToPromise(store.delete(key));
  }

  async function clearStore(storeName) {
    const store = await tx(storeName, 'readwrite');
    return requestToPromise(store.clear());
  }

  /* ================================================================
     API PÚBLICA — PERFIL DO USUÁRIO
  ================================================================ */
  async function getProfile() {
    const profile = await get(STORES.PROFILE, 1);
    return profile || {
      id: 1,
      name: '',
      photo: '',
      age: null,
      weight: null,
      height: null,
      goal: 'hipertrofia',
      experience: 'iniciante',
      trainingLocation: 'academia',
      weekDaysGoal: 5,
      sessionMinutes: 60
    };
  }

  async function saveProfile(profileData) {
    return put(STORES.PROFILE, { ...profileData, id: 1 });
  }

  /* ================================================================
     API PÚBLICA — CONFIGURAÇÕES
  ================================================================ */
  async function getSettings() {
    const settings = await get(STORES.SETTINGS, 1);
    return settings || {
      id: 1,
      theme: 'dark',
      accentColor: '#3D8BFF',
      soundEnabled: true,
      vibrationEnabled: true
    };
  }

  async function saveSettings(settingsData) {
    return put(STORES.SETTINGS, { ...settingsData, id: 1 });
  }

  /* ================================================================
     API PÚBLICA — PLANO DE TREINO (por dia da semana)
     day: 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom'
  ================================================================ */
  async function getWorkoutDay(day) {
    const plan = await get(STORES.WORKOUT_PLAN, day);
    return plan || { day, name: '', exercises: [] };
  }

  async function getAllWorkoutDays() {
    return getAll(STORES.WORKOUT_PLAN);
  }

  async function saveWorkoutDay(day, name, exercises) {
    return put(STORES.WORKOUT_PLAN, { day, name, exercises });
  }

  /* ================================================================
     API PÚBLICA — HISTÓRICO DE TREINOS CONCLUÍDOS
  ================================================================ */
  async function addHistoryEntry(entry) {
    // entry: { date, day, workoutName, exercises: [...], durationSeconds, volume, calories }
    return put(STORES.HISTORY, entry);
  }

  async function getHistory() {
    const all = await getAll(STORES.HISTORY);
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
    return put(STORES.BODYWEIGHT, { date, weight });
  }

  async function getBodyWeightLog() {
    const all = await getAll(STORES.BODYWEIGHT);
    return all.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /* ================================================================
     API PÚBLICA — RECORDES PESSOAIS (detecção de progressão)
  ================================================================ */
  async function getRecord(exerciseId) {
    return get(STORES.RECORDS, exerciseId);
  }

  async function setRecord(exerciseId, exerciseName, weight, date) {
    return put(STORES.RECORDS, { exerciseId, exerciseName, maxWeight: weight, date });
  }

  /**
   * Verifica se um novo peso registrado bate o recorde pessoal do exercício.
   * Se sim, atualiza o recorde e retorna true (para exibir a animação "Novo Recorde!").
   */
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
    const entry = await get(STORES.WATERLOG, todayDateKey());
    return entry ? entry.ml : 0;
  }

  async function addWaterMl(amountMl) {
    const key = todayDateKey();
    const current = await get(STORES.WATERLOG, key);
    const newTotal = Math.max(0, (current ? current.ml : 0) + amountMl);
    await put(STORES.WATERLOG, { date: key, ml: newTotal });
    return newTotal;
  }

  async function resetWaterToday() {
    await put(STORES.WATERLOG, { date: todayDateKey(), ml: 0 });
    return 0;
  }

  /* ================================================================
     API PÚBLICA — BACKUP / RESTAURAÇÃO / RESET
  ================================================================ */
  async function exportAll() {
    const [profile, settings, plans, history, bodyweight, records, waterLog] = await Promise.all([
      getProfile(),
      getSettings(),
      getAllWorkoutDays(),
      getHistory(),
      getBodyWeightLog(),
      getAll(STORES.RECORDS),
      getAll(STORES.WATERLOG)
    ]);
    return {
      exportedAt: new Date().toISOString(),
      version: DB_VERSION,
      profile, settings, plans, history, bodyweight, records, waterLog
    };
  }

  async function importAll(data) {
    if (!data || typeof data !== 'object') throw new Error('Arquivo de backup inválido.');

    await clearStore(STORES.PROFILE);
    await clearStore(STORES.SETTINGS);
    await clearStore(STORES.WORKOUT_PLAN);
    await clearStore(STORES.HISTORY);
    await clearStore(STORES.BODYWEIGHT);
    await clearStore(STORES.RECORDS);
    await clearStore(STORES.WATERLOG);

    if (data.profile) await put(STORES.PROFILE, { ...data.profile, id: 1 });
    if (data.settings) await put(STORES.SETTINGS, { ...data.settings, id: 1 });
    if (Array.isArray(data.plans)) for (const p of data.plans) await put(STORES.WORKOUT_PLAN, p);
    if (Array.isArray(data.history)) for (const h of data.history) await put(STORES.HISTORY, h);
    if (Array.isArray(data.bodyweight)) for (const b of data.bodyweight) await put(STORES.BODYWEIGHT, b);
    if (Array.isArray(data.records)) for (const r of data.records) await put(STORES.RECORDS, r);
    if (Array.isArray(data.waterLog)) for (const w of data.waterLog) await put(STORES.WATERLOG, w);

    return true;
  }

  async function resetAll() {
    await clearStore(STORES.PROFILE);
    await clearStore(STORES.SETTINGS);
    await clearStore(STORES.WORKOUT_PLAN);
    await clearStore(STORES.HISTORY);
    await clearStore(STORES.BODYWEIGHT);
    await clearStore(STORES.RECORDS);
    await clearStore(STORES.WATERLOG);
    return true;
  }

  /* --------------------------------------------------------------
     Exposição pública do módulo
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
    exportAll, importAll, resetAll
  };
})();

// Disponibiliza globalmente para os outros módulos (ui.js, app.js, charts.js...)
window.DB = DB;
