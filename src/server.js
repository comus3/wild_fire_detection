require('dotenv').config();

const express = require('express');
const mqtt = require('mqtt'); // Example for MQTT connection
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Set up express with socket.io
const server = require("http").Server(app);
const io = require("socket.io")(server);

// Access your MQTT configuration from environment variables
const mqttOptions = {
    clientId: process.env.USER_NAME_MQTT,
    username: process.env.USER_NAME_MQTT,
    password: process.env.API_KEY_MQTT,
};

// Connect to TTN and subscribe to your device
const client = mqtt.connect(process.env.MQTT_BROKER_URL, mqttOptions);

client.on('connect', () => {
    client.subscribe('your-sde');
});

// When TTN sends a message, notify the client via socket.io
client.on('message', (topic, message) => {
    io.emit('event-name', message.toString()); // Convert message to string if needed
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
