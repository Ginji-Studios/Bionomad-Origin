// O2RIGIN - prototipo con i pezzi del kit (Arduino UNO R4 WiFi)
// Parla lo stesso protocollo che il gioco legge in src/input/PlantSensors.js (Web Serial, 9600 baud).
//
// Verso il gioco:
//   START                      tasto avvio premuto e lasciato: conferma
//   PAUSA                      tasto avvio tenuto premuto (0,8 s): pausa / riprendi
//   DESTRA / STOP              foglia toccata / lasciata (il personaggio va a destra)
//   TK:0-1023,IR:0/1,AR:0/1    levetta, tasto irrigazione, tasto aria
// Dal gioco (il buzzer suona SOLO in questi tre casi):
//   E1 / E0   emergenza: bip veloce continuo finché non arriva E0
//   O:0-100   livello di ossigeno: sotto OSSIGENO_BASSO bip lento
//   L         partita persa: melodia discendente
//   (N, G arrivano ma vengono ignorati)
//
// Sulla matrice di LED della scheda compare il logo b+ di biodom+.
//
// Collegamenti: avvio D2, irrigazione D6, aria D8 (altro piedino a GND)
//               levetta A0 (esterni a 5V e GND), buzzer D5 (con transistor), foglia D0

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

const int P_AVVIO = 2, P_IRR = 6, P_ARIA = 8, P_BUZZER = 5, P_LEVA = A0;

CapacitiveTouch foglia = CapacitiveTouch(D0);
const int SOGLIA = 1000;           // sopra 1000 la foglia conta come toccata

// la levetta comanda la temperatura ("TK"); per farle comandare la luce scrivi "LK"
const char* CHIAVE_LEVA = "TK";

bool avvioPrima = false, fogliaPrima = false, pausaInviata = false;
unsigned long tPremuto = 0;
const unsigned long TIENI_MS = 800;   // tenendo premuto START più di così: pausa
int irr = 0, aria = 0, leva = -100;
unsigned long ultimoInvio = 0, tAllarme = 0;
bool allarme = false;
int ossigeno = 100;
const int OSSIGENO_BASSO = 25;     // sotto il 25% di respiro parte il bip lento
unsigned long tBasso = 0;
String rx = "";

void inviaStato() {
  Serial.print(CHIAVE_LEVA); Serial.print(':'); Serial.print(leva);
  Serial.print(",IR:"); Serial.print(irr);
  Serial.print(",AR:"); Serial.println(aria);
  ultimoInvio = millis();
}

void comando(String c) {
  c.trim(); c.toUpperCase();
  if (c == "E1") allarme = true;
  else if (c == "E0") { allarme = false; ossigeno = 100; noTone(P_BUZZER); }   // fine emergenza / fine evento
  else if (c.startsWith("O:")) ossigeno = c.substring(2).toInt();
  else if (c == "L") {                                   // partita persa
    allarme = false; ossigeno = 100;
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

  // irrigazione, aria, levetta: una riga quando cambiano (e comunque ogni 250 ms)
  int i = digitalRead(P_IRR) == LOW ? 1 : 0;
  int r = digitalRead(P_ARIA) == LOW ? 1 : 0;
  long somma = 0;                                    // media di 8 letture: levetta più stabile
  for (int k = 0; k < 8; k++) somma += analogRead(P_LEVA);
  int l = somma / 8;
  bool cambio = (i != irr) || (r != aria) || abs(l - leva) > 12;
  irr = i; aria = r;
  if (abs(l - leva) > 12) leva = l;
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
  else if (!allarme && ossigeno > 0 && ossigeno < OSSIGENO_BASSO && millis() - tBasso > 1500) {
    tone(P_BUZZER, 1000, 150); tBasso = millis();
  }

  delay(15);
}
