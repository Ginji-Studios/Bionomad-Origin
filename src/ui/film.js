// Grana leggera e ferma sopra tutto il gioco (estetica del brand): niente bande verticali,
// niente movimento. È uno strato HTML sopra
// il canvas: non pesa sulle scene, non intercetta tocchi, vale per menu, gioco e cutscene.

function noiseTile(size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const x = c.getContext("2d");
  const img = x.createImageData(size, size);
  const d = img.data;
  let s = 12345;
  for (let i = 0; i < d.length; i += 4) {
    s = (s * 16807) % 2147483647;
    // grigio medio ± rumore: con "overlay" il grigio 128 è neutro, il resto scurisce/schiarisce
    const v = 128 + ((s / 2147483647) - 0.5) * 150;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return c.toDataURL();
}

export function filmOverlay(canvas, parent = document.getElementById("game")) {
  if (!parent || document.getElementById("film")) return;
  const style = document.createElement("style");
  style.textContent = `
    #film { position: absolute; inset: 0; pointer-events: none; z-index: 5; }
    #film { background-image: url(${noiseTile()}); background-size: 256px 256px; mix-blend-mode: overlay; opacity: .14; }
  `;
  document.head.appendChild(style);
  const film = document.createElement("div");
  film.id = "film";
  parent.appendChild(film);
  // la pellicola copre esattamente il canvas (non le bande nere ai lati)
  const fit = () => {
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const p = parent.getBoundingClientRect();
    [film].forEach((el) => Object.assign(el.style, { inset: "auto", left: `${r.left - p.left}px`, top: `${r.top - p.top}px`, width: `${r.width}px`, height: `${r.height}px` }));
  };
  fit();
  window.addEventListener("resize", () => setTimeout(fit, 60));
  if (window.ResizeObserver && canvas) new ResizeObserver(fit).observe(canvas);
}
