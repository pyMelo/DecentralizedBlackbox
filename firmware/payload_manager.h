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

#define PAYLOAD_SIZE 35  // Lat(4) + Lon(4) -> 8 bytes

class PayloadManager {
public:
    // Updated constructor: now accepts a TinyGPSPlus pointer and a bool indicating MPU availability
    PayloadManager(DHT11* dht, Adafruit_MPU6050* mpu, TinyGPSPlus* gps, uint8_t* dailyKey, bool mpuAvailable)
      : encryptor(dailyKey)
    {
        this->dht = dht;
        this->mpu = mpu;
        this->gps = gps;
        this->mpuAvailable = mpuAvailable;
        prefs.begin("payload", false);
        messageCounter = prefs.getUInt("counter", 0);
        Serial.printf("📊 Loaded Message Counter: %u\n", messageCounter);
    }

    void getEffectiveIV(uint8_t *effectiveIV) {
        Preferences localPrefs;
        localPrefs.begin("payload", false);
        messageCounter = localPrefs.getUInt("counter", messageCounter);
        effectiveIV[0] = (uint8_t)(messageCounter & 0xFF);
        effectiveIV[1] = (uint8_t)((messageCounter >> 8) & 0xFF);
        effectiveIV[2] = (uint8_t)((messageCounter >> 16) & 0xFF);
        effectiveIV[3] = (uint8_t)((messageCounter >> 24) & 0xFF);
        memset(effectiveIV + 4, 0, 12);  // Set remaining 12 bytes to 0
        messageCounter++;
        localPrefs.putUInt("counter", messageCounter);
        localPrefs.end();
        Serial.printf("📊 Updated Message Counter: %u\n", messageCounter);
    }

    // Create the payload using real GPS data for latitude and longitude.
    String createPayload() {
        uint8_t payload[PAYLOAD_SIZE] = {0};
        int temperature = 0, humidity = 0;
        dht->readTemperatureHumidity(temperature, humidity);

        sensors_event_t a, g, temp;
        if (mpuAvailable) {
            mpu->getEvent(&a, &g, &temp);
        } else {
            // Default sensor values if MPU is not available
            a.acceleration.x = 0;
            a.acceleration.y = 0;
            a.acceleration.z = 0;
            g.gyro.x = 0;
            g.gyro.y = 0;
            g.gyro.z = 0;
            temp.temperature = 0;
        }

        // Calculate accelerometer magnitude
        float accel_magnitude = sqrt(a.acceleration.x * a.acceleration.x +
                                    a.acceleration.y * a.acceleration.y +
                                    a.acceleration.z * a.acceleration.z);
        // Get GPS latitude and longitude from TinyGPS++
// Dentro createPayload():
        double lat = gps->location.isValid() ? gps->location.lat() : 0.0;
        double lon = gps->location.isValid() ? gps->location.lng() : 0.0;

        // REAL FETCHING ---------

        int32_t lat_scaled = (int32_t)(lat * 1e7);
        int32_t lon_scaled = (int32_t)(lon * 1e7);

        //int32_t lat_scaled = 385237110;  // 37.523711
        //int32_t lon_scaled = 160713680;  // 15.071368
        Serial.printf("\n🌡 Temperature: %d°C\n", temperature);
        Serial.printf("💧 Humidity: %d%%\n", humidity);
        Serial.printf("🌀 Gyro X: %.2f, Y: %.2f, Z: %.2f\n", g.gyro.x, g.gyro.y, g.gyro.z);
        Serial.printf("🔋 Accelerometer Magnitude: %.2f\n", accel_magnitude);


        Serial.printf("📍 Latitude: %.7f → %ld\n", lat, lat_scaled);
        Serial.printf("📍 Longitude: %.7f → %ld\n", lon, lon_scaled);

        int index = 0;
        uint8_t effectiveIV[16];
        getEffectiveIV(effectiveIV);

        // Insert effective IV (16 bytes) at the start of the payload
        memcpy(payload + index, effectiveIV, 16);
        index += 16;

        // Clear block (6 bytes):
        // 1 byte: length (6)
        // 1 byte: sensor marker (0x01) + 1 byte: temperature
        // 1 byte: gyroscope marker (0x03) + 3 bytes: gyro (one per axis)
        payload[index++] = 6;
        payload[index++] = 0x01;
        payload[index++] = (uint8_t)temperature;
        payload[index++] = 0x03;
        int8_t gx = (int8_t)round(g.gyro.x * 100);
        int8_t gy = (int8_t)round(g.gyro.y * 100);
        int8_t gz = (int8_t)round(g.gyro.z * 100);
        payload[index++] = (uint8_t)gx;
        payload[index++] = (uint8_t)gy;
        payload[index++] = (uint8_t)gz;
        // Now index is 23

        // Encrypted block (5 bytes):
        // 1 byte: length (5)
        // 1 byte: accelerometer marker (0x04) + 1 byte: accelerometer data
        // 1 byte: GPS marker (0x05) + 2 bytes: GPS (latitude and longitude)
        payload[index++] = 11;             // Lunghezza blocco cifrato (9 bytes)
        payload[index++] = 0x04;          // Marker accelerometro
        payload[index++] = (uint8_t)round(accel_magnitude);
        payload[index++] = 0x05;          // Marker GPS

        memcpy(payload + index, &lat_scaled, 4);  // Latitudine precisa
        index += 4;
        memcpy(payload + index, &lon_scaled, 4);  // Longitudine precisa
        index += 4;


        Serial.print("🔹 Unencrypted Payload: ");
        for (int i = 0; i < PAYLOAD_SIZE; i++) {
            Serial.printf("%02X ", payload[i]);
        }
        Serial.println();

        // Encrypt the encrypted block (5 bytes starting at byte 24)
        encryptor.encryptAESCTR(&payload[24], 11, effectiveIV);

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
    TinyGPSPlus* gps;
    EncryptionManager encryptor;
    Preferences prefs;
    uint32_t messageCounter;
    bool mpuAvailable;  // Indicates if MPU6050 is available
};

#endif
