/*
  O2RIGIN · Pianta controller (Elegoo UNO R3)

  Invia al gioco una riga ogni 50 ms via USB (115200 baud):
    L:612,T:23.0,P1:2,P2:0,W:0,TL:0,TR:1
  (P1 / P2 = colore della fiala nei due posti del pozzetto: 0 vuoto, 1 verde, 2 blu, 3 rossa)
  Le righe che iniziano con '#' sono messaggi informativi: il gioco le ignora.
  Riceve comandi:
    E1 / E0  -> LED rossi emergenza accesi / spenti (lampeggiano)
    G        -> breve lampeggio verde (task riuscita)

  COLLEGAMENTI
  - Fotoresistenza (luce):    5V -- LDR -- A0 -- 10k -- GND
                              legge la torcia puntata o il vaso coperto
  - DHT11 (temperatura):      DATA su D12 (con 10k verso 5V se il modulo non l'ha già), VCC 5V, GND
  - Lettore NFC PN532 (fiale): modalità I2C (interruttori del modulo su I2C)
                              SDA -> A4, SCL -> A5, IRQ -> D2, RSTO/RESET -> D3, VCC 5V, GND
                              ogni fiala ha un adesivo NFC (NTAG213 o MIFARE) nel tappo:
                              avvicinala al pozzetto per "versarla" (va nel primo posto libero),
                              riavvicinala per toglierla
  - Leva dell'acqua:          interruttore a levetta tra D7 e GND (INPUT_PULLUP): chiusa = aperta l'acqua
  - Pompa irrigazione:        D8 -> modulo relè (o transistor) della pompetta, segue la leva
  - Foglia sinistra / destra: elettrodi capacitivi senza librerie esterne:
                              D4 (invio) -- resistenza 1M -- D5 (sx) / D6 (dx) -- filo sotto la foglia
  - LED rossi emergenza:      D9 e D10 (con resistenza 220 ohm)
  - LED verde:                D11 (con resistenza 220 ohm)

  LIBRERIE: nessuna da installare.
  - Adafruit PN532 e Adafruit BusIO (licenza BSD / MIT) sono già nella cartella src/ dello sketch
  - Wire e SPI fanno parte del core Arduino
  - DHT11 e sensori capacitivi sono letti direttamente dallo sketch
*/

#include <Arduino.h>
#include <Wire.h>
// libreria Adafruit PN532 (con Adafruit BusIO) inclusa nella cartella src dello sketch: non va installata
#include "src/Adafruit_PN532/Adafruit_PN532.h"

const int PIN_LIGHT = A0;
const int PIN_DHT = 12;
const int PIN_NFC_IRQ = 2;
const int PIN_NFC_RESET = 3;
const int PIN_TOUCH_SEND = 4;
const int PIN_TOUCH_LEFT = 5;
const int PIN_TOUCH_RIGHT = 6;
const int PIN_WATER_LEVER = 7;
const int PIN_PUMP = 8;
const int PIN_LED_RED_A = 9;
const int PIN_LED_RED_B = 10;
const int PIN_LED_GREEN = 11;

Adafruit_PN532 nfc(PIN_NFC_IRQ, PIN_NFC_RESET);

// ---------------------------------------------------------------------------
// FIALE: UID degli adesivi NFC -> colore (1 verde, 2 blu, 3 rossa)
// Per trovare gli UID: apri il Monitor seriale, avvicina una fiala e copia
// l'UID stampato nella riga "# NFC sconosciuto" qui sotto.
// ---------------------------------------------------------------------------
struct VialTag {
  uint8_t uid[7];
  uint8_t length;
  uint8_t color;
};

const VialTag VIAL_TAGS[] = {
  {{0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00}, 7, 1},  // fiala verde
  {{0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00}, 7, 2},  // fiala blu
  {{0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00}, 7, 3}   // fiala rossa
};
const int VIAL_TAG_COUNT = sizeof(VIAL_TAGS) / sizeof(VIAL_TAGS[0]);

// due posti del pozzetto: colore e UID della fiala che li occupa
uint8_t slotColor[2] = {0, 0};
uint8_t slotUid[2][7];
uint8_t slotUidLength[2] = {0, 0};

bool nfcReady = false;
bool tagInField = false;
uint8_t fieldUid[7];
uint8_t fieldUidLength = 0;
unsigned long tagLastSeen = 0;
unsigned long lastNfcPoll = 0;

