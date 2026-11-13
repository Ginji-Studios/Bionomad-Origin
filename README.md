# Bionomad · O₂RIGIN

Videogioco 2D per il Laboratorio di Sintesi C1 di Design della Comunicazione per il Politecnico di Milano, realizzato con Phaser.
Durante lo sviluppo l'input della pianta è simulato da tastiera; in seguito verrà sostituito da `SerialPlantInput`.

## Avvio del gioco

```bash
npm install
npm run dev
```

## Come funziona una run

1. **Menu** → GIOCA
2. **Origine**: Reykjavík (facile), Milano (medio), Nuova Delhi (difficile). Più è alto il PM2.5, più in fretta cala l'ossigeno, più lentamente si ricarica (`regen` in `origins.js`) e più fitti sono smog e aloni in città (`smog`). Cambia anche l'aspetto del personaggio, e il numero di task per evento:
   - **Facile**: solo la task dell'evento.
   - **Medio**: + una task di cura in più (illuminala, scaldala, nutrila, dalle un sorso).
   - **Difficile**: + una cura e + un rimedio a una negligenza (leva lasciata aperta, fiala sbagliata nel pozzetto, pianta surriscaldata o rimasta al buio).
   Dopo l'origine si sceglie **uomo o donna** (stessi frame di animazione, capelli diversi).
3. **Cutscene**: il cittadino indossa BIONOMAD+ ed esce di casa.
4. **3 eventi** pescati a caso tra 10 in `src/config/events.js` (5 nel gioco, 5 sulla pianta vera), giocati in ordine di orario. Tra un evento e l'altro si attraversa la città a piedi.
5. **Fine giornata** (tutte le task completate) oppure **Task fallite · Game over**: con l'ossigeno a zero il cittadino sviene, lo zaino cade e il vaso si rovescia.

Comandi: WASD / frecce per muoversi, SPAZIO per interagire, ESC per il menu (in attesa del collegamento con la pianta che farà da controller).

### Gesti di cura

Ogni gesto di cura aumenta il livello di ossigeno del giocatore e permette di determinare il finale corretto:

- **Illuminazione**: puntare la torcia per prendersi cura della pianta e farla crescere.
- **Idratazione**: attivare la leva per permettere l'idratazione della pianta.
- **Termo-regolazione**: utilizzare la torcia termica per gestire la temperatura della pianta.
- **Nutrizione**: inserire la fiala corretta nel momento del bisogno.

### Negligenze

Ogni negligenza costa ossigeno e viene contata nel recap finale. I messaggi mostrati nel gioco sono:

- **SHOCK TERMICO · non l'hai curata in tempo!**: non scaldarla o raffreddarla entro il tempo indicato (la richiesta resta e il conto si ripete).
- **SHOCK TERMICO · troppo calore, l'hai scottata!**: scaldarla molto oltre il valore richiesto.
- **IPER-IDRATAZIONE · leva dell'acqua aperta!**: lasciare aperta la leva dell'acqua, anche fuori dall'irrigazione.
- **INTOSSICAZIONE · fiala sbagliata, toglila!**: inserire nel pozzetto una fiala di colore diverso da quello richiesto.

L'obiettivo **L'HAI LASCIATA AL BUIO** appartiene invece alle task della pianta: richiede di scoprire e illuminare il vaso.

## Pianta vera collegata al microcontrollore tramite elettrodi (Elegoo UNO R3)

Gli eventi sulla pianta leggono i sensori dell'Elegoo via USB con la Web Serial API.

1. Carica `arduino/o2rigin_plant/o2rigin_plant.ino` sull'Elegoo (utilizza la libreria **CapacitiveSensor** di Paul Stoffregen). Lo schema dei collegamenti è in cima allo sketch.
2. Avvia il gioco con `npm run dev` e aprilo in **Chrome o Edge** (`http://localhost:...`).
3. Nel menu scegli **COLLEGA PIANTA** e seleziona la porta seriale dell'Elegoo.

| Azione sulla pianta | Sensore | Pin | Usato in |
| --- | --- | --- | --- |
| Puntare la torcia / coprire il vaso | Fotoresistenza | A0 | Bus mattina (copri), emergenza (illumina) |
| Torcia termica (scalda / raffredda) | Termistore NTC 10k | A1 | Ufficio condizionatore, bus perso, ondata di calore, emergenza |
| Toccare le piante laterali | Foglie capacitive sx / dx | D4 → D5 / D6 | Movimento del personaggio |
| Pulsante irrigazione | Pulsante + pompa (relè) | D7 / D8 | Food truck · acqua, emergenza |
| Fiale colorate nel pozzetto | Resistenza nel tappo (verde 1k, blu 4.7k, rossa 10k) | A2, A3 | Casa sera (fertilizzante), task extra |
| LED rossi / verde | — | D9, D10 / D11 | Emergenza / task riuscita |

Senza pianta collegata si gioca da tastiera (per ora; nella versione finale la pianta sarà il controller): **C** copri, **I** torcia, **H** scalda, **F** raffredda, **R** apre / chiude la leva dell'acqua, **1 / 2 / 3** inserisci fiala verde / blu / rossa, **0** togli fiala, **Q / E** tocca foglia sinistra / destra. Su telefono e tablet compaiono solo i tasti dell'azione richiesta.

## Struttura del codice

- `src/config/events.js`: eventi e task. Per aggiungere un evento basta una nuova voce con `location` e `steps` (tipi: pickup, use, useSelf, talk, confirm, hold, prune, sit, exit).
- `src/config/origins.js`: città, PM2.5 e velocità di consumo dell'ossigeno.
- `src/systems/RunManager.js`: stato della run (eventi estratti, ossigeno, risultati).
- `src/world/locations.js`: location (ufficio, food truck, fermata bus, casa) con ostacoli per le collisioni e punti interattivi.
- `src/scenes`: Menu, Origine, Intro, Evento, Fine, Tutorial, Crediti.
- `src/ui/theme.js`: palette BIODOM, font pixel, HUD ossigeno, pannelli, transizioni.
- `src/ui/pixelSprites.js`: sprite pixel-art generati da codice (personaggi, zaino, piante, oggetti).
- `src/input`: input simulato e futura connessione Arduino.

Font utilizzati: Press Start 2P e VT323 (SIL Open Font License, vedi `public/fonts`).
