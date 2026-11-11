# Bionomad Origin · O₂RIGIN

Videogioco 2D realizzato con Phaser. Durante lo sviluppo l'input della pianta è simulato da tastiera; in seguito verrà sostituito da `SerialPlantInput`.

## Avvio

```bash
npm install
npm run dev
```

## Come funziona una run

1. **Menu** → GIOCA
2. **Origine**: Nuova Delhi (estremo), Milano (difficile), Reykjavík (facile). La difficoltà è l'inquinamento (PM2.5): più è alto, più in fretta cala l'ossigeno. Cambia anche l'aspetto del personaggio.
3. **Cutscene**: il cittadino indossa BIONOMAD+ ed esce di casa.
4. **3 eventi** pescati a caso tra 10 in `src/config/events.js` (5 nel gioco, 5 sulla pianta vera), giocati in ordine di orario. Tra un evento e l'altro si attraversa la città a piedi.
5. **Fine giornata** (tutte le task completate) oppure **Task fallite · Game over** (ossigeno a zero).

Comandi: WASD / frecce per muoversi, SPAZIO per interagire, ESC per il menu.

## Pianta vera (Elegoo UNO R3)

Gli eventi sulla pianta leggono i sensori dell'Elegoo via USB con la Web Serial API.

1. Carica `arduino/o2rigin_plant/o2rigin_plant.ino` sull'Elegoo (serve la libreria **CapacitiveSensor** di Paul Stoffregen). Lo schema dei collegamenti è in cima allo sketch.
2. Avvia il gioco con `npm run dev` e aprilo in **Chrome o Edge** (`http://localhost:...`).
3. Nel menu scegli **COLLEGA PIANTA** e seleziona la porta dell'Elegoo.

| Sensore | Pin | Usato in |
| --- | --- | --- |
| Fotoresistenza (luce) | A0 | Bus mattina (copri), emergenza (illumina) |
| Termistore NTC 10k | A1 | Ufficio condizionatore, bus perso, emergenza (scalda) |
| Contatti fiale | D2, D3 | Casa sera (fertilizzante) |
| Foglie capacitive sx / dx | D4 → D5 / D6 | Movimento del personaggio, emergenza |
| LED rossi / verde | D9, D10 / D11 | Emergenza / task riuscita |

Senza pianta collegata si gioca da tastiera: **C** copri, **I** illumina, **H** scalda, **V** inserisci fiala, **Q / E** tocca foglia sinistra / destra.

## Struttura

- `src/config/events.js`: eventi e task. Per aggiungere un evento basta una nuova voce con `location` e `steps` (tipi: pickup, use, useSelf, talk, confirm, hold, prune, sit, exit).
- `src/config/origins.js`: città, PM2.5 e velocità di consumo dell'ossigeno.
- `src/systems/RunManager.js`: stato della run (eventi estratti, ossigeno, risultati).
- `src/world/locations.js`: location (ufficio, food truck, fermata bus, casa) con ostacoli per le collisioni e punti interattivi.
- `src/scenes`: Menu, Origine, Intro, Evento, Fine, Tutorial, Crediti.
- `src/ui/theme.js`: palette BIODOM, font pixel, HUD ossigeno, pannelli, transizioni.
- `src/ui/pixelSprites.js`: sprite pixel-art generati da codice (personaggi, zaino, piante, oggetti).
- `src/input`: input simulato e futura connessione Arduino.

Font: Press Start 2P e VT323 (SIL Open Font License, vedi `public/fonts`).
