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
  initializeGraph(deviceId);
});

// Function to initialize the Chart.js graph
async function initializeGraph(deviceId) {
  const ctx = document.getElementById("sensorGraph").getContext("2d");

  try {
    // Fetch data from the API
    const response = await fetch(`/api/data?device_id=wfd-end&start_time=2024-12-01T00:00:00&end_time=2024-12-02T00:00:00&interval=3600`);
    const apiData = await response.json();

    // Transform the data for Chart.js
    const labels = apiData.map(data => new Date(data.timestamp).getHours()); // Extract hours from timestamps
    const tempData = apiData.map(data => data.testTemp);
    const humidityData = apiData.map(data => data.humidity);
    const flameDigitalData = apiData.map(data => data.flameDigital);
    const gasData = apiData.map(data => data.flameAnalog);

    const data = {
      labels: labels, // Hours from API
      datasets: [
        {
          label: "Temperature (Â°C)",
          data: tempData,
          borderColor: "orange",
          fill: false,
        },
        {
          label: "Humidity (%)",
          data: humidityData,
          borderColor: "blue",
          fill: false,
        },
        {
          label: "Flame (Digital)",
          data: flameDigitalData,
          borderColor: "red",
          fill: false,
        },
        {
          label: "Gas (CO ppm)",
          data: gasData,
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
  } catch (error) {
    console.error("Error fetching data for graph:", error);
    alert("Failed to load data. Please try again later.");
  }
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
