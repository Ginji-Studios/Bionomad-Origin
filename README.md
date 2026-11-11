# Bionomad Origin

Videogioco 2D realizzato con Phaser. Durante lo sviluppo l'input della pianta e simulato tramite tastiera; in seguito verra sostituito da `SerialPlantInput`.

## Avvio

```bash
npm install
npm run dev
```

## Struttura

- `src/scenes`: schermate Phaser.
- `src/entities`: giocatore e NPC.
- `src/systems`: comportamento globale degli NPC.
- `src/input`: input simulato e futura connessione Arduino.
- `src/config`: configurazione del gioco e dei sensori.