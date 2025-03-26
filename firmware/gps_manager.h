// gps_monitor.h - Gestione RAW NMEA e fix GPS con blocco dopo fix
#ifndef GPS_MONITOR_H
#define GPS_MONITOR_H

#include <TinyGPS++.h>
#include <HardwareSerial.h>
#include <TimeLib.h>


class GPSMonitor {
public:
    GPSMonitor(HardwareSerial& serial) : gpsSerial(serial) {}

    void begin(int baudRate, int rxPin, int txPin) {
        gpsSerial.begin(baudRate, SERIAL_8N1, rxPin, txPin);
        Serial.println("✅ GPS Serial initialized");
    }

    void update() {
        if (fixAcquired) return;  // ❌ Se abbiamo fixato, non serve più leggere
        while (gpsSerial.available()) {
            char c = gpsSerial.read();
            gps.encode(c);
            rawNMEA += c;
        }
    }

    // Stampa i RAW ogni 'interval' solo se non abbiamo ancora il fix
    void printNMEAEvery(unsigned long interval) {
        if (fixAcquired) return;  // ❌ Stop RAW dopo il fix
        if (millis() - lastNMEAPrint > interval) {
            if (!rawNMEA.isEmpty()) {
                Serial.println("\n🔎 NMEA RAW:");
                Serial.print(rawNMEA);
                rawNMEA = "";
            } else {
                Serial.println("❌ Nessun dato NMEA negli ultimi secondi");
            }
            lastNMEAPrint = millis();
        }
    }

    // Controlla se ha fixato la posizione GPS
    void monitorGPS() {
        if (fixAcquired) return;  // ❌ Stop dopo il fix

        if (gps.location.isValid()) {
            Serial.println("✅ FIX GPS ACQUISITO");
            Serial.print("📍 Latitudine: "); Serial.println(gps.location.lat(), 6);
            Serial.print("📍 Longitudine: "); Serial.println(gps.location.lng(), 6);
            fixAcquired = true;
        }
    }

    bool isFixAcquired() const {
        return fixAcquired;
    }

    TinyGPSPlus& getGPS() {
        return gps;
    }

time_t getGPSEpoch() {
    if (getGPS().time.isValid() && getGPS().date.isValid()) {
        int year = getGPS().date.year();
        if (year < 2020) {
            return 0; // Data non valida
        }

        tmElements_t tm;
        tm.Year = year - 1970;
        tm.Month = getGPS().date.month();
        tm.Day = getGPS().date.day();
        tm.Hour = getGPS().time.hour();
        tm.Minute = getGPS().time.minute();
        tm.Second = getGPS().time.second();

        return makeTime(tm);
    }
    return 0;
  }


private:
    TinyGPSPlus gps;
    HardwareSerial& gpsSerial;
    String rawNMEA = "";
    unsigned long lastNMEAPrint = 0;
    bool fixAcquired = false;
};

#endif
