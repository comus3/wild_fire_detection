document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const deviceId = urlParams.get("deviceId");
    const location = `${urlParams.get("x")}, ${urlParams.get("y")}`;
  
    // Set device info
    document.getElementById("device-id").innerText = deviceId;
    document.getElementById("location").innerText = location;
    document.getElementById("date").innerText = new Date().toLocaleString();
  
    // Fetch data from the API to display the graph and alerts
    fetchData(deviceId);
  
    // Handle "Set Up Alert" form submission
    document.getElementById("alert-setup-form").addEventListener("submit", (e) => {
      e.preventDefault();
  
      const tempMin = e.target["temp-min"].value;
      const tempMax = e.target["temp-max"].value;
      const humidityMin = e.target["humidity-min"].value;
      const humidityMax = e.target["humidity-max"].value;
      const flameMin = e.target["flame-min"].value;
      const flameMax = e.target["flame-max"].value;
      const coMin = e.target["co-min"].value;
      const coMax = e.target["co-max"].value;
  
      const payload = {
        t_min: tempMin || null,
        t_max: tempMax || null,
        h_min: humidityMin || null,
        h_max: humidityMax || null,
        f_min: flameMin || null,
        f_max: flameMax || null,
        co_min: coMin || null,
        co_max: coMax || null,
      };
  
      // Send the alert data to the API
      fetch(`http://localhost:3000/api/alerts/${deviceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then((response) => {
          if (response.ok) {
            alert("Alert settings saved successfully!");
            document.getElementById("alert-form").classList.add("hidden");
          } else {
            alert("Failed to save alert settings!");
          }
        })
        .catch((error) => {
          console.error("Error updating alerts:", error);
          alert("An error occurred while saving alert settings.");
        });
    });
  
    // Handle "Report an Issue" form submission
    document.getElementById("issue-report-form").addEventListener("submit", (e) => {
      e.preventDefault();
  
      const issueDescription = e.target["issue-description"].value;
  
      if (!issueDescription) {
        alert("Please describe the issue.");
        return;
      }
  
      // Simulating issue reporting (You can create a POST endpoint for real functionality)
      console.log("Reported issue:", {
        deviceId,
        location,
        issue: issueDescription,
      });
      alert("Issue reported successfully!");
      document.getElementById("issue-form").classList.add("hidden");
    });
  
    // Cancel buttons
    document.getElementById("cancel-alert").addEventListener("click", () => {
      document.getElementById("alert-form").classList.add("hidden");
    });
  
    document.getElementById("cancel-issue").addEventListener("click", () => {
      document.getElementById("issue-form").classList.add("hidden");
    });
  
    // Back to map
    document.getElementById("back-to-map").addEventListener("click", () => {
      window.location.href = "index.html";
    });
  });
  
  // Fetch device data to display sensor readings and graph
  function fetchData(deviceId) {
    fetch("http://localhost:3000/api/data")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch data");
        }
        return response.json();
      })
      .then((data) => {
        const deviceData = data.location[deviceId];
  
        if (deviceData) {
          console.log("Device Data:", deviceData);
          renderGraph(data.alerts[deviceId]);
        } else {
          alert("Device data not found!");
        }
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        alert("An error occurred while fetching device data.");
      });
  }
  
  // Render graph (Placeholder: Add your graph rendering logic here)
  function renderGraph(sensorData) {
    // Mockup for now - integrate graphing library for real charts
    console.log("Sensor Data for Graph:", sensorData);
    const graphDiv = document.getElementById("graph");
    graphDiv.innerHTML = `<p>Graph Data: ${JSON.stringify(sensorData)}</p>`;
  }
  