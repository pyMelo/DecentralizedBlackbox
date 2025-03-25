// Refactored .ino sketch with GPS-driven daily key update (GPS time checked even without fix)
#include "gps_manager.h"
#include "daily_key_manager.h"
#include "payload_manager.h"
#include "lora_manager.h"
#include <Wire.h>
#include <Adafruit_MPU6050.h>

#define BUTTON_PIN 0
#define DHT11_PIN 7

DHT11 dht(DHT11_PIN);
Adafruit_MPU6050 mpu;
DailyKeyManager keyManager;
HardwareSerial GPSserial(2);
GPSMonitor gpsMonitor(GPSserial);

bool mpuFound = false;
PayloadManager* payloadManager;

void setup() {
  Serial.begin(115200);
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  Serial.println("\n=== 🚀 ESP32 Daily Key Generator ===");
  Wire.begin();

  mpuFound = mpu.begin();
  Serial.println(mpuFound ? "✅ MPU6050 found." : "❌ MPU6050 not found! Using default values.");

  gpsMonitor.begin(9600, 46, 45);
  Serial.println("✅ GPS Initialized.");

  keyManager.init();

  payloadManager = new PayloadManager(&dht, &mpu, &gpsMonitor.getGPS(), keyManager.getDailyKey(), mpuFound);

  LoRaWAN_setup();
  Serial.println("✅ LoRaWAN Initialized.");
}

void loop() {
  static unsigned long lastPayloadTime = 0;
  static bool buttonPressed = false;
  static unsigned long buttonPressTime = 0;

  gpsMonitor.update();
  gpsMonitor.printNMEAEvery(20000);
  gpsMonitor.monitorGPS();

  // Aggiorna la Daily Key leggendo la data dal GPS anche senza fix
  time_t gpsEpoch = gpsMonitor.getGPSEpoch();
  if (gpsEpoch > 0 && keyManager.checkAndUpdateDailyKey(gpsEpoch)) {
    Serial.println("✅ Daily Key updated from GPS date");
  }

  if (millis() - lastPayloadTime >= 30000) {
    lastPayloadTime = millis();
    sendEncryptedPayload();
  }

  handleButtonReset(buttonPressed, buttonPressTime);
}

void sendEncryptedPayload() {
  if (!node->isActivated()) {
    Serial.println("⚠️ LoRaWAN not connected, payload not sent.");
    LoRaWAN_setup();
    return;
  }

  String hexPayload = payloadManager->createPayload();
  uint8_t payload[35];
  size_t payload_len = 0;
  hexStringToByteArray(hexPayload, payload, payload_len);

  if (LoRaWAN_send(payload, payload_len)) Serial.println("✅ Payload sent.");
}

void handleButtonReset(bool& buttonPressed, unsigned long& pressTime) {
  if (digitalRead(BUTTON_PIN) == LOW) {
    if (!buttonPressed) {
      pressTime = millis();
      buttonPressed = true;
      Serial.println("🔘 Button pressed, hold for 3 sec to reset...");
    }
    if (buttonPressed && millis() - pressTime > 3000) {
      Serial.println("⏱️ Resetting keys and message counter...");
      keyManager.resetMasterKey();
      payloadManager->resetMessageCounter();
    }
  } else {
    buttonPressed = false;
  }
}

void hexStringToByteArray(String hexString, uint8_t* byteArray, size_t &len) {
  hexString.replace(" ", "");
  len = hexString.length() / 2;
  for (size_t i = 0; i < len; i++) {  
    String byteStr = hexString.substring(i * 2, i * 2 + 2);
    byteArray[i] = (uint8_t)strtol(byteStr.c_str(), NULL, 16);
  }
}
