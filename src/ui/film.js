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

// bande ai lati del gioco: blu petrolio scuro con macchie di luce ardesia sfocate (come una
// foto fuori fuoco) e una grana fitta sopra. Ferme, dietro al canvas: si vedono solo dove il
// gioco non arriva (schermi più larghi o più alti di 16:10).
export function bandBackdrop() {
  if (document.getElementById("film-bands")) return;
  const blobs = [
    [10, 22, 16, 20, 0.5],
    [3, 70, 12, 18, 0.35],
    [16, 88, 14, 12, 0.3],
    [88, 18, 14, 16, 0.32],
    [95, 55, 12, 22, 0.45],
    [84, 86, 16, 14, 0.38],
    [50, 6, 20, 8, 0.25],
    [48, 96, 22, 8, 0.25]
  ]
    .map(([x, y, w, h, a]) => `radial-gradient(ellipse ${w}% ${h}% at ${x}% ${y}%, rgba(125,148,165,${a}) 0%, rgba(88,114,132,${a * 0.45}) 45%, rgba(46,67,80,0) 100%)`)
    .join(", ");
  const style = document.createElement("style");
  style.id = "film-bands";
  style.textContent = `
    html, body {
      background-color: #16222a;
      background-image: url(${noiseTile(192)}), ${blobs}, linear-gradient(160deg, #23343f 0%, #172229 55%, #1d2c35 100%);
      background-size: 192px 192px, cover, cover, cover, cover, cover, cover, cover, cover, cover;
      background-blend-mode: overlay, normal, normal, normal, normal, normal, normal, normal, normal, normal;
      background-attachment: fixed;
    }
  `;
  document.head.appendChild(style);
}
