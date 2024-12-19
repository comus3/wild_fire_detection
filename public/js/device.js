let fetchIntervalId;
let counter = 0; // Counter to keep track of elapsed time for adjusting start_time and end_time

document.addEventListener("DOMContentLoaded", initializePage);

// Initialize the page on load
function initializePage() {
  const { deviceId, deviceLocation } = getQueryParams();
  const currentDate = getCurrentDate();

  // Update DOM elements with device information
  updateDeviceInfo({ deviceId, deviceLocation, currentDate });

  // Pre-fill Issue Form Fields
  updateIssueFormFields({ deviceId, deviceLocation });

  console.log("Page initialized with Device ID:", deviceId, "and Location:", deviceLocation);
}

// Extract query parameters from the URL
function getQueryParams() {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    deviceId: urlParams.get("device_id") || "wfd-end",
    deviceLocation: urlParams.get("location") || "wfd-end",
  };
}

// Get current date in YYYY-MM-DD format
function getCurrentDate() {
  return new Date().toISOString().split("T")[0];
}

// Update device information on the page
function updateDeviceInfo({ deviceId, deviceLocation, currentDate }) {
  document.getElementById("deviceId").textContent = deviceId;
  document.getElementById("deviceLocation").textContent = deviceLocation;
  document.getElementById("deviceDate").textContent = currentDate;
}

// Pre-fill the issue reporting form
function updateIssueFormFields({ deviceId, deviceLocation }) {
  document.getElementById("issueDeviceId").value = deviceId;
  document.getElementById("issueDeviceLocation").value = deviceLocation;
}

// Apply user settings and set up periodic data fetching
async function applySettings() {
  // Clear any existing data-fetching interval
  if (fetchIntervalId) clearInterval(fetchIntervalId);

  // Get user input values
  const startTime = calculateRelativeStartTime(
    document.getElementById("startTime").value
  );
  const endTime = new Date().toISOString(); // Current time
  const interval = document.getElementById("interval").value;
  const fetchFrequency = document.getElementById("fetchFrequency").value;
  const deviceId = new URLSearchParams(window.location.search).get("device_id");

  // Validate user input
  if (!startTime || !endTime || !interval || !fetchFrequency) {
    alert("Please fill in all fields.");
    return;
  }

  console.log("Settings applied with:", { startTime, endTime, interval, fetchFrequency });

  // Initialize the graph with initial settings
  await initializeGraph(deviceId, startTime, endTime, interval);

  // Set up periodic data fetching based on user-defined fetch frequency
  fetchIntervalId = setInterval(async () => {
    // Increment counter every interval
    counter++;

    // Adjust the start_time and end_time by the counter
    const adjustedStartTime = new Date(new Date(startTime).getTime() + counter * 1000 * interval).toISOString();
    const adjustedEndTime = new Date(new Date(endTime).getTime() + counter * 1000 * interval).toISOString();

    console.log("Fetching data with adjusted times:", { adjustedStartTime, adjustedEndTime });

    // Fetch new graph data with adjusted times
    await initializeGraph(deviceId, adjustedStartTime, adjustedEndTime, interval);
  }, fetchFrequency * 1000);
}

// Calculate start time based on user input
function calculateRelativeStartTime(hoursAgo) {
  const now = new Date();
  now.setHours(now.getHours() - hoursAgo);
  return now.toISOString(); // ISO formatted start time
}

// Initialize and update the Chart.js graph
async function initializeGraph(deviceId, startTime, endTime, interval) {
  const ctx = document.getElementById("sensorGraph").getContext("2d");

  try {
    // Construct API URI with dynamic parameters
    const apiUri = `/api/data?device_id=wfd-end&start_time=${startTime}&end_time=${endTime}&interval=${interval}`;
    console.log("Fetching data from API:", apiUri);

    const apiData = await fetchData(apiUri);

    if (!apiData || apiData.length === 0) {
      console.warn("No data received from API.");
      alert("No data available for the selected parameters.");
      return;
    }

    // Transform the API response for Chart.js
    const chartData = prepareChartData(apiData);

    // Render the updated chart
    renderChart(ctx, chartData);
  } catch (error) {
    console.error("Error fetching data for graph:", error);
    alert("Failed to load data. Please check your input or try again later.");
  }
}

// Fetch data from the API
async function fetchData(apiUri) {
  const response = await fetch(apiUri);
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText} (HTTP ${response.status})`);
  }
  return response.json();
}

// Prepare data for the Chart.js graph
function prepareChartData(apiData) {
  return {
    labels: apiData.map(data => new Date(data.timestamp).toLocaleTimeString()), // Format timestamps
    datasets: [
      {
        label: "Temperature (°C)",
        data: apiData.map(data => data.temperature || 0), // Add fallback for undefined values
        borderColor: "orange",
        fill: false,
      },
      {
        label: "Humidity (%)",
        data: apiData.map(data => data.humidity || 0),
        borderColor: "blue",
        fill: false,
      },
      {
        label: "Flame probability",
        data: apiData.map(data => data.flameProbability || 0),
        borderColor: "red",
        fill: false,
      },
      {
        label: "Gas (CO ppm)",
        data: apiData.map(data => data.mq2Value || 0),
        borderColor: "purple",
        fill: false,
      },
    ],
  };
}

// Render the Chart.js graph
function renderChart(ctx, chartData) {
  if (window.sensorChart) {
    window.sensorChart.destroy(); // Destroy any existing chart to avoid conflicts
  }
  window.sensorChart = new Chart(ctx, {
    type: "line",
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { title: { display: true, text: "Time" } },
        y: { title: { display: true, text: "Value" } },
      },
    },
  });
}

// Toggle the visibility of forms
function toggleForm(formId) {
  document.querySelectorAll(".form-container").forEach(form => {
    if (form.id === formId) {
      form.classList.toggle("hidden");
    } else {
      form.classList.add("hidden");
    }
  });
}
