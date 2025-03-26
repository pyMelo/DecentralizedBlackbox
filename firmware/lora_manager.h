#ifndef LORA_MANAGER_H
#define LORA_MANAGER_H

#include <RadioLib.h>
#include <LoRaWAN_ESP32.h>
#include <Preferences.h>

#define BUFFER_SIZE 4
#define MAX_PAYLOAD_SIZE 20

// LoRa Module Configuration for Heltec ESP32
SX1262 radio = new Module(8, 14, 12, 13);
LoRaWANNode* node = nullptr;
Preferences preferences;
uint16_t devNonce = 0;
// Buffer per i payload falliti
uint8_t payloadBuffer[BUFFER_SIZE][MAX_PAYLOAD_SIZE];
size_t payloadLengths[BUFFER_SIZE];
int bufferCount = 0;

void LoRaWAN_setup() {
    Serial.println("🔄 Initializing LoRaWAN...");

    preferences.begin("lorawan", false);

    // ✅ DevNonce ora è incrementale e persistente
    devNonce = preferences.getUShort("dev_nonce", 0);
    Serial.printf("📟 Using DevNonce: %u\n", devNonce);

    int16_t state = radio.begin();
    if (state != RADIOLIB_ERR_NONE) {
        Serial.println("❌ LoRa module failed to initialize.");
        preferences.end();
        return;
    }

    node = persist.manage(&radio);
    node->setDatarate(3);
    node->setADR(false);
    persist.loadSession(node);
    if (persist.loadSession(node) && node->isActivated()) {
        Serial.println("✅ Device already activated.");
    } else {
        Serial.println("⚠️ Device not activated! Ensure manual OTAA join is done.");
    }

    // ✅ Incrementa e salva il nuovo devNonce
    devNonce++;

    preferences.putUShort("dev_nonce", devNonce);
    preferences.end();

    persist.saveSession(node);
}

void addToBuffer(uint8_t* payload, size_t len){

  if(bufferCount < BUFFER_SIZE){
    memcpy(payloadBuffer[bufferCount], payload, len);
    payloadLengths[bufferCount] = len;
    bufferCount++;
    Serial.println("Payload salvato");
  } else {
    Serial.println("Buffer pieno");
  }
}

bool LoRaWAN_send(uint8_t* payload, size_t len) {
    if (!node->isActivated()) {
        Serial.println("⚠️ Not activated! Cannot send. Load session or re-join required.");
        addToBuffer(payload, len);  // ✅ CORRETTO
        LoRaWAN_setup();
        return false;
    }
    
    size_t totalLen = len;
    for(int i = 0; i < bufferCount; i++) totalLen += payloadLengths[i];
    uint8_t combinedPayload[MAX_PAYLOAD_SIZE * (BUFFER_SIZE + 1 )] = {0};
    size_t offset = 0;


    for(int i = 0; i < bufferCount; i++){
      memcpy(combinedPayload + offset, payloadBuffer[i], payloadLengths[i]);
      offset += payloadLengths[i];
    }

    memcpy(combinedPayload + offset , payload , len);

    offset += len;
    Serial.print("📡 Sending Payload to TTN (HEX): ");
    for (size_t i = 0; i < offset; i++) {
        Serial.printf("%02X ", combinedPayload[i]);
    }
    Serial.println();

    int state = node->sendReceive(combinedPayload, len, 1); 
    if (state == RADIOLIB_ERR_NONE) {
        Serial.println("✅ Message sent successfully.");
        persist.saveSession(node);
        for (int i = 0; i < BUFFER_SIZE; i++) {
            memset(payloadBuffer[i], 0, MAX_PAYLOAD_SIZE);
            payloadLengths[i] = 0;
        }
        bufferCount = 0;
        return true;
    } else {
        Serial.printf("❌ Failed to send data (Error: %d)\n", state);
        addToBuffer(payload,len);
        LoRaWAN_setup();
        return false;
    }



    return (state == RADIOLIB_ERR_NONE);

}

#endif
