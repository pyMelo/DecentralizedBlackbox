#include "gps_manager.h"  // Usa la versione con il timer satelliti
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
HardwareSerial GPSserial(2);  // UART2 per GPS
GPSMonitor gpsMonitor(GPSserial);

bool mpuFound = false;
PayloadManager payloadManager(&dht, &mpu, &gpsMonitor.getGPS(), keyManager.getDailyKey(), mpuFound);

void setup() {
  Serial.begin(115200);
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  keyManager.init();
  Serial.println("\n=== 🚀 ESP32 Daily Key Generator ===");
  Serial.print("📆 Next day? (y/n): ");
  while (!Serial.available());
  char response = Serial.read();
  Serial.read();  // clear buffer

  if (response == 'y' || response == 'Y') {
    keyManager.generateDailyKey(true);
  } else {
    Serial.println("✅ Keeping the previous day's key.");
  }

  Wire.begin();
  mpuFound = mpu.begin();
  if (!mpuFound) {
    Serial.println("❌ MPU6050 not found! Using default values.");
  } else {
    Serial.println("✅ MPU6050 found.");
  }

  gpsMonitor.begin(9600, 46, 45);  // RX=46, TX=45
  setupLoRaWAN();  // LoRa init
}

void loop() {
  static unsigned long buttonPressTime = 0;
  static bool buttonPressed = false;

  // 🔄 Aggiorna GPS e stampa RAW ogni 2 secondi
    gpsMonitor.update();
    gpsMonitor.printNMEAEvery(3000);   // RAW ogni 3 secondi se ancora senza fix
    gpsMonitor.monitorGPS();       // Satelliti ogni 3 secondi se ancora senza fix


  static bool gpsReadyPrinted = false;
  if (gpsMonitor.isFixAcquired() && !gpsReadyPrinted) {
      Serial.println("✅ GPS pronto per inviare i payload");
      gpsReadyPrinted = true;
  }

  // Gestione pulsante
  int buttonState = digitalRead(BUTTON_PIN);
  if (buttonState == LOW) {
    if (!buttonPressed) {
      buttonPressTime = millis();
      buttonPressed = true;
      Serial.println("🔘 Button pressed, hold for 3 seconds to reset...");
    }

    if (buttonPressed && (millis() - buttonPressTime > 3000)) {
      Serial.println("⏱️ Button held for 3 seconds");
      keyManager.resetMasterKey();
      payloadManager.resetMessageCounter();
    }
  } else if (buttonPressed) {
    buttonPressed = false;
    if ((millis() - buttonPressTime < 3000)) {
      Serial.print("🔄 Using Daily Key: ");
      Serial.println(keyManager.getCurrentDailyKey());

      String hexPayload = payloadManager.createPayload();

      size_t payload_len = 0;
      uint8_t payload[35];
      hexStringToByteArray(hexPayload, payload, payload_len);

      Serial.print("📦 Payload HEX: ");
      for (size_t i = 0; i < payload_len; i++) Serial.printf("%02X ", payload[i]);
      Serial.println();

      // Stampa la data GPS
      if (gpsMonitor.getGPS().date.isValid()) {
        Serial.print("📆 GPS Date: ");
        Serial.print(gpsMonitor.getGPS().date.day());
        Serial.print("/");
        Serial.print(gpsMonitor.getGPS().date.month());
        Serial.print("/");
        Serial.println(gpsMonitor.getGPS().date.year());
      } else {
        Serial.println("📆 GPS Date: INVALID");
      }

      sendToTTN(payload, payload_len);
    }
  }
}

void hexStringToByteArray(String hexString, uint8_t* byteArray, size_t &len) {
  hexString.replace(" ", "");
  len = hexString.length() / 2;
  for (size_t i = 0; i < len; i++) {
    String byteString = hexString.substring(i * 2, i * 2 + 2);
    byteArray[i] = (uint8_t)strtol(byteString.c_str(), NULL, 16);
  }
}
