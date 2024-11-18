document.addEventListener("DOMContentLoaded", () => {
  const mapElement = document.getElementById("map");

  // Mock device data
  const devices = [
    { id: "wfd-1", x: 36.7783, y: -119.4179 },
    { id: "wfd-2", x: 32.444, y: -118.4179 },
  ];

  devices.forEach((device) => {
    const pin = document.createElement("div");
    pin.classList.add("pin");
    pin.style.left = `${device.x}px`;
    pin.style.top = `${device.y}px`;
    pin.addEventListener("click", () => {
      window.location.href = `devicepage.html?deviceId=${device.id}&x=${device.x}&y=${device.y}`;
    });
    mapElement.appendChild(pin);
  });
});
