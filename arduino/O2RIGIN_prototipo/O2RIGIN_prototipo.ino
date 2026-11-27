// O2RIGIN - prototipo con i pezzi del kit (Arduino UNO R4 WiFi)
// Parla lo stesso protocollo che il gioco legge in src/input/PlantSensors.js (Web Serial, 9600 baud).
//
// Verso il gioco:
//   START                      tasto avvio premuto e lasciato: conferma
//   PAUSA                      tasto avvio tenuto premuto (0,8 s): pausa / riprendi
//   DESTRA / STOP              foglia toccata / lasciata (il personaggio va a destra)
//   IR:0/1,AR:0/1              tasto irrigazione, tasto aria
//   TK:0-100,LK:0-100          manopola temperatura (A0) e manopola luce (A1), nella stessa riga di IR/AR
//                              (si possono usare anche i comandi del PC: vince l'ultimo che si muove)
// Dal gioco, luci dei tasti:
//   T:SIA     accende la luce dei tasti di cui è il turno (S avvio, I irrigazione, A aria);
//             "T:" da solo le spegne tutte. Il gioco la ripete ogni secondo.
// Dal gioco (il buzzer suona SOLO in questi tre casi):
//   E1 / E0   emergenza: bip veloce continuo finché non arriva E0
//   B1 / B0   respiro basso (barra rossa, sotto il 30%): sirena a intermittenza finché non arriva B0
//   L         partita persa (respiro a 0): suono continuo che sale fino al culmine e si spegne
//   K         "ci sono", ogni secondo: se non arriva per 3 s il buzzer si spegne (gioco chiuso)
//   X         spegni tutto (uscita, menu, nuova partita)   Q / R  pausa: muto / riprendi
//   (N, G arrivano ma vengono ignorati)
//
// Sulla matrice di LED della scheda all'avvio scorre "biodom+", poi resta fisso il logo b+.
//
// Collegamenti: avvio D2, irrigazione D6, aria D5 (altro piedino a GND)
//               luci dei tasti: avvio D3, irrigazione D6, aria D5 (− della luce a GND)
//               manopola temperatura A0, manopola luce A1 (filo centrale; esterni a 5V e GND)
//               buzzer D8, foglia D0


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

// scritta "biodom+" che scorre all'avvio (8 righe, 1 = LED acceso)
const char* LETTERE[][8] = {
  {"1000","1000","1000","1110","1001","1001","1001","1110"},        // b
  {"0","1","0","1","1","1","1","1"},                                // i
  {"0000","0000","0000","0110","1001","1001","1001","0110"},        // o
  {"0001","0001","0001","0111","1001","1001","1001","0111"},        // d
  {"0000","0000","0000","0110","1001","1001","1001","0110"},        // o
  {"00000","00000","00000","11110","10101","10101","10101","10101"}, // m
  {"010","111","010","000","000","000","000","000"}                 // + (in apice, come nel logo)
};
const int MAX_COL = 60;
uint8_t nastro[8][MAX_COL];   // tutte le colonne della scritta, con spazi prima e dopo
uint8_t schermo[8][12];

void scriviBiodom() {
  int n = 12;                                  // parte fuori schermo, da destra
  memset(nastro, 0, sizeof(nastro));
  for (int l = 0; l < 7; l++) {
    int w = strlen(LETTERE[l][0]);
    for (int c = 0; c < w; c++)
      for (int r = 0; r < 8; r++) nastro[r][n + c] = LETTERE[l][r][c] == '1';
    n += w + 1;                                // una colonna vuota tra le lettere
  }
  n += 12;                                     // esce tutta a sinistra
  for (int off = 0; off + 12 <= n; off++) {
    for (int r = 0; r < 8; r++)
      for (int c = 0; c < 12; c++) schermo[r][c] = nastro[r][off + c];
    matrice.renderBitmap(schermo, 8, 12);
    delay(90);
  }
}

const int P_AVVIO = 2, P_IRR = 6, P_ARIA = 5, P_BUZZER = 8;
// luci dei tasti arcade: si accende quella del tasto da premere adesso
const int L_AVVIO = 3, L_IRR = 7, L_ARIA = 9;
bool luceS = false, luceI = false, luceA = false;

void luci(bool s, bool i, bool a) {
  luceS = s; luceI = i; luceA = a;
  digitalWrite(L_AVVIO, s ? HIGH : LOW);
  digitalWrite(L_IRR, i ? HIGH : LOW);
  digitalWrite(L_ARIA, a ? HIGH : LOW);
}

CapacitiveTouch foglia = CapacitiveTouch(D0);
const int SOGLIA = 500;           // abbassare per aumentare la sensibilità del touch

bool avvioPrima = false, fogliaPrima = false, pausaInviata = false;
unsigned long tPremuto = 0;
const unsigned long TIENI_MS = 800;   // tenendo premuto START più di così: pausa
int irr = 0, aria = 0;
unsigned long ultimoInvio = 0, tAllarme = 0;
bool allarme = false;
int notaSirena = 0;
bool muto = false;
unsigned long ultimoDalGioco = 0;
bool bassoRespiro = false;         // il gioco manda B1 quando la barra del respiro diventa rossa, B0 quando risale
unsigned long tBasso = 0;
String rx = "";

