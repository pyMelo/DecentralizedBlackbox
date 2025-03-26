// mqttSubscriber.js
import mqtt from 'mqtt';
import fs from 'fs';
import dotenv from 'dotenv';
import axios from 'axios'; // For HTTP POST

dotenv.config({ path: "../.env" });

// MQTT configuration for TTN
const config = {
  broker: 'eu1.cloud.thethings.network',
  port: 8883,
  protocol: 'mqtts',
  username: "dbb25",
  password: process.env.TTN_API_KEY,
  ca: process.env.TTN_CA_PATH ? [fs.readFileSync(process.env.TTN_CA_PATH)] : undefined,
  uplinkTopic: 'v3/+/devices/+/up',
  downlinkTopic: 'v3/+/devices/+/down/queued'
};

const client = mqtt.connect(`${config.protocol}://${config.broker}`, {
  port: config.port,
  username: config.username,
  password: config.password,
  ca: config.ca,
  clientId: `mqtt-subscriber-${Math.random().toString(16).substring(2, 8)}`,
  clean: true,
});

client.on('connect', () => {
  console.log('MQTT Subscriber connected to TTN broker.');
  client.subscribe([config.uplinkTopic, config.downlinkTopic], (err) => {
    if (err) {
      console.error('Subscription error:', err);
    } else {
      console.log('Subscribed to uplink and downlink topics.');
    }
  });
});

client.on('error', (error) => {
  console.error('MQTT error:', error);
});

client.on('close', () => {
  console.log('MQTT connection closed.');
});

// Process uplink: decode the frm_payload and forward data to blockchain service
function processUplink(deviceId, payload) {
  const timestamp = payload.received_at || new Date().toISOString();
  if (payload.uplink_message && payload.uplink_message.frm_payload) {
    const base64Payload = payload.uplink_message.frm_payload;
    const decodedBuffer = Buffer.from(base64Payload, 'base64');
    const decodedHex = decodedBuffer.toString('hex');
    sendToBlockchain(decodedHex, timestamp, deviceId);
  }
}

// Process downlink (for logging only)
function processDownlink(deviceId, payload) {
  const timestamp = payload.received_at || new Date().toISOString();
  console.log(`Downlink received at ${timestamp}:`, payload);
  
}

// Forward the data to the blockchain sender service
function sendToBlockchain(decodedHex, timestamp,deviceId) {
  // Assuming the blockchain sender service is running on localhost:3001
  const url = 'http://localhost:3001/sendTx';
  const data = { payload: decodedHex, timestamp: timestamp, vehicleid : deviceId };
  axios.post(url, data)
    .then(response => {
      console.log('Blockchain TX response:', response.data);
    })
    .catch(error => {
      console.error('Error sending data to blockchain sender:', error.message);
    });
}

client.on('message', (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    const topicParts = topic.split('/');
    const deviceId = topicParts[3] || 'v-123';
    if (topic.includes('/up')) {
      processUplink(deviceId, payload);
    } else if (topic.includes('/down/queued')) {
      processDownlink(deviceId, payload);
    }
  } catch (error) {
    console.error('Error processing MQTT message:', error);
  }
});
