require('dotenv').config();

const express = require('express');
const mqtt = require('mqtt');
const path = require('path');
const fs = require('fs');
const axios = require('axios');  // To make HTTP requests to the Flask API

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON body
app.use(express.json());

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, '..', 'public'))); // Adjusted the path to go one level up

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
            console.log('Subscribed to topic: v3/{username}/devices/+/up');
        }
    });
});

client.on('message', (topic, message) => {
    console.log(`Received message from ${topic}: ${message.toString()}`);
    
    // Parse the message payload
    const payload = JSON.parse(message.toString());

    // Extract the relevant fields from the payload
    const device_id = payload.end_device_ids.device_id; // "wfd-end"
    const timestamp = payload.received_at; // "2024-12-02T09:50:08.103765172Z"
    const decoded_payload = payload.uplink_message.decoded_payload; // { flameAnalog: 130, flameAnalogTest2: 1.331, flameDigital: 0, humidity: 100 }

    // Format the data for the database
    const dbData = {
        device_id: device_id,
        timestamp: timestamp,
        ...decoded_payload // Spread the decoded_payload fields into the object
    };

    console.log('Formatted payload for DB:', dbData);

    // Now send the formatted data to the Flask API endpoint to store it in the DB
    fetch('http://localhost:5000/data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(dbData),
    })
    .then(response => response.json())
    .then(data => console.log('Data sent to Flask:', data))
    .catch(error => console.error('Error sending data to Flask:', error));

    // Emit the data to connected clients via Socket.IO
    io.emit('event-name', dbData);
});


client.on('error', (err) => {
    console.error('Connection error:', err);
});

// Routes
app.get('/api/data', async (req, res) => {
    try {
        // Call the Flask app's /data GET endpoint
        const flaskApiUrl = 'http://localhost:5000/data';
        const response = await axios.get(flaskApiUrl, {
            params: req.query // Forward query parameters to Flask app
        });

        res.json(response.data);  // Send the data from Flask API to the client
    } catch (err) {
        console.error('Error fetching data from Flask API:', err.message);
        res.status(500).json({ error: 'Failed to fetch data from Flask API' });
    }
});

// Forward GET requests to Flask /locations endpoint
app.get('/api/locations', async (req, res) => {
    try {
        const flaskApiUrl = 'http://localhost:5000/locations';
        const response = await axios.get(flaskApiUrl);
        res.json(response.data);  // Send the locations data from Flask API to the client
    } catch (err) {
        console.error('Error fetching locations from Flask API:', err.message);
        res.status(500).json({ error: 'Failed to fetch locations from Flask API' });
    }
});


// Forward GET requests to Flask /getalerts/:device_id endpoint
app.get('/api/getalerts/:device_id', async (req, res) => {
    try {
        const deviceId = req.params.device_id;
        const flaskApiUrl = `http://localhost:5000/getalerts/${deviceId}`;
        const response = await axios.get(flaskApiUrl);
        res.json(response.data);  // Send the alerts data from Flask API to the client
    } catch (err) {
        console.error('Error fetching alerts from Flask API:', err.message);
        res.status(500).json({ error: 'Failed to fetch alerts from Flask API' });
    }
});


// Forward GET requests to Flask /get_notifications endpoint
app.get('/api/get_notifications', async (req, res) => {
    try {
        const flaskApiUrl = 'http://localhost:5000/get_notifications';
        const response = await axios.get(flaskApiUrl);
        res.json(response.data);  // Send the notifications data from Flask API to the client
    } catch (err) {
        console.error('Error fetching notifications from Flask API:', err.message);
        res.status(500).json({ error: 'Failed to fetch notifications from Flask API' });
    }
});

// Forward POST requests to Flask /modify_alerts/:device_id endpoint
app.post('/api/modify_alerts/:device_id', async (req, res) => {
    try {
        const deviceId = req.params.device_id;
        const flaskApiUrl = `http://localhost:5000/modify_alerts/${deviceId}`;
        const response = await axios.post(flaskApiUrl, req.body);  // Forward the body content
        res.json(response.data);  // Send the modified alerts data from Flask API to the client
    } catch (err) {
        console.error('Error modifying alerts in Flask API:', err.message);
        res.status(500).json({ error: 'Failed to modify alerts in Flask API' });
    }
});




// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