// ---------------------------------------------------------------- manopole (potenziometri)
const int P_TEMP = A0, P_LUCE = A1;
// se girando a destra il valore scende invece di salire: metti true (oppure scambia i fili esterni)
const bool INVERTI_TEMP = false, INVERTI_LUCE = false;
const int SOGLIA_MANOPOLA = 1;
int tk = -100, lk = -100;   // ultimi valori mandati al gioco

// media di 8 letture: valore stabile anche con fili lunghi
int leggiManopola(int pin, bool inverti) {
  long somma = 0;
  for (int k = 0; k < 8; k++) somma += analogRead(pin);
  int v = somma / 8;
  if (inverti) v = 1023 - v;
  return map(v, 0, 1023, 0, 100);
}

// true se una manopola si è mossa abbastanza (e aggiorna il valore da mandare)
bool aggiornaManopole() {
  int t = leggiManopola(P_TEMP, INVERTI_TEMP);
  int l = leggiManopola(P_LUCE, INVERTI_LUCE);
  bool mossa = false;
  // ai due estremi si arriva sempre a 0 e 100 esatti, anche con la soglia
  if (abs(t - tk) > SOGLIA_MANOPOLA || ((t == 0 || t == 100) && t != tk)) { tk = t; mossa = true; }
  if (abs(l - lk) > SOGLIA_MANOPOLA || ((l == 0 || l == 100) && l != lk)) { lk = l; mossa = true; }
  return mossa;
}

void inviaStato() {
  Serial.print("IR:"); Serial.print(irr);
  Serial.print(",AR:"); Serial.print(aria);
  Serial.print(",TK:"); Serial.print(tk);
  Serial.print(",LK:"); Serial.println(lk);
  ultimoInvio = millis();
}

void comando(String c) {
  c.trim(); c.toUpperCase();
  if (c.length() == 0) return;
  ultimoDalGioco = millis();
  if (c == "K") return;
  // luci dei tasti (arriva spesso: niente eco)
  if (c.startsWith("T:")) {
    String q = c.substring(2);
    luci(q.indexOf('S') >= 0, q.indexOf('I') >= 0, q.indexOf('A') >= 0);
    return;
  }
  Serial.print("# ricevuto: "); Serial.println(c);   // per controllare che i comandi arrivino
  if (c == "E1") allarme = true;
  else if (c == "E0") { allarme = false; noTone(P_BUZZER); }   // fine emergenza
  else if (c == "B1") { if (!bassoRespiro) tBasso = millis(); bassoRespiro = true; }
  else if (c == "B0") bassoRespiro = false;
  else if (c == "X") { allarme = false; bassoRespiro = false; muto = false; noTone(P_BUZZER); notaSirena = 0; luci(false, false, false); }
  else if (c == "Q") { muto = true; noTone(P_BUZZER); notaSirena = 0; }
  else if (c == "R") muto = false;
  else if (c == "L") {                                   // partita persa
    allarme = false; bassoRespiro = false;
    // suono continuo che sale fino al culmine (2 s), resta in cima un attimo e si spegne di colpo
    for (int f = 500; f <= 1800; f += 13) { tone(P_BUZZER, f); delay(20); }
    tone(P_BUZZER, 1800); delay(700);
    noTone(P_BUZZER);
  }
}

void setup() {
  Serial.begin(9600);
  pinMode(P_AVVIO, INPUT_PULLUP);
  pinMode(P_IRR, INPUT_PULLUP);
  pinMode(P_ARIA, INPUT_PULLUP);
  pinMode(P_BUZZER, OUTPUT);
  pinMode(L_AVVIO, OUTPUT);
  pinMode(L_IRR, OUTPUT);
  pinMode(L_ARIA, OUTPUT);
  luci(false, false, false);
  matrice.begin();
  scriviBiodom();                    // "biodom+" scorre una volta...
  matrice.renderBitmap(logo, 8, 12); // ...poi resta fisso il logo b+
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
  // manopole: una riga appena si muovono
  if (aggiornaManopole()) cambio = true;
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

  // gioco chiuso: niente "K" da 3 secondi → luci dei tasti spente
  if ((luceS || luceI || luceA) && millis() - ultimoDalGioco > 3000) luci(false, false, false);

  // gioco chiuso o pagina ricaricata: niente "K" da 3 secondi → buzzer spento
  if ((allarme || bassoRespiro) && millis() - ultimoDalGioco > 3000) {
    allarme = false; bassoRespiro = false; noTone(P_BUZZER); notaSirena = 0;
  }

  // emergenza: bip veloce continuo finché il gioco non manda E0
  if (muto) { }
  else if (allarme && millis() - tAllarme > 500) { tone(P_BUZZER, 2400, 250); tAllarme = millis(); }
  // respiro basso: sirena a intermittenza (solo se non c'è già l'emergenza)
  // 1,2 s di sirena (due note che si alternano) + 0,8 s di pausa, e ricomincia
  else if (!allarme && bassoRespiro) {
    unsigned long t = (millis() - tBasso) % 2000;
    if (t < 1200) {
      int nota = ((t / 200) % 2 == 0) ? 1400 : 900;   // acuta / grave ogni 0,2 s
      if (nota != notaSirena) { tone(P_BUZZER, nota); notaSirena = nota; }
    } else if (notaSirena != 0) { noTone(P_BUZZER); notaSirena = 0; }
  } else if (notaSirena != 0) { noTone(P_BUZZER); notaSirena = 0; }

  delay(15);
}