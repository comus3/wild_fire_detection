// Initialize the map
const map = L.map('map').setView([36.7783, -119.4179], 7); // California coordinates

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Example device data
const devices = [
  { id: 1, name: 'Device 1', coords: [36.7783, -119.4179] },
  { id: 2, name: 'Device 2', coords: [36.9, -119.5] },
  { id: 3, name: 'Device 3', coords: [36.6, -119.3] }
];

// Add markers to the map
devices.forEach(device => {
  const marker = L.marker(device.coords).addTo(map);
  marker.bindPopup(`<b>${device.name}</b><br><a href="devicepage.html?deviceId=${device.id}">View Details</a>`);
  marker.on('click', () => {
    window.location.href = `devicepage.html?deviceId=${device.id}`;
  });
});

// Handle urgency alert button click
function sendUrgencyAlert() {
  alert('Urgency alert sent to all devices!');
}