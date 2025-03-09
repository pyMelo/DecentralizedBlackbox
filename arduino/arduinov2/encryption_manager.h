#ifndef ENCRYPTION_MANAGER_H
#define ENCRYPTION_MANAGER_H

#include <Arduino.h>
#include <Crypto.h>
#include <AES.h>
#include <CTR.h>

class EncryptionManager {
public:
    EncryptionManager(uint8_t* key) {
        this->key = key;
        Serial.print("🛡️ AES-128 Daily Key: ");
        for (int i = 0; i < 16; i++){
            Serial.printf("%02X", key[i]);
        }
        Serial.println();
    }

    // Funzione che cifra in modalità AES-128 CTR usando l'IV passato come parametro.
    void encryptAESCTR(uint8_t* data, size_t length, uint8_t* effectiveIV) {
        // Visualizza l'IV effective
        Serial.print("🟢 Effective IV: ");
        for (int i = 0; i < 16; i++) {
            Serial.printf("%02X ", effectiveIV[i]);
        }
        Serial.println();

        // Inizializza AES-128 in modalità CTR con l'IV effective
        AES128 aes;
        CTR<AES128> aesCtr;
        aesCtr.setKey(key, 16);        
        aesCtr.setIV(effectiveIV, 16); 

        // Visualizza i dati prima della cifratura
        Serial.print("🔄 Data Before Encryption: ");
        for (size_t i = 0; i < length; i++) {
            Serial.printf("%02X ", data[i]);
        }
        Serial.println();

        // Cifra in-place
        aesCtr.encrypt(data, data, length);

        // Visualizza i dati cifrati
        Serial.print("🔒 Data After Encryption: ");
        for (size_t i = 0; i < length; i++) {
            Serial.printf("%02X ", data[i]);
        }
        Serial.println();
    }
private:
    uint8_t* key;
};

#endif
