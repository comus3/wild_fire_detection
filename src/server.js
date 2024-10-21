require('dotenv').config();

const express = require('express');
const mqtt = require('mqtt'); // Example for MQTT connection
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Access your MQTT configuration from environment variables
const mqttOptions = {
    clientId: process.env.USER_NAME_MQTT,
    username: process.env.USER_NAME_MQTT,
    password: process.env.API_KEY_MQTT,
};

const client = mqtt.connect(process.env.PUBLIC_TLS_ADDRESS_MQTT, mqttOptions);

// Example route
app.get('/api', (req, res) => {
    res.json({ message: 'Hello from the server!', mqttAddress: process.env.PUBLIC_ADDRESS_MQTT });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
