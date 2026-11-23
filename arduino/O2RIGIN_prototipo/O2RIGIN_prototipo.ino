// O2RIGIN - prototipo con i pezzi del kit (Arduino UNO R4 WiFi)
// Parla lo stesso protocollo che il gioco legge in src/input/PlantSensors.js (Web Serial, 9600 baud).
//
// Verso il gioco:
//   START                      tasto avvio premuto e lasciato: conferma
//   PAUSA                      tasto avvio tenuto premuto (0,8 s): pausa / riprendi
//   DESTRA / STOP              foglia toccata / lasciata (il personaggio va a destra)
//   IR:0/1,AR:0/1              tasto irrigazione, tasto aria
//   (temperatura e luce si regolano dal PC: il potenziometro non si usa)
// Dal gioco (il buzzer suona SOLO in questi tre casi):
//   E1 / E0   emergenza: bip veloce continuo finché non arriva E0
//   B1 / B0   respiro basso (sotto il 25%): bip lento finché non arriva B0
//   L         partita persa: melodia discendente
//   (N, G arrivano ma vengono ignorati)
//
// Sulla matrice di LED della scheda compare il logo b+ di biodom+.
//
// Collegamenti: avvio D2, irrigazione D6, aria D8 (altro piedino a GND)
//               buzzer D5 (con transistor), foglia D0

#include "Arduino_CapacitiveTouch.h"
#include "Arduino_LED_Matrix.h"

ArduinoLEDMatrix matrice;
// logo b+ (12 x 8): "b" a sinistra, "+" in apice come in biodom+
uint8_t logo[8][12] = {
  {0,1,0,0,0,0,0,0,0,1,0,0},
  {0,1,0,0,0,0,0,0,1,1,1,0},
  {0,1,0,0,0,0,0,0,0,1,0,0},
  {0,1,1,1,1,0,0,0,0,0,0,0},
  {0,1,0,0,0,1,0,0,0,0,0,0},
  {0,1,0,0,0,1,0,0,0,0,0,0},
  {0,1,0,0,0,1,0,0,0,0,0,0},
  {0,1,1,1,1,0,0,0,0,0,0,0}
};

const int P_AVVIO = 2, P_IRR = 6, P_ARIA = 8, P_BUZZER = 5;

CapacitiveTouch foglia = CapacitiveTouch(D0);
const int SOGLIA = 1000;           // sopra 1000 la foglia conta come toccata


bool avvioPrima = false, fogliaPrima = false, pausaInviata = false;
unsigned long tPremuto = 0;
const unsigned long TIENI_MS = 800;   // tenendo premuto START più di così: pausa
int irr = 0, aria = 0;
unsigned long ultimoInvio = 0, tAllarme = 0;
bool allarme = false;
bool bassoRespiro = false;         // il gioco manda B1 sotto il 25% di respiro, B0 quando risale
unsigned long tBasso = 0;
String rx = "";

void inviaStato() {
  Serial.print("IR:"); Serial.print(irr);
  Serial.print(",AR:"); Serial.println(aria);
  ultimoInvio = millis();
}

void comando(String c) {
  c.trim(); c.toUpperCase();
  if (c == "E1") allarme = true;
  else if (c == "E0") { allarme = false; noTone(P_BUZZER); }   // fine emergenza
  else if (c == "B1") bassoRespiro = true;
  else if (c == "B0") bassoRespiro = false;
  else if (c == "L") {                                   // partita persa
    allarme = false; bassoRespiro = false;
    int note[] = {880, 740, 587, 440};
    for (int k = 0; k < 4; k++) { tone(P_BUZZER, note[k], 220); delay(260); }
    noTone(P_BUZZER);
  }
}

void setup() {
  Serial.begin(9600);
  pinMode(P_AVVIO, INPUT_PULLUP);
  pinMode(P_IRR, INPUT_PULLUP);
  pinMode(P_ARIA, INPUT_PULLUP);
  pinMode(P_BUZZER, OUTPUT);
  matrice.begin();
  matrice.renderBitmap(logo, 8, 12);
  if (!foglia.begin()) Serial.println("# foglia: pin non supportato");
  foglia.setThreshold(SOGLIA);
  Serial.println("# O2RIGIN pronto");
}

void loop() {
  // tasto avvio: breve = START (conferma), tenuto = PAUSA
  bool a = digitalRead(P_AVVIO) == LOW;
  if (a && !avvioPrima) { tPremuto = millis(); pausaInviata = false; }
  if (a && !pausaInviata && millis() - tPremuto >= TIENI_MS) { Serial.println("PAUSA"); pausaInviata = true; }
  if (!a && avvioPrima && !pausaInviata) Serial.println("START");
  avvioPrima = a;

  // irrigazione e aria: una riga quando cambiano (e comunque ogni 250 ms)
  int i = digitalRead(P_IRR) == LOW ? 1 : 0;
  int r = digitalRead(P_ARIA) == LOW ? 1 : 0;
  bool cambio = (i != irr) || (r != aria);
  irr = i; aria = r;
  if (cambio || millis() - ultimoInvio > 250) inviaStato();

  // foglia: DESTRA quando la tocchi, STOP quando la lasci
  bool f = foglia.isTouched();
  if (f != fogliaPrima) Serial.println(f ? "DESTRA" : "STOP");
  fogliaPrima = f;

  // comandi dal gioco
  while (Serial.available()) {
    char ch = Serial.read();
    if (ch == '\n') { comando(rx); rx = ""; }
    else if (ch != '\r') rx += ch;
  }

  // emergenza: bip veloce continuo finché il gioco non manda E0
  if (allarme && millis() - tAllarme > 500) { tone(P_BUZZER, 2400, 250); tAllarme = millis(); }
  // ossigeno basso: bip lento (solo se non c'è già l'emergenza)
  else if (!allarme && bassoRespiro && millis() - tBasso > 1500) {
    tone(P_BUZZER, 1000, 150); tBasso = millis();
  }

  delay(15);
}
