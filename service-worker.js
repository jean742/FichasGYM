/* ================================================================
   GYM PRO — timer.js
   Cronômetro circular de descanso entre séries.
   Recursos: presets (30/45/60/90/120/180s), animação do anel SVG,
   som de finalização (Web Audio API, sem arquivos externos),
   vibração (quando disponível) e contagem regressiva precisa
   baseada em timestamp (evita atraso acumulado do setInterval).
================================================================ */

const Timer = (() => {

  const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * 90; // r=90 (definido no SVG do index.html)

  let totalSeconds = 60;
  let remainingSeconds = 60;
  let isRunning = false;
  let intervalId = null;
  let endTimestamp = null;

  let els = {}; // cache dos elementos DOM, preenchido em init()

  function init() {
    els = {
      display: document.getElementById('timer-display'),
      progressCircle: document.getElementById('timer-progress-circle'),
      toggleBtn: document.getElementById('timer-btn-toggle'),
      resetBtn: document.getElementById('timer-btn-reset'),
      skipBtn: document.getElementById('timer-btn-skip'),
      presets: document.querySelectorAll('.timer-preset')
    };

    if (els.progressCircle) {
      els.progressCircle.style.strokeDasharray = CIRCLE_CIRCUMFERENCE;
      els.progressCircle.style.strokeDashoffset = 0;
    }

    els.presets.forEach((btn) => {
      btn.addEventListener('click', () => {
        els.presets.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        setDuration(parseInt(btn.dataset.seconds, 10));
      });
    });

    els.toggleBtn?.addEventListener('click', toggle);
    els.resetBtn?.addEventListener('click', () => reset());
    els.skipBtn?.addEventListener('click', finish);

    render();
  }

  /* Define uma nova duração total (usado pelos presets) */
  function setDuration(seconds) {
    pause();
    totalSeconds = seconds;
    remainingSeconds = seconds;
    render();
  }

  /* Inicia ou pausa a contagem */
  function toggle() {
    isRunning ? pause() : start();
  }

  function start() {
    if (isRunning || remainingSeconds <= 0) return;
    isRunning = true;
    endTimestamp = Date.now() + remainingSeconds * 1000;
    if (els.toggleBtn) els.toggleBtn.textContent = 'Pausar';

    intervalId = setInterval(tick, 200); // 200ms para precisão sem pesar na bateria
  }

  function pause() {
    isRunning = false;
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
    if (els.toggleBtn) els.toggleBtn.textContent = 'Continuar';
  }

  function reset() {
    pause();
    remainingSeconds = totalSeconds;
    if (els.toggleBtn) els.toggleBtn.textContent = 'Iniciar';
    render();
  }

  function tick() {
    const msLeft = endTimestamp - Date.now();
    remainingSeconds = Math.max(0, Math.round(msLeft / 1000));
    render();
    if (msLeft <= 0) finish();
  }

  function finish() {
    pause();
    remainingSeconds = 0;
    render();
    playSound();
    vibrate();
    if (els.toggleBtn) els.toggleBtn.textContent = 'Iniciar';
    // Pequeno atraso para o usuário ver "00:00" antes de resetar visualmente
    setTimeout(() => {
      remainingSeconds = totalSeconds;
      render();
    }, 1200);
  }

  /* Atualiza o texto MM:SS e o progresso do anel SVG */
  function render() {
    if (!els.display) return;
    const mm = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
    const ss = String(remainingSeconds % 60).padStart(2, '0');
    els.display.textContent = `${mm}:${ss}`;

    const progressRatio = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
    const offset = CIRCLE_CIRCUMFERENCE * (1 - progressRatio);
    if (els.progressCircle) {
      els.progressCircle.style.strokeDashoffset = offset;
      els.progressCircle.classList.toggle('warning', remainingSeconds <= 5 && remainingSeconds > 0);
      els.progressCircle.classList.toggle('finished', remainingSeconds === 0);
    }
  }

  /* --------------------------------------------------------------
     Som de finalização via Web Audio API (sem arquivos de áudio
     externos — totalmente offline e compatível com Safari/iOS).
  -------------------------------------------------------------- */
  function playSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      [880, 1175].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, now + i * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.35, now + i * 0.18 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.25);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.18);
        osc.stop(now + i * 0.18 + 0.3);
      });

      setTimeout(() => ctx.close(), 800);
    } catch (err) {
      console.warn('[Timer] Áudio não disponível neste navegador:', err);
    }
  }

  /* Vibração — iOS Safari não suporta a Vibration API, então
     verificamos a existência antes de chamar (evita erros). */
  function vibrate() {
    if ('vibrate' in navigator) {
      navigator.vibrate([120, 60, 120]);
    }
  }

  /* Abre o cronômetro já configurado com uma duração específica
     (chamado pela tela de detalhe do exercício). */
  function openWithDuration(seconds) {
    setDuration(seconds);
    els.presets.forEach((b) => b.classList.toggle('active', parseInt(b.dataset.seconds, 10) === seconds));
    start();
  }

  return { init, setDuration, start, pause, reset, toggle, openWithDuration };
})();

window.Timer = Timer;
