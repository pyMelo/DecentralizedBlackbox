#ifndef DAILY_KEY_MANAGER_H
#define DAILY_KEY_MANAGER_H

#include <Arduino.h>
#include <Preferences.h>
#include <Crypto.h>
#include <mbedtls/md.h>
#include <time.h>

#define DAILY_KEY_SIZE 16
#define SECONDS_PER_DAY 86400

class DailyKeyManager {
public:
    DailyKeyManager() {}

    // Restituisce il timestamp epoch per la data prefissata (14 marzo 2025 00:00:00 UTC)
    time_t initEpoch() {
        // Imposta la TZ su UTC
        setenv("TZ", "UTC0", 1);
        tzset();
        struct tm timeinfo = {0};
        timeinfo.tm_year = 2025 - 1900;
        timeinfo.tm_mon  = 2;      // Marzo (0=Gennaio, 2=Marzo)
        timeinfo.tm_mday = 14;
        timeinfo.tm_hour = 0;
        timeinfo.tm_min  = 0;
        timeinfo.tm_sec  = 0;
        return mktime(&timeinfo);
    }

    void init() {
        preferences.begin("dailykeys", false);
        time_t startEpoch = preferences.getULong64("start_epoch", 0);
        if (startEpoch == 0) {
            startEpoch = initEpoch();
            preferences.putULong64("start_epoch", startEpoch);
        }
        
        // Legge last_epoch; se non esiste lo inizializza con startEpoch
        time_t lastEpoch = preferences.getULong64("last_epoch", 0);
        if (lastEpoch == 0) {
            lastEpoch = startEpoch;
            preferences.putULong64("last_epoch", lastEpoch);
        }
        
        // Se non esiste la Daily Key in memoria, generala partendo da startEpoch
        if (preferences.getBytes("last_daily_key", daily_key, DAILY_KEY_SIZE) != DAILY_KEY_SIZE) {
            Serial.println("⚠️ No Daily Key found in storage. Starting from start_epoch...");
            generateDailyKey(false);
        } else {
            Serial.print("🔄 Loaded Daily Key from Flash: ");
            Serial.println(bytesToHex(daily_key, DAILY_KEY_SIZE));
        }
    }

    bool checkAndUpdateDailyKey() {
        time_t currentEpoch = time(NULL);
        time_t lastEpoch = preferences.getULong64("last_epoch", 0);
        time_t currentDay = normalizeToDay(currentEpoch);
        time_t lastDay = normalizeToDay(lastEpoch);
        if (currentDay > lastDay) {
            generateDailyKey(true);
            return true;
        }
        return false;
    }

    void generateDailyKey(bool newDay) {
        Serial.println("\n### 🔑 Generating Daily Key...");
        uint8_t previousKey[DAILY_KEY_SIZE] = {0};
        time_t lastEpoch = preferences.getULong64("last_epoch", 0);
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
            // Aggiorna last_epoch: incrementa di un giorno il valore memorizzato
            time_t nextDay = lastEpoch + SECONDS_PER_DAY;
            preferences.putULong64("last_epoch", nextDay);
            Serial.print("📅 Next key activation epoch: ");
            Serial.println(nextDay);
        } else {
            Serial.println("🟢 Using existing Daily Key from Flash.");
        }
    }

    void resetMasterKey() {
        Serial.println("🚨 Resetting Master Key & Flash Storage...");
        preferences.begin("dailykeys", false);
        preferences.clear();
        preferences.putULong64("last_epoch", initEpoch());
        preferences.end();
        Preferences counterPrefs;
        counterPrefs.begin("payload", false);
        counterPrefs.putUInt("counter", 0);
        counterPrefs.end();
        Serial.println("📊 Message Counter reset to 0");
        Serial.println("✅ Flash storage cleared. Restarting...");
        delay(1000);
        ESP.restart();
    }

    uint8_t* getDailyKey() { return daily_key; }
    String getCurrentDailyKey() { return bytesToHex(daily_key, DAILY_KEY_SIZE); }

