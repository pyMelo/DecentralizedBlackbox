
import mqtt from 'mqtt';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({path: "../.env"})

// Load environment variables from .env file

// Configuration
const config = {
  // TTN MQTT broker settings
  broker: 'eu1.cloud.thethings.network',
  port: parseInt( '8883', 10),
  protocol: 'mqtts',
  
  // TTN application credentials
  username: "dbb25",
  password: process.env.TTN_API_KEY,  
  // Optional TLS/SSL settings
  ca: process.env.TTN_CA_PATH ? [fs.readFileSync(process.env.TTN_CA_PATH)] : undefined,
  
  // Topic to subscribe (using wildcards to receive all device messages)
  topic: 'v3/+/devices/+/up',
  
  // Local data handling
  dataDir: process.env.DATA_DIR || './data',
};

// Create data directory if it doesn't exist
if (!fs.existsSync(config.dataDir)) {
  fs.mkdirSync(config.dataDir, { recursive: true });
}

// Connect to TTN MQTT broker
console.log(`Connecting to TTN MQTT broker at ${config.broker}...`);

const client = mqtt.connect(`${config.protocol}://${config.broker}`, {
  port: config.port,
  username: config.username,
  password: config.password,
  ca: config.ca,
  clientId: `ttn-client-${Math.random().toString(16).substring(2, 8)}`,
  clean: true,
});

// Handle connection events
client.on('connect', () => {
  console.log('Connected to TTN MQTT broker');
  
  // Subscribe to uplink messages
  client.subscribe(config.topic, (err) => {
    if (err) {
      console.error(`Failed to subscribe to ${config.topic}:`, err);
      return;
    }
    console.log(`Subscribed to ${config.topic}`);
  });
});

client.on('error', (error) => {
  console.error('MQTT connection error:', error);
});

client.on('reconnect', () => {
  console.log('Attempting to reconnect to TTN MQTT broker...');
});

client.on('close', () => {
  console.log('Connection to TTN MQTT broker closed');
});

// Handle incoming messages
client.on('message', (topic, message) => {
  try {
    // Parse the message as JSON
    const payload = JSON.parse(message.toString());
    
    // Extract device ID from the topic
    // Topic format: v3/{application-id}/devices/{device-id}/up
    const topicParts = topic.split('/');
    const deviceId = topicParts[3] || 'unknown-device';
    
    console.log(`Received message from device ${deviceId}`);
    
    // Process the payload
    processPayload(deviceId, payload);
  } catch (error) {
    console.error('Error processing message:', error);
  }
});

// Process and store the payload
function processPayload(deviceId, payload) {
  // Extract key information
  const timestamp = payload.received_at || new Date().toISOString();
  const deviceData = {
    timestamp,
    deviceId,
    port: payload.uplink_message?.f_port,
    counter: payload.uplink_message?.f_cnt,
    data: payload.uplink_message?.decoded_payload || payload.uplink_message?.frm_payload,
    metadata: {
      frequency: payload.uplink_message?.settings?.frequency,
      data_rate: payload.uplink_message?.settings?.data_rate,
      coding_rate: payload.uplink_message?.settings?.coding_rate,
      gateways: payload.uplink_message?.rx_metadata?.map(gw => ({
        id: gw.gateway_ids?.gateway_id,
        rssi: gw.rssi,
        snr: gw.snr,
        channel: gw.channel,
      })),
    }
  };
  
  // Log the processed data
  console.log('Processed data:', JSON.stringify(deviceData, null, 2));
  
  // Store the data (example: to JSON file)
  const filename = `${config.dataDir}/${deviceId}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  fs.writeFile(filename, JSON.stringify(deviceData, null, 2), (err) => {
    if (err) {
      console.error(`Failed to write data for device ${deviceId}:`, err);
    } else {
      console.log(`Data for device ${deviceId} stored in ${filename}`);
    }
  });
  
  // Additional processing can be added here:
  // - Send to database
  // - Forward to another service
  // - Trigger alerts based on data values
  // - etc.
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Closing MQTT connection...');
  client.end(true, () => {
    console.log('MQTT connection closed');
    process.exit(0);
  });
});

// Start the broker
console.log('TTN MQTT broker client started');