// ---------------------------------------------------------------------------
// stato generale
// ---------------------------------------------------------------------------
bool emergency = false;
unsigned long greenUntil = 0;
unsigned long lastSend = 0;
float temperature = 22.0;
unsigned long lastDhtRead = 0;
long touchBaseLeft = 0;
long touchBaseRight = 0;
String command = "";

// ---------------------------------------------------------------------------
// DHT11: lettura diretta del protocollo a un filo (40 bit: umidità, temperatura, checksum)
// ---------------------------------------------------------------------------
bool waitLevel(int pin, int level, unsigned int timeoutUs) {
  unsigned long start = micros();
  while (digitalRead(pin) != level) {
    if (micros() - start > timeoutUs) return false;
  }
  return true;
}

bool readDht11(float &result) {
  uint8_t data[5] = {0, 0, 0, 0, 0};
  // segnale di avvio: linea bassa per 20 ms, poi rilasciata
  pinMode(PIN_DHT, OUTPUT);
  digitalWrite(PIN_DHT, LOW);
  delay(20);
  digitalWrite(PIN_DHT, HIGH);
  delayMicroseconds(40);
  pinMode(PIN_DHT, INPUT_PULLUP);

  noInterrupts();
  bool ok = waitLevel(PIN_DHT, LOW, 120) && waitLevel(PIN_DHT, HIGH, 120) && waitLevel(PIN_DHT, LOW, 120);
  for (int i = 0; ok && i < 40; i++) {
    // ogni bit: 50 us bassa, poi alta 26-28 us (= 0) oppure 70 us (= 1)
    if (!waitLevel(PIN_DHT, HIGH, 90)) {
      ok = false;
      break;
    }
    unsigned long start = micros();
    if (!waitLevel(PIN_DHT, LOW, 120)) {
      ok = false;
      break;
    }
    if (micros() - start > 45) data[i / 8] |= (1 << (7 - (i % 8)));
  }
  interrupts();

  if (!ok) return false;
  if (((data[0] + data[1] + data[2] + data[3]) & 0xFF) != data[4]) return false;
  result = data[2] + data[3] * 0.1;
  return true;
}

// ---------------------------------------------------------------------------
// sensore capacitivo: tempo di carica del filo sotto la foglia (più alto se la tocchi)
// ---------------------------------------------------------------------------
long readCapacitive(int receivePin, int samples) {
  long total = 0;
  for (int s = 0; s < samples; s++) {
    // scarica
    digitalWrite(PIN_TOUCH_SEND, LOW);
    pinMode(receivePin, OUTPUT);
    digitalWrite(receivePin, LOW);
    delayMicroseconds(10);
    pinMode(receivePin, INPUT);
    // carica e conta
    digitalWrite(PIN_TOUCH_SEND, HIGH);
    long count = 0;
    while (digitalRead(receivePin) == LOW && count < 5000) count++;
    total += count;
    digitalWrite(PIN_TOUCH_SEND, LOW);
    while (digitalRead(receivePin) == HIGH && count < 10000) count++;
  }
  return total;
}

long calibrateTouch(int receivePin) {
  long sum = 0;
  for (int i = 0; i < 16; i++) sum += readCapacitive(receivePin, 10);
  return sum / 16;
}

bool isTouched(int receivePin, long baseline) {
  // tocco = almeno il 60% in più del valore a riposo
  return readCapacitive(receivePin, 10) > baseline + baseline * 6 / 10 + 20;
}

// ---------------------------------------------------------------------------
// NFC
// ---------------------------------------------------------------------------
bool sameUid(const uint8_t *a, uint8_t lengthA, const uint8_t *b, uint8_t lengthB) {
  if (lengthA != lengthB) return false;
  for (uint8_t i = 0; i < lengthA; i++) {
    if (a[i] != b[i]) return false;
  }
  return true;
}

uint8_t colorOfTag(const uint8_t *uid, uint8_t length) {
  for (int i = 0; i < VIAL_TAG_COUNT; i++) {
    if (sameUid(uid, length, VIAL_TAGS[i].uid, VIAL_TAGS[i].length)) return VIAL_TAGS[i].color;
  }
  return 0;
}

void printUid(const uint8_t *uid, uint8_t length) {
  for (uint8_t i = 0; i < length; i++) {
    Serial.print("0x");
    if (uid[i] < 0x10) Serial.print('0');
    Serial.print(uid[i], HEX);
    if (i < length - 1) Serial.print(", ");
  }
}

