# Bionomad Origin · O₂RIGIN

Videogioco 2D realizzato con Phaser. La pianta vera (Elegoo UNO R3) si collega via Web Serial; senza pianta l'input è simulato da tastiera.

## Avvio

```bash
npm install
npm run dev
```

Da telefono sulla stessa Wi-Fi: `npm run dev -- --host` e apri l'indirizzo "Network" che stampa Vite.

## Pubblicazione online (GitHub Pages)

Il workflow `.github/workflows/deploy.yml` fa la build e pubblica il gioco a ogni push su `main`.
Una sola volta: nella repo su GitHub → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
Il gioco sarà su `https://<utente-o-organizzazione>.github.io/Bionomad-Origin/`.
`vite.config.js` usa `base: "./"`, quindi la build funziona in qualsiasi sottocartella o hosting.

## Come funziona una run

1. **Menu** → GIOCA
2. **Origine**: Reykjavík (facile), Milano (medio), Nuova Delhi (difficile). Più è alto il PM2.5, più in fretta cala l'ossigeno, più lentamente si ricarica (`regen` in `origins.js`) e più fitto è lo smog in città (`smog`). Cambia anche l'aspetto del personaggio, e il numero di task per evento:
   - **Facile**: solo la task dell'evento.
   - **Medio**: + una task di cura in più (illuminala, scaldala, nutrila, dalle un sorso).
   - **Difficile**: + una cura e + un rimedio a una negligenza (leva lasciata aperta, fiala sbagliata nel pozzetto, pianta surriscaldata o rimasta al buio).
   Dopo l'origine si sceglie **uomo o donna** (stessi frame di animazione, capelli diversi).
3. **Cutscene**: il cittadino indossa BIONOMAD+ ed esce di casa.
4. **3 eventi** pescati a caso tra 11 in `src/config/events.js` (5 nel gioco, 5 sulla pianta vera), giocati in ordine di orario. Tra un evento e l'altro si attraversa la città a piedi.
5. **Fine giornata** (tutte le task completate) oppure **Task fallite · Game over**: con l'ossigeno a zero il cittadino sviene, lo zaino cade e il vaso si rovescia.

Comandi: WASD / frecce per muoversi, SPAZIO per interagire, ESC per il menu, M per attivare / disattivare l'audio (sintetizzato con Web Audio, nessun file), P per mettere in pausa tutto il gioco (pausa per il team durante le presentazioni).

### Negligenze

Ogni negligenza costa ossigeno e viene contata nel recap finale:

- **Scordarsela**: non scaldarla / raffreddarla entro il tempo indicato (la richiesta resta e il conto si ripete).
- **Scottarla**: scaldarla molto oltre il richiesto.
- **Allagarla**: lasciare aperta la leva dell'acqua (in qualsiasi momento, non solo durante l'irrigazione).
- **Fiala sbagliata**: inserire nel pozzetto una fiala del colore che non corrisponde.
- **Coprirla troppo**: tenerla al buio costa ossigeno.

## Pianta vera (Elegoo UNO R3)

Gli eventi sulla pianta leggono i sensori dell'Elegoo via USB con la Web Serial API a 9600 baud. Per il movimento,
il firmware può inviare una riga `DESTRA` o `SINISTRA` ogni 50 ms: il gioco la mantiene attiva per 150 ms.
La riga `STOP` arresta immediatamente il movimento.

1. Carica sull'Elegoo lo sketch della pianta (non è incluso in questa repo). Serve la libreria **Adafruit PN532** (con la dipendenza **Adafruit BusIO**, che l'IDE propone da sola): DHT11 e foglie capacitive sono letti direttamente dallo sketch.
   - **Fiale NFC**: ogni fiala ha un adesivo NFC nel tappo. Apri il Monitor seriale, avvicina una fiala al PN532 e copia l'UID stampato (`# NFC sconosciuto, UID: {...}`) nella tabella `VIAL_TAGS` dello sketch, accanto al colore giusto.
2. Avvia il gioco con `npm run dev` e aprilo in **Chrome o Edge** (`http://localhost:...`).
3. Nel menu scegli **COLLEGA PIANTA** e seleziona la porta dell'Elegoo.

| Azione sulla pianta | Sensore | Pin | Usato in |
| --- | --- | --- | --- |
| Puntare la torcia / coprire il vaso | Fotoresistenza | A0 | Bus mattina (copri), emergenza (illumina) |
| Torcia termica (scalda / raffredda) | DHT11 | D12 | Ufficio condizionatore, bus perso, ondata di calore, emergenza |
| Toccare le piante laterali | Elettrodi a foglia sx / dx (1M) | D4 → D5 / D6 | Movimento del personaggio |
| Leva dell'acqua | Interruttore a levetta + pompa (relè) | D7 / D8 | Food truck · acqua, emergenza |
| Fiale nel pozzetto | Lettore NFC PN532 (I2C) + adesivo NFC nel tappo | A4 SDA, A5 SCL, D2 IRQ, D3 RESET | Casa sera (fertilizzante), task extra |
| LED rossi / verde | — | D9, D10 / D11 | Emergenza / task riuscita |

Senza pianta collegata si gioca da tastiera: **C** copri, **I** torcia, **H** scalda, **F** raffredda, **R** apre / chiude la leva dell'acqua, **1 / 2 / 3** inserisci fiala verde / blu / rossa, **0** togli fiala, **Q / E** tocca foglia sinistra / destra. Su telefono e tablet compaiono i comandi touch; il pulsante **⛶** in alto attiva o disattiva il fullscreen.

## Struttura

- `src/config/events.js`: eventi e task. Per aggiungere un evento basta una nuova voce con `location` e `steps` (tipi: pickup, use, useSelf, talk, confirm, hold, prune, sit, exit).
- `src/config/origins.js`: città, PM2.5 e velocità di consumo dell'ossigeno.
- `src/systems/RunManager.js`: stato della run (eventi estratti, ossigeno, risultati).
- `src/art/places.js`: luoghi degli eventi (casa, ufficio, bus, fermata, food truck), diversi per città, con i punti interattivi.
- `src/scenes`: Boot, Preload, Menu, Selezione città e operatore, Intro, Percorso, Evento, Outro, Fine, Tutorial, Crediti, Pausa.
- `src/world/skyline.js`: skyline vettoriali delle città, quartieri con i monumenti veri, giorno e notte.
- `src/systems/Sfx.js`: effetti sonori e ambiente sintetizzati.
- `src/ui/hud.js`: palette BIODOM, HUD del respiro, pannello task, pulsanti, titoli vettoriali, transizioni.
- `src/art/people.js`: operatori, passanti e ritratti del team disegnati da codice nello stile illustrato vettoriale.
- `src/input/PlantSensors.js`: lettura della pianta via Web Serial e simulazione da tastiera.

Font: Roboto Mono (Google Fonts, caricato in `index.html`).
