#include "daily_key_manager.h"
#include "payload_manager.h"
#include "lora_manager.h"  

#define BUTTON_PIN 0  
#define DHT11_PIN 7  

DHT11 dht(DHT11_PIN);
Adafruit_MPU6050 mpu;
DailyKeyManager keyManager;
PayloadManager payloadManager(&dht, &mpu, keyManager.getDailyKey());


void setup() {
    Serial.begin(115200);
    pinMode(BUTTON_PIN, INPUT_PULLUP);

    keyManager.init();
    Serial.println("\n=== 🚀 ESP32 Daily Key Generator ===");

    Serial.print("📆 Are we on the next day? (y/n): ");
    while (!Serial.available());
    char response = Serial.read();
    Serial.read();  // Clear buffer

    if (response == 'y' || response == 'Y') {
        keyManager.generateDailyKey(true);
    } else {
        Serial.println("✅ Keeping the previous day's key.");
    }

    Wire.begin();
    if (!mpu.begin()) {
        Serial.println("❌ MPU6050 not found!");
        while (1) { delay(10); }
    }


    setupLoRaWAN();  // ✅ Chiamata alla funzione da lora_manager.h
}

void loop() {
    static unsigned long buttonPressTime = 0;
    static bool buttonPressed = false;
    static bool transactionDone = false;
    int buttonState = digitalRead(BUTTON_PIN);

    // Gestione del pulsante premuto
    if (buttonState == LOW) {
        if (!buttonPressed) {
            buttonPressTime = millis();
            buttonPressed = true;
            Serial.println("🔘 Button pressed, hold for 3 seconds to reset...");
        }
        
        // Se il pulsante è tenuto premuto per più di 3 secondi
        if (buttonPressed && (millis() - buttonPressTime > 3000)) {
            Serial.println("⏱️ Button held for 3 seconds");
            // Reset della daily key (include già il riavvio)
            keyManager.resetMasterKey();
            // Reset anche del message counter in flash
            payloadManager.resetMessageCounter();
            // Nota: questa linea non verrà mai eseguita a causa del riavvio
        }
    } 
    // Gestione del rilascio del pulsante
    else if (buttonPressed) {
        buttonPressed = false;
        
        // Se il pulsante è stato premuto brevemente (meno di 3 secondi) ed è la prima volta o dopo una transazione
        if ((millis() - buttonPressTime < 3000)) {
            Serial.print("🔄 Using Daily Key: ");
            Serial.println(keyManager.getCurrentDailyKey());

            String hexPayload = payloadManager.createPayload();

            // Converti String HEX in array di byte
            size_t payload_len = 0;
            uint8_t payload[36];  // Conosciamo la dimensione esatta
            hexStringToByteArray(hexPayload, payload, payload_len);
            Serial.print("Payload convertito (HEX): ");
            for (size_t i = 0; i < payload_len; i++) {
                Serial.printf("%02X ", payload[i]);
            }
            Serial.println();

            // Invia i dati a TTN
            sendToTTN(payload, payload_len);
            
            transactionDone = true;
        }
    }
}

void hexStringToByteArray(String hexString, uint8_t* byteArray, size_t &len) {
  // Rimuove tutti gli spazi dalla stringa
  hexString.replace(" ", "");
  len = hexString.length() / 2;
  for (size_t i = 0; i < len; i++) {
    String byteString = hexString.substring(i * 2, i * 2 + 2);
    byteArray[i] = (uint8_t)strtol(byteString.c_str(), NULL, 16);
  }
}
