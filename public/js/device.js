document.addEventListener("DOMContentLoaded", () => {
  // Get query parameters from the URL
  const urlParams = new URLSearchParams(window.location.search);
  const deviceId = urlParams.get("device_id") || "Unknown Device";
  const deviceLocation = urlParams.get("location") || "Unknown Location";

  // Get current date in YYYY-MM-DD format
  const currentDate = new Date().toISOString().split("T")[0];

  // Update the DOM elements
  document.getElementById("deviceId").textContent = deviceId;
  document.getElementById("deviceLocation").textContent = deviceLocation;
  document.getElementById("deviceDate").textContent = currentDate;

  // Update Issue Form Fields
  document.getElementById("issueDeviceId").value = deviceId;
  document.getElementById("issueDeviceLocation").value = deviceLocation;

  // Initialize the graph
  initializeGraph();
});

// Function to initialize the Chart.js graph
function initializeGraph() {
  const ctx = document.getElementById("sensorGraph").getContext("2d");

  const data = {
    labels: Array.from({ length: 24 }, (_, i) => i + 1), // Hours 1 to 24
    datasets: [
      {
        label: "Temperature (°C)",
        data: [20, 22, 25, 28, 30, 35, 40, 38, 36, 34, 30, 28, 26, 25, 24, 22, 20, 18, 16, 15, 14, 14, 14, 14],
        borderColor: "orange",
        fill: false,
      },
      {
        label: "Humidity (%)",
        data: [80, 78, 75, 70, 68, 60, 50, 55, 60, 65, 70, 72, 74, 76, 78, 80, 82, 85, 90, 92, 94, 96, 98, 99],
        borderColor: "blue",
        fill: false,
      },
      {
        label: "Flame (Digital)",
        data: [0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        borderColor: "red",
        fill: false,
      },
      {
        label: "Gas (CO ppm)",
        data: [5, 6, 7, 6, 5, 4, 5, 6, 5, 4, 5, 5, 6, 6, 5, 4, 3, 3, 3, 3, 3, 2, 2, 2],
        borderColor: "purple",
        fill: false,
      },
    ],
  };

  new Chart(ctx, {
    type: "line",
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { title: { display: true, text: "Time (Hours)" } },
        y: { title: { display: true, text: "Value" } },
      },
    },
  });
}

// Function to toggle forms
function toggleForm(formId) {
  document.querySelectorAll(".form-container").forEach(form => {
    if (form.id === formId) {
      form.classList.toggle("hidden");
    } else {
      form.classList.add("hidden");
    }
  });
}