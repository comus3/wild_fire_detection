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

console.log('Connecting to MQTT broker at:', process.env.MQTT_BROKER_URL);
console.log('Using MQTT options:', mqttOptions);


// Connect to TTN and subscribe to your device
const client = mqtt.connect(process.env.MQTT_BROKER_URL, mqttOptions);

client.on('connect', () => {
    console.log('Connected to MQTT broker');
    client.subscribe([`v3/${process.env.USER_NAME_MQTT}/devices/+/up`], (err) => {
        if (err) {
            console.error('Subscription error:', err);
        } else {
            console.log('Subscribed to topic: wfd-end');
        }
    });
});


client.on('message', (topic, message) => {
    console.log(`Received message from ${topic}: ${message.toString()}`);
    io.emit('event-name', message.toString());
});

client.on('error', (err) => {
    console.error('Connection error:', err);
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
