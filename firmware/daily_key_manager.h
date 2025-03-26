#ifndef DAILY_KEY_MANAGER_H
#define DAILY_KEY_MANAGER_H

#include <Arduino.h>
#include <Preferences.h>
#include <Crypto.h>
#include <mbedtls/md.h>
#include <TimeLib.h>

#define DAILY_KEY_SIZE 16
#define SECONDS_PER_DAY 86400

class DailyKeyManager {
public:
    DailyKeyManager() {}

    void init() {
        preferences.begin("dailykeys", false);


        time_t startEpoch = preferences.getULong64("start_epoch", getInitialEpoch());
        preferences.putULong64("start_epoch", startEpoch);

        time_t lastEpoch = preferences.getULong64("last_epoch", startEpoch);
        preferences.putULong64("last_epoch", lastEpoch);

        Serial.println("✅ DailyKeyManager Initialized");
        printEpochAsDate(startEpoch, "📅 Start Epoch");
        printEpochAsDate(lastEpoch, "📅 Last Epoch");

        if (!loadDailyKey()) {
            Serial.println("⚠️ No Daily Key found. Generating from start_epoch...");
            generateDailyKey(false);
        }
    }

    bool checkAndUpdateDailyKey(time_t gpsEpoch) {
        static bool debugPrinted = false;
        time_t lastEpoch = preferences.getULong64("last_epoch", 0);

        time_t currentDay = normalizeToDay(gpsEpoch);
        time_t lastDay = normalizeToDay(lastEpoch);

        if (!debugPrinted) {
            printEpochAsDate(gpsEpoch, "🛰️ GPS Current Time");
            printEpochAsDate(lastEpoch, "📅 Stored Last Epoch");
            printEpochAsDate(currentDay, "📅 Normalized GPS Day");
            printEpochAsDate(lastDay, "📅 Normalized Last Day");
        }

        if (currentDay > lastDay) {
            Serial.println("🔄 Day changed, generating new Daily Key...");
            generateDailyKey(true, gpsEpoch);
            Preferences counterPrefs;
            counterPrefs.begin("payload", false);
            counterPrefs.putUInt("counter", 0);
            counterPrefs.end();
            Serial.println("✅ Payload Counter reset for new day");
            debugPrinted = false;
            return true;
        }

        if (!debugPrinted) {
            Serial.println("✅ Same day, no need to generate new Daily Key.");
            debugPrinted = true;
        }
        return false;
    }

    void resetMasterKey() {
        Serial.println("🚨 Resetting keys and storage...");
        preferences.clear();
        preferences.putULong64("last_epoch", getInitialEpoch());
        preferences.end();

        Preferences counterPrefs;
        counterPrefs.begin("payload", false);
        counterPrefs.putUInt("counter", 0);
        counterPrefs.end();

        Serial.println("✅ Reset complete. Restarting...");
        delay(1000);
        ESP.restart();
    }

    uint8_t* getDailyKey() { return daily_key; }
    String getCurrentDailyKey() { return bytesToHex(daily_key, DAILY_KEY_SIZE); }


    bool loadDailyKey() {
        uint8_t storedKey[DAILY_KEY_SIZE];
        if (preferences.getBytes("last_daily_key", daily_key, DAILY_KEY_SIZE) == DAILY_KEY_SIZE) {
            Serial.print("🔄 Loaded Daily Key: ");
            Serial.println(bytesToHex(daily_key, DAILY_KEY_SIZE));

            // 🔥 QUI devi leggere la stored key SEPARATAMENTE (o è identica a daily_key se vuoi confrontare)
            preferences.getBytes("last_daily_key", storedKey, DAILY_KEY_SIZE);
            Serial.print("📌 Stored key: ");
            Serial.println(bytesToHex(storedKey, DAILY_KEY_SIZE));
            return true;
        }

        return false;
    }

  void setManualDailyKey(const String& hexKey) {
        if (hexKey.length() != DAILY_KEY_SIZE * 2) {
            Serial.println("❌ Lunghezza chiave non valida!");
            return;
        }


        uint8_t manualKey[DAILY_KEY_SIZE];
        hexStringToBytes(hexKey, manualKey, DAILY_KEY_SIZE);

        preferences.putBytes("last_daily_key", manualKey, DAILY_KEY_SIZE);
        Serial.print("✅ Nuova Daily Key inserita manualmente: ");
        Serial.println(hexKey);
    }




private:
    Preferences preferences;
    uint8_t daily_key[DAILY_KEY_SIZE];  // <-- aggiungi nuovamente questa linea!



    time_t getInitialEpoch() {
        struct tm timeinfo = {0};
        timeinfo.tm_year = 2025 - 1900;
        timeinfo.tm_mon  = 2;
        timeinfo.tm_mday = 25;
        return mktime(&timeinfo);
    }

    time_t normalizeToDay(time_t epoch) {
        return (epoch / SECONDS_PER_DAY) * SECONDS_PER_DAY;
    }

    void generateDailyKey(bool newDay, time_t gpsEpoch = 0) {
        Serial.println("\n### 🔑 Generating Daily Key...");
        uint8_t previousKey[DAILY_KEY_SIZE] = {0};
        bool hasPreviousKey = loadDailyKey();

        if (!hasPreviousKey || newDay) {
            if (!hasPreviousKey) {
                generateInitialDailyKey(daily_key);
                Serial.println("🚀 First Daily Key generated from Master Key!");
            } else {
                preferences.getBytes("last_daily_key", previousKey, DAILY_KEY_SIZE);
                Serial.println("");
                generateDailyKeyFromPrevious(previousKey, daily_key, gpsEpoch);
                Serial.println("🔁 New Daily Key generated from Previous Key!");
            }

            Serial.print("🔑 New Daily Key: ");
            Serial.println(bytesToHex(daily_key, DAILY_KEY_SIZE));
            preferences.putBytes("last_daily_key", daily_key, DAILY_KEY_SIZE);

            updateStoredEpoch(newDay, gpsEpoch);
        } else {
            Serial.println("🟢 Existing Daily Key in use.");
        }
    }

