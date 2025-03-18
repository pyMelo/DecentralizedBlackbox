#ifndef LORA_MANAGER_H
#define LORA_MANAGER_H

#include <RadioLib.h>
#include <LoRaWAN_ESP32.h>
#include <Preferences.h>  // To store the DevNonce persistently

// LoRa Module Configuration for Heltec ESP32
SX1262 radio = new Module(8, 14, 12, 13);
LoRaWANNode* node;

// Persistent Storage
Preferences preferences;
uint16_t devNonce = 0;  // DevNonce stored in flash

void setupLoRaWAN() {
    Serial.println("🔄 Initializing LoRaWAN...");

    // Read the last DevNonce stored in flash (if it exists)
    preferences.begin("lorawan", false);
    devNonce = preferences.getUShort("dev_nonce", esp_random() & 0xFFFF);  // If not found, generate a random one
    Serial.printf("📟 Using DevNonce: %u\n", devNonce);

    // Initialize the LoRa module
    int16_t state = radio.begin();
    if (state != RADIOLIB_ERR_NONE) {
        Serial.println("❌ LoRa module failed to initialize.");
        return;
    }

    node = persist.manage(&radio);
    node->setDatarate(3);  // Set Data Rate
    node->setADR(false);    // Disable Adaptive Data Rate

    // Check if already activated
    if (node->isActivated()) {
        Serial.println("✅ Device already activated. Skipping join.");
    } else {
        Serial.println("⚠️ Device is not activated! Ensure manual OTAA join is done.");
    }

    // Always generate a new DevNonce for the next session
    devNonce++;
    preferences.putUShort("dev_nonce", devNonce);
    preferences.end();

    // Persist session to avoid rejoining
    persist.saveSession(node);
}

void sendToTTN(uint8_t* payload, size_t len) {
    if (!node->isActivated()) {
        Serial.println("⚠️ Not activated! Cannot send. Load session or re-join required.");
        return;
    }

    Serial.print("📡 Sending Payload to TTN (HEX): ");
    for (int i = 0; i < len; i++) {
        Serial.printf("%02X ", payload[i]);
    }
    Serial.println();

    int state = node->sendReceive(payload, len, 1);
    if (state == RADIOLIB_ERR_NONE) {
        Serial.println("✅ Message sent successfully.");
    } else {
        Serial.printf("❌ Failed to send data (Error: %d)\n", state);
    }

    persist.saveSession(node);  // 🔒 Salvi sempre lo stato aggiornato
}

#endif
