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
4. **3 eventi** pescati a caso da `src/config/events.js`, giocati in ordine di orario.
5. **Fine giornata** (tutte le task completate) oppure **Task fallite · Game over** (ossigeno a zero).

Comandi: WASD / frecce per muoversi, SPAZIO per interagire, ESC per il menu.

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