// una fiala avvicinata: se è già nel pozzetto la toglie, altrimenti la mette nel primo posto libero
void onVialTap(const uint8_t *uid, uint8_t length) {
  uint8_t color = colorOfTag(uid, length);
  if (color == 0) {
    Serial.print("# NFC sconosciuto, UID: {");
    printUid(uid, length);
    Serial.print("}, ");
    Serial.println(length);
    return;
  }
  for (int i = 0; i < 2; i++) {
    if (slotColor[i] && sameUid(uid, length, slotUid[i], slotUidLength[i])) {
      slotColor[i] = 0;
      slotUidLength[i] = 0;
      return;
    }
  }
  for (int i = 0; i < 2; i++) {
    if (slotColor[i] == 0) {
      slotColor[i] = color;
      memcpy(slotUid[i], uid, length);
      slotUidLength[i] = length;
      return;
    }
  }
  // pozzetto pieno: niente da fare finché non se ne toglie una
}

void pollNfc() {
  if (!nfcReady || millis() - lastNfcPoll < 120) return;
  lastNfcPoll = millis();
  uint8_t uid[10]; // alcuni tag hanno UID fino a 10 byte: qui se ne usano i primi 7
  uint8_t length = 0;
  bool found = nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &length, 25);
  if (found && length > 7) length = 7;
  if (found) {
    tagLastSeen = millis();
    // conta come nuova solo se la fiala era stata allontanata (niente doppi tocchi)
    if (!tagInField || !sameUid(uid, length, fieldUid, fieldUidLength)) {
      tagInField = true;
      memcpy(fieldUid, uid, length);
      fieldUidLength = length;
      onVialTap(uid, length);
    }
  } else if (tagInField && millis() - tagLastSeen > 700) {
    tagInField = false;
  }
}

// ---------------------------------------------------------------------------
void handleCommand(const String &cmd) {
  if (cmd == "E1") emergency = true;
  if (cmd == "E0") emergency = false;
  if (cmd == "G") greenUntil = millis() + 600;
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED_RED_A, OUTPUT);
  pinMode(PIN_LED_RED_B, OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_WATER_LEVER, INPUT_PULLUP);
  pinMode(PIN_PUMP, OUTPUT);
  pinMode(PIN_TOUCH_SEND, OUTPUT);
  pinMode(PIN_DHT, INPUT_PULLUP);

  // valori a riposo delle foglie: non toccarle nei primi istanti dopo l'accensione
  touchBaseLeft = calibrateTouch(PIN_TOUCH_LEFT);
  touchBaseRight = calibrateTouch(PIN_TOUCH_RIGHT);

  nfc.begin();
  uint32_t version = nfc.getFirmwareVersion();
  if (version) {
    nfc.SAMConfig();
    nfcReady = true;
    Serial.println("# PN532 pronto");
  } else {
    Serial.println("# PN532 non trovato: controlla i collegamenti e gli interruttori I2C");
  }
}

void loop() {
  // comandi dal gioco
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n') {
      command.trim();
      handleCommand(command);
      command = "";
    } else {
      command += c;
    }
  }

  // leva dell'acqua: finché è aperta la pompa va
  bool waterOpen = digitalRead(PIN_WATER_LEVER) == LOW;
  digitalWrite(PIN_PUMP, waterOpen ? HIGH : LOW);

  // LED: rossi alternati in emergenza, verde dopo una task riuscita
  bool blink = (millis() / 250) % 2 == 0;
  digitalWrite(PIN_LED_RED_A, emergency && blink);
  digitalWrite(PIN_LED_RED_B, emergency && !blink);
  digitalWrite(PIN_LED_GREEN, millis() < greenUntil);

  // DHT11: al massimo una lettura al secondo e mezzo (il sensore non è più veloce)
  if (millis() - lastDhtRead >= 1500) {
    lastDhtRead = millis();
    float value;
    if (readDht11(value)) temperature = value;
  }

  pollNfc();

  if (millis() - lastSend >= 50) {
    lastSend = millis();
    int light = analogRead(PIN_LIGHT);
    bool touchLeft = isTouched(PIN_TOUCH_LEFT, touchBaseLeft);
    bool touchRight = isTouched(PIN_TOUCH_RIGHT, touchBaseRight);

    Serial.print("L:");
    Serial.print(light);
    Serial.print(",T:");
    Serial.print(temperature, 1);
    Serial.print(",P1:");
    Serial.print(slotColor[0]);
    Serial.print(",P2:");
    Serial.print(slotColor[1]);
    Serial.print(",W:");
    Serial.print(waterOpen ? 1 : 0);
    Serial.print(",TL:");
    Serial.print(touchLeft ? 1 : 0);
    Serial.print(",TR:");
    Serial.println(touchRight ? 1 : 0);
  }
}
