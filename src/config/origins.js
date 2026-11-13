// origini selezionabili
export const ORIGINS = [
  { id: "reykjavik", city: "REYKJAVIK", label: "Reykjavík", country: "ISLANDA", flag: "flag_is", pm25: 3.8, level: 1, difficulty: "FACILE", tasks: "1 TASK", extras: { care: 0, fix: 0 }, color: 0x5c7a6b, drainSeconds: 130, regen: 1, smog: 0 },
  { id: "milano", city: "MILANO", label: "Milano", country: "ITALIA", flag: "flag_it", pm25: 18.1, level: 2, difficulty: "MEDIO", tasks: "+1 TASK", extras: { care: 1, fix: 0 }, color: 0xc98552, drainSeconds: 70, regen: 0.7, smog: 1 },
  { id: "delhi", city: "NUOVA DELHI", label: "Nuova Delhi", country: "INDIA", flag: "flag_in", pm25: 108.3, level: 3, difficulty: "DIFFICILE", tasks: "+2 TASK", extras: { care: 1, fix: 1 }, color: 0xb4553f, drainSeconds: 60, regen: 0.75, smog: 2 }
];

export function getOrigin(registry) {
  const run = registry.get("run");
  const id = run?.origin ?? registry.get("origin");
  return ORIGINS.find((origin) => origin.id === id) ?? ORIGINS[1];
}
