import dotenv from 'dotenv';

dotenv.config({path: '../.env'});

const TTN_APP_ID = "dbb25";  // Application ID da TTN
const TTN_DEVICE_ID = "27feb-device";  // Device ID da TTN
const TTN_API_KEY = process.env.TTN_API_KEY
console.log(process.env.TTN_API_KEY);
const TTN_URL = `https://eu1.cloud.thethings.network/api/v3/as/applications/${TTN_APP_ID}/devices/${TTN_DEVICE_ID}/packages/storage/uplink_message`;


async function fetchTTNData() {
    try {
        const response = await fetch(TTN_URL, {
            method: "GET",
            headers: {
                "Authorization": TTN_API_KEY,
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`❌ Errore HTTP: ${response.status}`);
        }

        // ✅ Usa .text() invece di .json() per evitare errori di parsing
        const responseText = await response.text();

        console.log("📡 Raw Response:", responseText);

        // ✅ Divide i JSON multipli
        const jsonStrings = responseText.trim().split("\n");  // Divide i JSON per riga

        // ✅ Parsea ogni JSON separatamente
        jsonStrings.forEach((jsonString, index) => {
            try {
                const data = JSON.parse(jsonString);

                // Controlla se ci sono dati uplink validi
                if (!data.result || !data.result.uplink_message) {
                    console.log(`⚠️ [Messaggio ${index + 1}] Nessun dato uplink trovato.`);
                    return;
                }

                // ✅ Estrai il timestamp
                const timestamp = data.result.received_at;

                // ✅ Estrai e decodifica il payload Base64 → Hex
                const base64Payload = data.result.uplink_message.frm_payload;
                const hexPayload = Buffer.from(base64Payload, "base64").toString("hex").toUpperCase();

                // ✅ Stampa solo timestamp + payload in esadecimale
                console.log(`📡 [Messaggio ${index + 1}]`);
                console.log("⏳ Timestamp:", timestamp);
                console.log("📥 Payload (Hex):", hexPayload);

            } catch (parseError) {
                console.error(`❌ Errore nel parsing del messaggio ${index + 1}:`, parseError);
            }
        });

    } catch (error) {
        console.error("❌ Errore durante il recupero dati da TTN:", error);
    }
}

// Esegui il test
fetchTTNData();
