// Initialize the map
const map = L.map('map').setView([36.7783, -119.4179], 7); // California coordinates

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Example device data
const devices = [
  { id: 'wfd-end', name: 'Device 1', coords: [36.7783, -119.4179] },
  { id: 'wfd-end', name: 'Device 2', coords: [36.9, -119.5] },
  { id: 'wfd-end', name: 'Device 3', coords: [36.6, -119.3] }
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


// Fetch and display notifications
async function fetchNotifications() {
  try {
    // Fetch the notifications from the API
    const response = await fetch('/api/get_notifications');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json(); // Directly parse the JSON response
    console.log('Fetched Data:', data); // Debugging to inspect the data

    // Get the alerts container
    const alertsContainer = document.querySelector('.alerts');
    alertsContainer.innerHTML = ''; // Clear the previous notifications

    // Check if the data is an array and render notifications
    if (Array.isArray(data) && data.length > 0) {
      data.forEach(notification => {
        const notificationElement = document.createElement('div');
        notificationElement.classList.add('notification');

        // Format time as a more human-readable string
        const notificationTime = new Date(notification.time).toLocaleString();

        // Render the notification message and time
        notificationElement.innerHTML = `
          <p><strong>Message:</strong> ${notification.message}</p>
          <p><strong>Time:</strong> ${notificationTime}</p>
        `;
        alertsContainer.appendChild(notificationElement);
      });
    } else {
      // Display fallback message if no notifications are available
      alertsContainer.innerHTML = '<p>No new notifications</p>';
    }
  } catch (error) {
    console.error('Error fetching notifications:', error.message);
  }
}


// Fetch notifications every 5 seconds
setInterval(fetchNotifications, 5000);

// Fetch notifications immediately on page load
fetchNotifications();
