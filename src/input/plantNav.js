// comandi destra / sinistra della pianta (Arduino via seriale) nelle schermate di scelta:
// scatta una volta sola quando la direzione cambia (come premere una freccia), non a ripetizione.
// hold (facoltativo): tenendo la stessa direzione per holdMs si conferma la scelta.
import { PlantSensors } from "./PlantSensors.js";

export function plantNav(scene, { left, right, hold, holdMs = 1400 } = {}) {
  // se la pianta è già inclinata quando si apre la schermata, si aspetta che torni al centro
  let prev = PlantSensors.direction;
  let since = 0;
  let fired = true;
  const onUpdate = (_t, delta) => {
    const d = PlantSensors.direction;
    if (d && d !== prev) {
      (d < 0 ? left : right)?.();
      since = 0;
      fired = false;
    } else if (d && hold && !fired) {
      since += delta;
      if (since >= holdMs) {
        fired = true;
        hold(d);
      }
    }
    if (!d) fired = true;
    prev = d;
  };
  scene.events.on("update", onUpdate);
  scene.events.once("shutdown", () => scene.events.off("update", onUpdate));
}
