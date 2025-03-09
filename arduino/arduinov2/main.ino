#include "daily_key_manager.h"
#include "payload_manager.h"

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
    Serial.read();  // pulisci il buffer

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
}

void loop() {
    static unsigned long buttonPressTime = 0;
    static bool buttonPressed = false;
    int buttonState = digitalRead(BUTTON_PIN);

    if (buttonState == LOW) {
        if (!buttonPressed) {
            buttonPressTime = millis();
            buttonPressed = true;
        }
        if (millis() - buttonPressTime > 3000) {
            keyManager.resetMasterKey();
        }
    } else if (buttonPressed) {
        Serial.print("🔄 Using Daily Key: ");
        Serial.println(keyManager.getCurrentDailyKey());

        String payload = payloadManager.createPayload();
        payloadManager.sendPayload(payload);
        buttonPressed = false;
    }
}