private:
    Preferences preferences;
    uint8_t daily_key[DAILY_KEY_SIZE];

    // Normalizza il timestamp a mezzanotte (UTC) in modo semplice
    time_t normalizeToDay(time_t epoch) {
        return (epoch / SECONDS_PER_DAY) * SECONDS_PER_DAY;
    }

    void hexStringToBytes(const String &hexString, uint8_t* buffer, size_t bufferSize) {
        for (size_t i = 0; i < bufferSize; i++) {
            char highChar = hexString.charAt(2 * i);
            char lowChar = hexString.charAt(2 * i + 1);
            uint8_t high = (highChar >= '0' && highChar <= '9') ? highChar - '0' :
                           (highChar >= 'A' && highChar <= 'F') ? highChar - 'A' + 10 :
                           (highChar >= 'a' && highChar <= 'f') ? highChar - 'a' + 10 : 0;
            uint8_t low = (lowChar >= '0' && lowChar <= '9') ? lowChar - '0' :
                          (lowChar >= 'A' && lowChar <= 'F') ? lowChar - 'A' + 10 :
                          (lowChar >= 'a' && lowChar <= 'f') ? lowChar - 'a' + 10 : 0;
            buffer[i] = (high << 4) | low;
        }
    }

    // Genera la daily key iniziale:
    // SHA-256( masterKey_bytes || vehicleId (ASCII) || startEpoch_in_8_byte_BE )
    void generateInitialDailyKey(uint8_t* outDailyKey) {
        uint8_t hash[32];
        // Utilizza il valore salvato in start_epoch (già impostato in init())
        time_t startEpoch = preferences.getULong64("start_epoch", 0);
        Serial.print("Start Epoch: ");
        Serial.println(startEpoch);

        uint8_t epochBytes[8];
        uint64ToByteArray(startEpoch, epochBytes);
        String masterKeyStr = preferences.getString("master_key");
        String vehicleId = preferences.getString("vehicle_id");
        if (masterKeyStr.isEmpty() || vehicleId.isEmpty()) {
            Serial.println("⚠️ No Master Key or Vehicle ID found! Requesting new input...");
            masterKeyStr = getUserInput("🔑 Enter Master Key (in hex, 32 or 64 characters): ");
            vehicleId = getUserInput("🚗 Enter Vehicle ID: ");
            preferences.putString("master_key", masterKeyStr);
            preferences.putString("vehicle_id", vehicleId);
        }
        size_t len = masterKeyStr.length();
        size_t masterKeyByteLen = 0;
        if(len == 32) {
            masterKeyByteLen = 16;
        } else if(len == 64) {
            masterKeyByteLen = 32;
        } else {
            Serial.println("Errore: la Master Key deve essere di 32 o 64 caratteri esadecimali!");
            return;
        }
        uint8_t* masterKeyBytes = new uint8_t[masterKeyByteLen];
        hexStringToBytes(masterKeyStr, masterKeyBytes, masterKeyByteLen);
        size_t dataLen = masterKeyByteLen + vehicleId.length() + 8;
        uint8_t* data = new uint8_t[dataLen];
        memcpy(data, masterKeyBytes, masterKeyByteLen);
        memcpy(data + masterKeyByteLen, vehicleId.c_str(), vehicleId.length());
        memcpy(data + masterKeyByteLen + vehicleId.length(), epochBytes, 8);
        sha256(data, dataLen, hash);
        memcpy(outDailyKey, hash, DAILY_KEY_SIZE);
        delete[] masterKeyBytes;
        delete[] data;
    }

    // Genera la daily key per un nuovo giorno:
    // SHA-256( previousDailyKey || vehicleId (ASCII) || stored_epoch_in_8_byte_BE )
    // NOTA: qui si usa direttamente il valore memorizzato in "last_epoch"
    void generateDailyKeyFromPrevious(uint8_t* previousKey, uint8_t* outDailyKey) {
        // Utilizza direttamente il timestamp memorizzato, che è già stato aggiornato
        time_t nextEpoch = preferences.getULong64("last_epoch", initEpoch());
        uint8_t epochBytes[8];
        uint64ToByteArray(nextEpoch, epochBytes);
        String vehicleId = preferences.getString("vehicle_id");
        size_t vehicleIdLen = vehicleId.length();
        size_t totalLen = DAILY_KEY_SIZE + vehicleIdLen + 8;
        uint8_t* dataToHash = new uint8_t[totalLen];
        memcpy(dataToHash, previousKey, DAILY_KEY_SIZE);
        memcpy(dataToHash + DAILY_KEY_SIZE, vehicleId.c_str(), vehicleIdLen);
        memcpy(dataToHash + DAILY_KEY_SIZE + vehicleIdLen, epochBytes, 8);
        uint8_t hash[32];
        sha256(dataToHash, totalLen, hash);
        memcpy(outDailyKey, hash, DAILY_KEY_SIZE);
        delete[] dataToHash;
    }

    void uint64ToByteArray(uint64_t num, uint8_t* bytes) {
        // Big-endian
        bytes[0] = (num >> 56) & 0xFF;
        bytes[1] = (num >> 48) & 0xFF;
        bytes[2] = (num >> 40) & 0xFF;
        bytes[3] = (num >> 32) & 0xFF;
        bytes[4] = (num >> 24) & 0xFF;
        bytes[5] = (num >> 16) & 0xFF;
        bytes[6] = (num >> 8) & 0xFF;
        bytes[7] = num & 0xFF;
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
