#ifndef PAYLOAD_MANAGER_H
#define PAYLOAD_MANAGER_H

#include <Arduino.h>
#include <DHT11.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include "encryption_manager.h"
#include <esp_system.h>  // Per esp_random()
#include <math.h>

// Conserva il message counter e l'IV base nella RTC memory per persistenza tra i riavvii
RTC_DATA_ATTR uint32_t messageCounter = 0;
RTC_DATA_ATTR uint8_t ivBase[12] = {0};  // IV base casuale (12 byte)

#define PAYLOAD_SIZE 36  // Dimensione totale del payload

class PayloadManager {
public:
    PayloadManager(DHT11* dht, Adafruit_MPU6050* mpu, uint8_t* dailyKey)
      : encryptor(dailyKey) {
        this->dht = dht;
        this->mpu = mpu;
    }

    // Genera l'IV effective: primi 4 byte = messageCounter (little-endian) + ivBase (12 byte)
    // Alla prima chiamata, ivBase viene generato casualmente.
    void getEffectiveIV(uint8_t *effectiveIV) {
        if (messageCounter == 0) {
            for (int i = 0; i < 12; i++) {
                ivBase[i] = esp_random() & 0xFF;
            }
        }
        // Copia il messageCounter nei primi 4 byte (little-endian)
        effectiveIV[0] = (uint8_t)(messageCounter & 0xFF);
        effectiveIV[1] = (uint8_t)((messageCounter >> 8) & 0xFF);
        effectiveIV[2] = (uint8_t)((messageCounter >> 16) & 0xFF);
        effectiveIV[3] = (uint8_t)((messageCounter >> 24) & 0xFF);
        // Copia ivBase nei successivi 12 byte
        memcpy(effectiveIV + 4, ivBase, 12);
        // Incrementa il contatore per il messaggio successivo
        messageCounter++;
    }

    String createPayload() {
        uint8_t payload[PAYLOAD_SIZE] = {0};
        int temperature = 0, humidity = 0;

        dht->readTemperatureHumidity(temperature, humidity);

        sensors_event_t a, g, temp;
        mpu->getEvent(&a, &g, &temp);

        float accel_magnitude = sqrt(a.acceleration.x * a.acceleration.x +
                                     a.acceleration.y * a.acceleration.y +
                                     a.acceleration.z * a.acceleration.z);
        // Genera latitudine e longitudine casuali (0-255)
        uint8_t latitude = random(0, 256);
        uint8_t longitude = random(0, 256);

        Serial.printf("\n🌡 Temperature: %d°C\n", temperature);
        Serial.printf("💧 Humidity: %d%%\n", humidity);
        Serial.printf("🌀 Gyro X: %.2f, Y: %.2f, Z: %.2f\n", g.gyro.x, g.gyro.y, g.gyro.z);
        Serial.printf("🔋 Accelerometer Magnitude: %.2f\n", accel_magnitude);
        Serial.printf("📍 Latitude: %d, Longitude: %d\n", latitude, longitude);

        int index = 0;
        // Temperature (3 byte)
        payload[index++] = 0x01; // Marker Temperature
        payload[index++] = (temperature >> 8) & 0xFF;
        payload[index++] = temperature & 0xFF;
        // Humidity (3 byte)
        payload[index++] = 0x02; // Marker Humidity
        payload[index++] = (humidity >> 8) & 0xFF;
        payload[index++] = humidity & 0xFF;
        // Gyroscope (7 byte: marker + 3*int16)
        payload[index++] = 0x03; // Marker Gyroscope
        int16_t gx = (int16_t)(g.gyro.x * 100);
        int16_t gy = (int16_t)(g.gyro.y * 100);
        int16_t gz = (int16_t)(g.gyro.z * 100);
        payload[index++] = (gx >> 8) & 0xFF;
        payload[index++] = gx & 0xFF;
        payload[index++] = (gy >> 8) & 0xFF;
        payload[index++] = gy & 0xFF;
        payload[index++] = (gz >> 8) & 0xFF;
        payload[index++] = gz & 0xFF;
        // Ora index = 13

        // Inserisci l'IV effective (16 byte) nei byte 13-28
        uint8_t effectiveIV[16];
        getEffectiveIV(effectiveIV);
        memcpy(payload + index, effectiveIV, 16);
        index += 16;  // Ora index = 29

        // Inserisci il flag di cifratura in chiaro (1 byte) al byte 29
        payload[index++] = 0x80;  // Byte 29

        // Blocco da cifrare (6 byte, da indice 30 a 35)
        // Accelerometer (3 byte)
        payload[index++] = 0x04; // Marker Accelerometer
        int16_t accelVal = (int16_t)(accel_magnitude * 100);
        payload[index++] = (accelVal >> 8) & 0xFF;
        payload[index++] = accelVal & 0xFF;
        // Lat/Long (3 byte)
        payload[index++] = 0x05; // Marker LatLong
        payload[index++] = latitude;
        payload[index++] = longitude;
        // Ora index dovrebbe essere 36 (PAYLOAD_SIZE)

        Serial.print("🔹 Unencrypted Payload: ");
        for (int i = 0; i < PAYLOAD_SIZE; i++) {
            Serial.printf("%02X ", payload[i]);
        }
        Serial.println();

        // Cifra solo il blocco da cifrare (6 byte, da indice 30 a 35)
        encryptor.encryptAESCTR(&payload[30], 6, effectiveIV);

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

private:
    DHT11* dht;
    Adafruit_MPU6050* mpu;
    EncryptionManager encryptor;
};

#endif
