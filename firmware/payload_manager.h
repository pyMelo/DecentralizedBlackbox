#ifndef PAYLOAD_MANAGER_H
#define PAYLOAD_MANAGER_H

#include <Arduino.h>
#include <DHT11.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <TinyGPS++.h>
#include "encryption_manager.h"
#include <Preferences.h>
#include <math.h>

#define PAYLOAD_SIZE 20
class PayloadManager {
public:
    PayloadManager(DHT11* dht, Adafruit_MPU6050* mpu, TinyGPSPlus* gps, uint8_t* dailyKey, bool mpuAvailable)
        : encryptor(dailyKey) {
        this->dht = dht;
        this->mpu = mpu;
        this->gps = gps;
        this->mpuAvailable = mpuAvailable;
        prefs.begin("payload", false);
        messageCounter = prefs.getUInt("counter", 0);
        Serial.printf("\U0001F4CA Loaded Message Counter: %u\n", messageCounter);
    }

    // Generate the 2-byte IV and update the counter
    void getIVForTransmission(uint8_t *iv2Bytes) {
        Preferences localPrefs;
        localPrefs.begin("payload", false);
        messageCounter = localPrefs.getUInt("counter", messageCounter);

        iv2Bytes[0] = (uint8_t)(messageCounter & 0xFF);
        iv2Bytes[1] = (uint8_t)((messageCounter >> 8) & 0xFF);

        messageCounter++;
        localPrefs.putUInt("counter", messageCounter);
        localPrefs.end();

        Serial.printf("\U0001F4CA Updated Message Counter: %u\n", messageCounter);
    }

    String createPayload() {
        uint8_t payload[PAYLOAD_SIZE] = {0};
        int temperature = 0, humidity = 0;
        dht->readTemperatureHumidity(temperature, humidity);


        sensors_event_t a, g, tempEvent;
        if (mpuAvailable) {
            mpu->getEvent(&a, &g, &tempEvent);
        } else {
            memset(&a, 0, sizeof(a));
            memset(&g, 0, sizeof(g));
            tempEvent.temperature = 0;
        }

        float accel_magnitude = sqrt(a.acceleration.x * a.acceleration.x +
                                     a.acceleration.y * a.acceleration.y +
                                     a.acceleration.z * a.acceleration.z);

        double lat = gps->location.isValid() ? gps->location.lat() : 0.0;
        double lon = gps->location.isValid() ? gps->location.lng() : 0.0;

        int32_t lat_scaled = (int32_t)(lat * 1e7);
        int32_t lon_scaled = (int32_t)(lon * 1e7);

        Serial.printf("\n\U0001F321 Temperature: %d\u00B0C\n", temperature);
        Serial.printf("\U0001F4A7 Humidity: %d%%\n", humidity);
        Serial.printf("\U0001F300 Gyro X: %.2f, Y: %.2f, Z: %.2f\n", g.gyro.x, g.gyro.y, g.gyro.z);
        Serial.printf("\U0001F50B Accelerometer Magnitude: %.2f\n", accel_magnitude);
        Serial.printf("\U0001F4CD Latitude: %.7f -> %ld\n", lat, lat_scaled);
        Serial.printf("\U0001F4CD Longitude: %.7f -> %ld\n", lon, lon_scaled);

        int index = 0;
        uint8_t iv2Bytes[2];
        getIVForTransmission(iv2Bytes);

        // Store only 2-byte IV in payload
        memcpy(payload + index, iv2Bytes, 2);
        index += 2;

        // Clear sensor block
        payload[index++] = 6;            // Block length
        payload[index++] = 0x01;         // Temp marker
        payload[index++] = (uint8_t)temperature;
        payload[index++] = 0x03;         // Gyro marker
        payload[index++] = (int8_t)round(g.gyro.x * 100);
        payload[index++] = (int8_t)round(g.gyro.y * 100);
        payload[index++] = (int8_t)round(g.gyro.z * 100);

        // Encrypted block preparation
        uint8_t encryptedBlock[11] = {0};
        int encIdx = 0;
        encryptedBlock[encIdx++] = 11;  // Block length
        encryptedBlock[encIdx++] = 0x04;  // Accelerometer marker
        encryptedBlock[encIdx++] = (uint8_t)round(accel_magnitude);
        encryptedBlock[encIdx++] = 0x05;  // GPS marker
        memcpy(encryptedBlock + encIdx, &lat_scaled, 4);
        encIdx += 4;
        memcpy(encryptedBlock + encIdx, &lon_scaled, 4);

        // Prepare full 16-byte IV for encryption
        uint8_t effectiveIV[16] = {0};
        effectiveIV[0] = iv2Bytes[0];
        effectiveIV[1] = iv2Bytes[1];

        // Encrypt the block
        encryptor.encryptAESCTR(encryptedBlock, 11, effectiveIV);

        // Append encrypted block to payload
        memcpy(payload + index, encryptedBlock, 11);
        index += 11;



        // Final log
        Serial.print("\U0001F539 Final Encrypted Payload: ");
        for (int i = 0; i < PAYLOAD_SIZE; i++) {
            Serial.printf("%02X ", payload[i]);
        }
        Serial.println();

        // Convert payload to HEX string
        String payloadHexStr = "";
        for (int i = 0; i < PAYLOAD_SIZE; i++) {
            char buf[3];
            sprintf(buf, "%02X", payload[i]);
            payloadHexStr += buf;
            if (i < PAYLOAD_SIZE - 1) payloadHexStr += " ";
        }
        return payloadHexStr;
    }

    void sendPayload(String payload) {
        Serial.println("\U0001F4E1 Sending Payload...");
        Serial.println("\U0001F4E6 Payload: " + payload);
    }

    void resetMessageCounter() {
        messageCounter = 0;
        prefs.putUInt("counter", messageCounter);
        Serial.println("\U0001F4CA Message Counter reset to 0");
    }

private:
    DHT11* dht;
    Adafruit_MPU6050* mpu;
    TinyGPSPlus* gps;
    EncryptionManager encryptor;
    Preferences prefs;
    uint32_t messageCounter;
    bool mpuAvailable;
};

#endif
