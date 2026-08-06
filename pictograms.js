/* ================================================================
   GYM PRO — charts.js
   Gráficos profissionais desenhados 100% em <canvas>, sem
   nenhuma biblioteca externa (nada de Chart.js/D3).
   Suporta gráfico de barras e de linha, com eixos, grid e
   rótulos, responsivo ao devicePixelRatio (nítido em Retina/iPhone).
================================================================ */

const Charts = (() => {

  /* --------------------------------------------------------------
     Prepara o canvas para renderização nítida em telas Retina,
     ajustando a resolução real do buffer conforme o devicePixelRatio.
  -------------------------------------------------------------- */
  function prepareCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || canvas.width;
    const height = rect.height || canvas.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    return { ctx, width, height };
  }

  /* Lê as cores atuais do tema (CSS variables) para os gráficos
     acompanharem o tema claro/escuro e a cor de destaque escolhida. */
  function themeColors() {
    const styles = getComputedStyle(document.documentElement);
    return {
      accent: styles.getPropertyValue('--accent').trim() || '#3D8BFF',
      success: styles.getPropertyValue('--success').trim() || '#3DFF8C',
      grid: styles.getPropertyValue('--border').trim() || 'rgba(255,255,255,0.08)',
      textDim: styles.getPropertyValue('--text-dim').trim() || '#9A9AA3',
      text: styles.getPropertyValue('--text').trim() || '#F5F5F7'
    };
  }

  /* --------------------------------------------------------------
     GRÁFICO DE BARRAS
     data: [{ label: 'Seg', value: 1200 }, ...]
  -------------------------------------------------------------- */
  function drawBarChart(canvas, data, opts = {}) {
    const { ctx, width, height } = prepareCanvas(canvas);
    const colors = themeColors();
    const padding = { top: 16, right: 10, bottom: 26, left: 10 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const maxVal = Math.max(1, ...data.map((d) => d.value));
    const barGap = 10;
    const barW = (chartW - barGap * (data.length - 1)) / data.length;

    // Linhas de grade horizontais
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const y = padding.top + (chartH / 3) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Barras
    data.forEach((d, i) => {
      const barH = maxVal > 0 ? (d.value / maxVal) * chartH : 0;
      const x = padding.left + i * (barW + barGap);
      const y = padding.top + chartH - barH;

      const gradient = ctx.createLinearGradient(0, y, 0, padding.top + chartH);
      gradient.addColorStop(0, colors.accent);
      gradient.addColorStop(1, colors.success);

      ctx.fillStyle = gradient;
      roundRect(ctx, x, y, barW, Math.max(barH, 2), 6);
      ctx.fill();

      // Rótulo abaixo da barra
      ctx.fillStyle = colors.textDim;
      ctx.font = '11px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(d.label, x + barW / 2, height - 8);
    });
  }

  /* --------------------------------------------------------------
     GRÁFICO DE LINHA (ex: evolução de peso corporal / carga)
     data: [{ label: '01/07', value: 78.5 }, ...]
  -------------------------------------------------------------- */
  function drawLineChart(canvas, data, opts = {}) {
    const { ctx, width, height } = prepareCanvas(canvas);
    const colors = themeColors();
    const padding = { top: 20, right: 14, bottom: 26, left: 14 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    if (data.length === 0) return;

    const values = data.map((d) => d.value);
    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);
    const range = maxVal - minVal || 1;

    const stepX = data.length > 1 ? chartW / (data.length - 1) : 0;

    const pointAt = (i) => {
      const x = padding.left + i * stepX;
      const y = padding.top + chartH - ((data[i].value - minVal) / range) * chartH;
      return { x, y };
    };

    // Grade horizontal
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const y = padding.top + (chartH / 3) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Área preenchida sob a linha (gradiente suave)
    const areaGradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    areaGradient.addColorStop(0, hexToRgba(colors.accent, 0.35));
    areaGradient.addColorStop(1, hexToRgba(colors.accent, 0));

    ctx.beginPath();
    data.forEach((d, i) => {
      const p = pointAt(i);
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    });
    ctx.lineTo(padding.left + chartW, padding.top + chartH);
    ctx.lineTo(padding.left, padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = areaGradient;
    ctx.fill();

    // Linha principal
    ctx.beginPath();
    data.forEach((d, i) => {
      const p = pointAt(i);
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Pontos + rótulos (apenas primeiro, meio e último para não poluir)
    const labelIndexes = new Set([0, data.length - 1, Math.floor(data.length / 2)]);
    data.forEach((d, i) => {
      const p = pointAt(i);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = colors.accent;
      ctx.fill();

      if (labelIndexes.has(i)) {
        ctx.fillStyle = colors.textDim;
        ctx.font = '10.5px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(d.label, p.x, height - 8);
      }
    });
  }

  /* --------------------------------------------------------------
     Utilitários de desenho
  -------------------------------------------------------------- */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function hexToRgba(hex, alpha) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map((ch) => ch + ch).join('');
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  return { drawBarChart, drawLineChart };
})();

window.Charts = Charts;
