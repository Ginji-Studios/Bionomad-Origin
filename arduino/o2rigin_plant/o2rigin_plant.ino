/*
  O2RIGIN · Pianta controller (Elegoo UNO R3)

  Invia al gioco una riga ogni 50 ms via USB (115200 baud):
    L:612,T:23.4,V:1,TL:0,TR:1
  e riceve comandi:
    E1 / E0  -> LED rossi emergenza accesi / spenti (lampeggiano)
    G        -> breve lampeggio verde (task riuscita)

  COLLEGAMENTI
  - Fotoresistenza (luce):   5V -- LDR -- A0 -- 10k -- GND
  - Termistore NTC 10k:      5V -- 10k -- A1 -- NTC -- GND
  - Fiala 1 / Fiala 2:       contatti nel terriccio su D2 / D3 (INPUT_PULLUP, verso GND).
                             La fiala ha la punta metallica che chiude il contatto -> LOW = inserita
  - Foglia sinistra / destra: sensori capacitivi (libreria CapacitiveSensor di Paul Stoffregen)
                             pin di invio D4, ricezione D5 (sx) e D6 (dx) con resistenza da 1M,
                             filo sottile nascosto sotto la foglia (finto innesto "cyborg")
  - LED rossi emergenza:     D9 e D10 (con resistenza 220 ohm)
  - LED verde:               D11 (con resistenza 220 ohm)
*/

#include <CapacitiveSensor.h>

const int PIN_LIGHT = A0;
const int PIN_TEMP = A1;
const int PIN_VIAL_1 = 2;
const int PIN_VIAL_2 = 3;
const int PIN_LED_RED_A = 9;
const int PIN_LED_RED_B = 10;
const int PIN_LED_GREEN = 11;

CapacitiveSensor leafLeft = CapacitiveSensor(4, 5);
CapacitiveSensor leafRight = CapacitiveSensor(4, 6);

// Soglia del tocco: da tarare sulla pianta vera (stampa i valori grezzi per trovarla)
const long TOUCH_THRESHOLD = 800;

// Termistore NTC 10k, beta 3950
const float SERIES_R = 10000.0;
const float NOMINAL_R = 10000.0;
const float NOMINAL_T = 25.0;
const float BETA = 3950.0;

bool emergency = false;
unsigned long greenUntil = 0;
unsigned long lastSend = 0;
String command = "";

float readTemperature() {
  int raw = analogRead(PIN_TEMP);
  if (raw <= 0) return -40;
  float resistance = SERIES_R / (1023.0 / raw - 1.0);
  float steinhart = log(resistance / NOMINAL_R) / BETA;
  steinhart += 1.0 / (NOMINAL_T + 273.15);
  return 1.0 / steinhart - 273.15;
}

void handleCommand(const String &cmd) {
  if (cmd == "E1") emergency = true;
  if (cmd == "E0") emergency = false;
  if (cmd == "G") greenUntil = millis() + 600;
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_VIAL_1, INPUT_PULLUP);
  pinMode(PIN_VIAL_2, INPUT_PULLUP);
  pinMode(PIN_LED_RED_A, OUTPUT);
  pinMode(PIN_LED_RED_B, OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  leafLeft.set_CS_AutocaL_Millis(0xFFFFFFFF);
  leafRight.set_CS_AutocaL_Millis(0xFFFFFFFF);
}

void loop() {
  // Comandi dal gioco
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

  // LED: rossi alternati in emergenza, verde dopo una task riuscita
  bool blink = (millis() / 250) % 2 == 0;
  digitalWrite(PIN_LED_RED_A, emergency && blink);
  digitalWrite(PIN_LED_RED_B, emergency && !blink);
  digitalWrite(PIN_LED_GREEN, millis() < greenUntil);

  if (millis() - lastSend >= 50) {
    lastSend = millis();
    int light = analogRead(PIN_LIGHT);
    float temperature = readTemperature();
    int vials = (digitalRead(PIN_VIAL_1) == LOW) + (digitalRead(PIN_VIAL_2) == LOW);
    bool touchLeft = leafLeft.capacitiveSensor(20) > TOUCH_THRESHOLD;
    bool touchRight = leafRight.capacitiveSensor(20) > TOUCH_THRESHOLD;

    Serial.print("L:");
    Serial.print(light);
    Serial.print(",T:");
    Serial.print(temperature, 1);
    Serial.print(",V:");
    Serial.print(vials);
    Serial.print(",TL:");
    Serial.print(touchLeft ? 1 : 0);
    Serial.print(",TR:");
    Serial.println(touchRight ? 1 : 0);
  }
}
