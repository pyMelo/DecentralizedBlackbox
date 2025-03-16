#ifndef PAYLOAD_MANAGER_H
#define PAYLOAD_MANAGER_H

#include <Arduino.h>
#include <DHT11.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include "encryption_manager.h"
#include <Preferences.h>
#include <math.h>

#define PAYLOAD_SIZE 29  // Dimensione totale del payload

class PayloadManager {
public:
    // Nel costruttore del PayloadManager
  PayloadManager(DHT11* dht, Adafruit_MPU6050* mpu, uint8_t* dailyKey)
  : encryptor(dailyKey)
{
    this->dht = dht;
    this->mpu = mpu;
    prefs.begin("payload", false);
    // Se non esiste il counter, viene restituito 0 (prima esecuzione)
    messageCounter = prefs.getUInt("counter", 0);
    Serial.printf("📊 Loaded Message Counter: %u\n", messageCounter);
}


  void getEffectiveIV(uint8_t *effectiveIV) {
    // Usa un oggetto Preferences locale
    Preferences localPrefs;
    localPrefs.begin("payload", false);
    
    // Leggi il counter salvato (se non esiste, usa il valore corrente in messageCounter)
    messageCounter = localPrefs.getUInt("counter", messageCounter);
    
    // Componi l'IV dai primi 4 byte (little-endian)
    effectiveIV[0] = (uint8_t)(messageCounter & 0xFF);
    effectiveIV[1] = (uint8_t)((messageCounter >> 8) & 0xFF);
    effectiveIV[2] = (uint8_t)((messageCounter >> 16) & 0xFF);
    effectiveIV[3] = (uint8_t)((messageCounter >> 24) & 0xFF);
    memset(effectiveIV + 4, 0, 12);  // I restanti 12 byte a 0

    // Incrementa il counter per il prossimo invio
    messageCounter++;
    localPrefs.putUInt("counter", messageCounter);

    // Chiudi il namespace per assicurare che i dati siano salvati
    localPrefs.end();
    
    Serial.printf("📊 Updated Message Counter: %u\n", messageCounter);
}



    // Crea il payload seguendo la struttura:
    // [16 byte IV effective] + [1 byte lunghezza blocco chiaro (6) + 6 byte clear block] +
    // [1 byte lunghezza blocco cifrato (5) + 5 byte blocco cifrato]
    String createPayload() {
        uint8_t payload[PAYLOAD_SIZE] = {0};
        int temperature = 0, humidity = 0;
        dht->readTemperatureHumidity(temperature, humidity);

        sensors_event_t a, g, temp;
        mpu->getEvent(&a, &g, &temp);

        // Calcola la magnitudine dell'accelerometro
        float accel_magnitude = sqrt(a.acceleration.x * a.acceleration.x +
                                     a.acceleration.y * a.acceleration.y +
                                     a.acceleration.z * a.acceleration.z);
        // Genera valori casuali per latitudine e longitudine (0-255)
        uint8_t latitude = random(0, 256);
        uint8_t longitude = random(0, 256);

        Serial.printf("\n🌡 Temperature: %d°C\n", temperature);
        Serial.printf("💧 Humidity: %d%%\n", humidity);
        Serial.printf("🌀 Gyro X: %.2f, Y: %.2f, Z: %.2f\n", g.gyro.x, g.gyro.y, g.gyro.z);
        Serial.printf("🔋 Accelerometer Magnitude: %.2f\n", accel_magnitude);
        Serial.printf("📍 Latitude: %d, Longitude: %d\n", latitude, longitude);

        int index = 0;
        uint8_t effectiveIV[16];
        getEffectiveIV(effectiveIV);

        // Inserisce l'IV effective (16 byte) all'inizio del payload
        memcpy(payload + index, effectiveIV, 16);
        index += 16;

        // Blocco in chiaro (6 byte):
        // 1 byte lunghezza (6)
        // 1 byte marker per il sensore (0x01) + 1 byte dato temperatura
        // 1 byte marker per il giroscopio (0x03) + 3 byte dati giroscopio (1 per asse)
        payload[index++] = 6;
        payload[index++] = 0x01;              // Marker per il sensore (temperatura)
        payload[index++] = (uint8_t)temperature; // Dato del sensore
        payload[index++] = 0x03;              // Marker per il giroscopio
        // Scala e cast per i valori del giroscopio (1 byte per asse)
        int8_t gx = (int8_t)round(g.gyro.x * 100);
        int8_t gy = (int8_t)round(g.gyro.y * 100);
        int8_t gz = (int8_t)round(g.gyro.z * 100);
        payload[index++] = (uint8_t)gx;
        payload[index++] = (uint8_t)gy;
        payload[index++] = (uint8_t)gz;
        // Ora index è a 23

        // Blocco cifrato (5 byte):
        // 1 byte lunghezza (5)
        // 1 byte marker accelerometro (0x04) + 1 byte dato accelerometro
        // 1 byte marker GPS (0x05) + 2 byte dati GPS (latitudine e longitudine)
        payload[index++] = 5;
        payload[index++] = 0x04;              // Marker accelerometro
        payload[index++] = (uint8_t)round(accel_magnitude);
        payload[index++] = 0x05;              // Marker GPS
        payload[index++] = latitude;
        payload[index++] = longitude;

        Serial.print("🔹 Unencrypted Payload: ");
        for (int i = 0; i < PAYLOAD_SIZE; i++) {
            Serial.printf("%02X ", payload[i]);
        }
        Serial.println();

        // Cifra il blocco cifrato (5 byte, a partire dal byte 24)
        encryptor.encryptAESCTR(&payload[24], 5, effectiveIV);

        Serial.print("🔹 Final Encrypted Payload: ");
        for (int i = 0; i < PAYLOAD_SIZE; i++) {
            Serial.printf("%02X ", payload[i]);
        }
        Serial.println();

        String payloadHexStr = "";
        for (int i = 0; i < PAYLOAD_SIZE; i++) {
            char buf[3];
            sprintf(buf, "%02X", payload[i]);
            payloadHexStr += buf;
            if (i < PAYLOAD_SIZE - 1) {
                payloadHexStr += " ";
            }
        }
        return payloadHexStr;
    }

    void sendPayload(String payload) {
        Serial.println("📡 Sending Payload...");
        Serial.println("📦 Payload: " + payload);
    }
    void resetMessageCounter() {
        messageCounter = 0;
        prefs.putUInt("counter", messageCounter);
        Serial.println("📊 Message Counter reset to 0");
    }

private:
    DHT11* dht;
    Adafruit_MPU6050* mpu;
    EncryptionManager encryptor;
    Preferences prefs;
    uint32_t messageCounter;
};

#endif
