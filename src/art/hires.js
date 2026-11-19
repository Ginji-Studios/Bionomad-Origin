// texture in alta risoluzione: il canvas è disegnato "ss" volte più grande, ma la texture
// si comporta come se avesse la dimensione logica (canvas / ss). Così i personaggi e i loghi
// restano nitidi e vettoriali anche quando lo schermo (o setScale) li ingrandisce.
export function addHiRes(scene, key, canvas, ss = 2) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
  const f = scene.textures.get(key).get();
  const w = canvas.width / ss;
  const h = canvas.height / ss;
  // le coordinate UV restano quelle del canvas intero (già calcolate): si cambia solo la misura di disegno
  f.cutWidth = w;
  f.cutHeight = h;
  f.width = w;
  f.height = h;
  f.halfWidth = Math.floor(w / 2);
  f.halfHeight = Math.floor(h / 2);
  f.centerX = Math.floor(w / 2);
  f.centerY = Math.floor(h / 2);
  f.data.sourceSize.w = w;
  f.data.sourceSize.h = h;
  f.data.spriteSourceSize.w = w;
  f.data.spriteSourceSize.h = h;
  f.data.radius = 0.5 * Math.sqrt(w * w + h * h);
  return key;
}
