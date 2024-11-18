require('dotenv').config();

const express = require('express');
const mqtt = require('mqtt');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON body
app.use(express.json());

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

// Utility function to read and write the db.json file
const readDB = () => {
    const data = fs.readFileSync(path.join(__dirname, 'db.json'), 'utf-8');
    return JSON.parse(data);
};

const writeDB = (data) => {
    fs.writeFileSync(path.join(__dirname, 'db.json'), JSON.stringify(data, null, 2));
};

// Routes
// Get data for locations, alerts, and notifications
app.get('/api/data', (req, res) => {
    try {
        const db = readDB();
        res.json({
            location: db.location,
            alerts: db.alerts,
            notifications: db.notifications,
        });
    } catch (err) {
        console.error('Error reading database:', err.message); // Log the error
        res.status(500).json({ error: 'Failed to read database' });
    }
});


app.put('/api/alerts/:deviceId', (req, res) => {
    const { deviceId } = req.params;
    const updates = req.body;

    console.log('Received update request for device:', deviceId);
    console.log('Request body:', updates);

    try {
        const db = readDB();

        if (!db.alerts[deviceId]) {
            console.error('Device not found:', deviceId);
            return res.status(404).json({ error: 'Device not found' });
        }

        // Update the alerts
        db.alerts[deviceId] = { ...db.alerts[deviceId], ...updates };
        console.log('Updated alerts for device:', db.alerts[deviceId]);

        writeDB(db);
        console.log('Database successfully updated');

        res.json({ message: 'Alerts updated successfully', alerts: db.alerts[deviceId] });
    } catch (err) {
        console.error('Error updating alerts:', err.message);
        res.status(500).json({ error: 'Failed to update alerts' });
    }
});


// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
