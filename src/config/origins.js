// Origini selezionabili. Difficoltà = inquinamento dell'aria (PM2.5, µg/m³, media annua).
// Valori dalla tavola di progetto (fonte indicata: IQAir 2024). Limite OMS: 5 µg/m³.
// drainSeconds = secondi per svuotare la barra dell'ossigeno durante un evento.
// Ordinate dalla più facile alla più difficile.
export const ORIGINS = [
  { id: "reykjavik", city: "REYKJAVIK", label: "Reykjavík", country: "ISLANDA", flag: "flag_is", pm25: 3.8, level: 1, difficulty: "FACILE", color: 0x5c7a6b, drainSeconds: 130 },
  { id: "milano", city: "MILANO", label: "Milano", country: "ITALIA", flag: "flag_it", pm25: 18.1, level: 3, difficulty: "DIFFICILE", color: 0xc98552, drainSeconds: 75 },
  { id: "delhi", city: "NUOVA DELHI", label: "Nuova Delhi", country: "INDIA", flag: "flag_in", pm25: 108.3, level: 4, difficulty: "ESTREMO", color: 0xb4553f, drainSeconds: 45 }
];

export function getOrigin(registry) {
  const run = registry.get("run");
  const id = run?.origin ?? registry.get("origin");
  return ORIGINS.find((origin) => origin.id === id) ?? ORIGINS[1];
}
