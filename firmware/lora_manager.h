#ifndef LORA_MANAGER_H
#define LORA_MANAGER_H

#include <RadioLib.h>
#include <LoRaWAN_ESP32.h>
#include <Preferences.h>

// LoRa Module Configuration for Heltec ESP32
SX1262 radio = new Module(8, 14, 12, 13);
LoRaWANNode* node = nullptr;
Preferences preferences;
uint16_t devNonce = 0;

void LoRaWAN_setup() {
    Serial.println("🔄 Initializing LoRaWAN...");

    preferences.begin("lorawan", false);
    devNonce = preferences.getUShort("dev_nonce", esp_random() & 0xFFFF);
    Serial.printf("📟 Using DevNonce: %u\n", devNonce);

    int16_t state = radio.begin();
    if (state != RADIOLIB_ERR_NONE) {
        Serial.println("❌ LoRa module failed to initialize.");
        return;
    }

    node = persist.manage(&radio);
    node->setDatarate(3);
    node->setADR(false);


    if (persist.loadSession(node) && node->isActivated()) {
        Serial.println("✅ Device already activated.");
    } else {
        Serial.println("⚠️ Device not activated! Ensure manual OTAA join is done.");
    }

    devNonce++;
    preferences.putUShort("dev_nonce", devNonce);
    preferences.end();

    persist.saveSession(node);
}


bool LoRaWAN_send(uint8_t* payload, size_t len) {
    if (!node->isActivated()) {
        Serial.println("⚠️ Not activated! Cannot send. Load session or re-join required.");
        return false;
    }

    Serial.print("📡 Sending Payload to TTN (HEX): ");
    for (size_t i = 0; i < len; i++) {
        Serial.printf("%02X ", payload[i]);
    }
    Serial.println();

    int state = node->sendReceive(payload, len, 1);
    if (state == RADIOLIB_ERR_NONE) {
        Serial.println("✅ Message sent successfully.");
        persist.saveSession(node);
        return true;
    } else {
        Serial.printf("❌ Failed to send data (Error: %d)\n", state);
        return false;
    }
}

#endif
