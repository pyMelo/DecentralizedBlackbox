#ifndef DAILY_KEY_MANAGER_H
#define DAILY_KEY_MANAGER_H

#include <Arduino.h>
#include <Preferences.h>
#include <Crypto.h>
#include <mbedtls/md.h>

#define DAILY_KEY_SIZE 16

class DailyKeyManager {
public:
    DailyKeyManager() {}

    void init() {
        preferences.begin("dailykeys", false);

        uint32_t lastDay = preferences.getUInt("last_day", 0);

        if (preferences.getBytes("last_daily_key", daily_key, DAILY_KEY_SIZE) != DAILY_KEY_SIZE) {
            Serial.println("⚠️ No Daily Key found in storage. Starting from Day 0...");
            preferences.putUInt("last_day", 0);
            generateDailyKey(false);
        } else {
            Serial.print("🔄 Loaded Daily Key from Flash: ");
            Serial.println(bytesToHex(daily_key, DAILY_KEY_SIZE));
        }
    }

    void generateDailyKey(bool newDay) {
        Serial.println("\n### 🔑 Generating Daily Key...");

        uint8_t previousKey[DAILY_KEY_SIZE] = {0};
        uint32_t lastDay = preferences.getUInt("last_day", 0);

        bool hasPreviousKey = preferences.getBytes("last_daily_key", previousKey, DAILY_KEY_SIZE) == DAILY_KEY_SIZE;

        if (!hasPreviousKey || newDay) {
            if (!hasPreviousKey) {
                generateInitialDailyKey(daily_key);
                Serial.println("🚀 First Daily Key generated from Master Key!");
            } else {
                generateDailyKeyFromPrevious(previousKey, daily_key);
                Serial.println("🔁 New Daily Key generated from the Previous Key!");
            }

            Serial.print("🔑 New Daily Key: ");
            Serial.println(bytesToHex(daily_key, DAILY_KEY_SIZE));

            preferences.putBytes("last_daily_key", daily_key, DAILY_KEY_SIZE);
            preferences.putUInt("last_day", lastDay + 1);
        } else {
            Serial.println("🟢 Using existing Daily Key from Flash.");
        }
    }

    void resetMasterKey() {
        Serial.println("🚨 Resetting Master Key & Flash Storage...");
        
        preferences.begin("dailykeys", false);
        preferences.clear();
        preferences.putUInt("last_day", 0);
        preferences.end();

        Serial.println("✅ Flash storage cleared. Restarting...");
        delay(1000);
        ESP.restart();
    }

    uint8_t* getDailyKey() {
        return daily_key;
    }

    String getCurrentDailyKey() {
        return bytesToHex(daily_key, DAILY_KEY_SIZE);
    }

private:
    Preferences preferences;
    uint8_t daily_key[DAILY_KEY_SIZE];

    void generateInitialDailyKey(uint8_t* outDailyKey) {
        uint8_t hash[32];
        uint8_t dayBytes[4] = {0};

        String masterKey = preferences.getString("master_key");
        String vehicleId = preferences.getString("vehicle_id");

        if (masterKey.isEmpty() || vehicleId.isEmpty()) {
            Serial.println("⚠️ No Master Key or Vehicle ID found! Requesting new input...");
            masterKey = getUserInput("🔑 Enter Master Key: ");
            vehicleId = getUserInput("🚗 Enter Vehicle ID: ");
            preferences.putString("master_key", masterKey);
            preferences.putString("vehicle_id", vehicleId);
        }

        size_t dataLen = masterKey.length() + vehicleId.length() + 4;
        uint8_t* data = new uint8_t[dataLen];

        memcpy(data, masterKey.c_str(), masterKey.length());
        memcpy(data + masterKey.length(), vehicleId.c_str(), vehicleId.length());
        memcpy(data + masterKey.length() + vehicleId.length(), dayBytes, 4);

        sha256(data, dataLen, hash);
        memcpy(outDailyKey, hash, DAILY_KEY_SIZE);
        delete[] data;
    }

    void generateDailyKeyFromPrevious(uint8_t* previousKey, uint8_t* outDailyKey) {
        uint8_t counterBytes[4], dataToHash[DAILY_KEY_SIZE + 4], hash[32];

        uint32_t lastDay = preferences.getUInt("last_day", 0);
        uint32_t dayOffset = lastDay;

        intToByteArray(dayOffset, counterBytes);

        Serial.print("📆 Offset Giorno: ");
        Serial.println(dayOffset);

        Serial.print("🔄 Chiave Precedente: ");
        Serial.println(bytesToHex(previousKey, DAILY_KEY_SIZE));

        memcpy(dataToHash, previousKey, DAILY_KEY_SIZE);
        memcpy(dataToHash + DAILY_KEY_SIZE, counterBytes, 4);

        sha256(dataToHash, DAILY_KEY_SIZE + 4, hash);
        memcpy(outDailyKey, hash, DAILY_KEY_SIZE);
    }

    void intToByteArray(uint32_t num, uint8_t* bytes) {
        bytes[3] = num & 0xFF;
        bytes[2] = (num >> 8) & 0xFF;
        bytes[1] = (num >> 16) & 0xFF;
        bytes[0] = (num >> 24) & 0xFF;
    }

    void sha256(const uint8_t* data, size_t dataLen, uint8_t* hash) {
        mbedtls_md_context_t ctx;
        mbedtls_md_init(&ctx);
        mbedtls_md_setup(&ctx, mbedtls_md_info_from_type(MBEDTLS_MD_SHA256), 0);
        mbedtls_md_starts(&ctx);
        mbedtls_md_update(&ctx, data, dataLen);
        mbedtls_md_finish(&ctx, hash);
        mbedtls_md_free(&ctx);
    }

    String bytesToHex(const uint8_t* bytes, size_t len) {
        String result = "";
        for (size_t i = 0; i < len; i++) {
            if (bytes[i] < 16) result += "0";
            result += String(bytes[i], HEX);
        }
        return result;
    }

    String getUserInput(String prompt) {
        Serial.print(prompt);
        while (!Serial.available());
        String input = Serial.readStringUntil('\n');
        input.trim();
        return input;
    }
};

#endif