    void updateStoredEpoch(bool newDay, time_t gpsEpoch) {
        if (newDay && gpsEpoch != 0) {
            preferences.putULong64("last_epoch", gpsEpoch);
            printEpochAsDate(gpsEpoch, "📅 last_epoch updated with GPS");
        } else if (newDay) {
            time_t lastEpoch = preferences.getULong64("last_epoch", 0);
            preferences.putULong64("last_epoch", lastEpoch + SECONDS_PER_DAY);
        }
    }

    void generateInitialDailyKey(uint8_t* outDailyKey) {
        time_t startEpoch = preferences.getULong64("start_epoch", 0);
        String masterKeyStr = getOrAsk("master_key", "🔑 Enter Master Key (hex, 32 or 64 chars): ");
        String vehicleId    = getOrAsk("vehicle_id", "🚗 Enter Vehicle ID: ");

        validateMasterKeyLength(masterKeyStr);

        uint8_t masterKeyBytes[32];
        hexStringToBytes(masterKeyStr, masterKeyBytes, masterKeyStr.length() / 2);

        uint8_t epochBytes[8];
        uint64ToByteArray(startEpoch, epochBytes);

        size_t dataLen = (masterKeyStr.length() / 2) + vehicleId.length() + 8;
        uint8_t* data = new uint8_t[dataLen];

        memcpy(data, masterKeyBytes, masterKeyStr.length() / 2);
        memcpy(data + (masterKeyStr.length() / 2), vehicleId.c_str(), vehicleId.length());
        memcpy(data + (masterKeyStr.length() / 2) + vehicleId.length(), epochBytes, 8);

        sha256(data, dataLen, outDailyKey);
        delete[] data;
    }

    void validateMasterKeyLength(const String& masterKeyStr) {
        size_t len = masterKeyStr.length();
        if (len != 32 && len != 64) {
            Serial.println("❌ Invalid Master Key length! Must be 32 or 64 hex characters.");
        }
    }

    void generateDailyKeyFromPrevious(uint8_t* prevKey, uint8_t* outDailyKey, time_t epochToUse) {
        time_t nextEpoch = normalizeToDay(epochToUse);
        printEpochAsDate(nextEpoch, "📅 Generating Key for Epoch");

        String vehicleId = preferences.getString("vehicle_id");
        uint8_t epochBytes[8];
        uint64ToByteArray(nextEpoch, epochBytes);

        size_t totalLen = DAILY_KEY_SIZE + vehicleId.length() + 8;
        uint8_t* data = new uint8_t[totalLen];

        memcpy(data, prevKey, DAILY_KEY_SIZE);
        memcpy(data + DAILY_KEY_SIZE, vehicleId.c_str(), vehicleId.length());
        memcpy(data + DAILY_KEY_SIZE + vehicleId.length(), epochBytes, 8);

        sha256(data, totalLen, outDailyKey);
        delete[] data;
    }

    void uint64ToByteArray(uint64_t num, uint8_t* bytes) {
        for (int i = 0; i < 8; i++) {
            bytes[7 - i] = num & 0xFF;
            num >>= 8;
        }
    }


    void sha256(const uint8_t* data, size_t dataLen, uint8_t* output) {
        uint8_t hash[32];
        mbedtls_md_context_t ctx;
        mbedtls_md_init(&ctx);
        mbedtls_md_setup(&ctx, mbedtls_md_info_from_type(MBEDTLS_MD_SHA256), 0);
        mbedtls_md_starts(&ctx);
        mbedtls_md_update(&ctx, data, dataLen);
        mbedtls_md_finish(&ctx, hash);
        mbedtls_md_free(&ctx);
        memcpy(output, hash, DAILY_KEY_SIZE);
    }

    String bytesToHex(const uint8_t* bytes, size_t len) {
        String hex = "";
        for (size_t i = 0; i < len; i++) {
            if (bytes[i] < 0x10) hex += "0";
            hex += String(bytes[i], HEX);
        }
        return hex;
    }

    void hexStringToBytes(const String& hexString, uint8_t* buffer, size_t length) {
        for (size_t i = 0; i < length; i++) {
            buffer[i] = strtol(hexString.substring(i * 2, i * 2 + 2).c_str(), NULL, 16);
        }
    }

    String getOrAsk(const char* key, const char* prompt) {
        String value = preferences.getString(key);
        if (value.isEmpty()) {
            Serial.print(prompt);
            while (!Serial.available());
            value = Serial.readStringUntil('\n');
            value.trim();
            preferences.putString(key, value);
        }
        return value;
    }

    void printEpochAsDate(time_t epoch, const String& label = "📅 Date") {
        struct tm* timeinfo = gmtime(&epoch);
        Serial.printf("%s: %02d-%02d-%04d %02d:%02d:%02d UTC\n",
                      label.c_str(),
                      timeinfo->tm_mday, timeinfo->tm_mon + 1, timeinfo->tm_year + 1900,
                      timeinfo->tm_hour, timeinfo->tm_min, timeinfo->tm_sec);
    }
};

#endif
