from flask import Flask, request, jsonify
import json
import os
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.background import BackgroundScheduler

app = Flask(__name__)

# File paths
DB_INFO_PATH = 'ressources/db_info.json'
DATA_PATH = 'ressources/data.json'

with open(DB_INFO_PATH) as f:
    db_info = json.load(f)

def run_retention_task():
    """
    Task to enforce data retention policy.
    """
    retention_period = 30  # Retention period in days
    all_data = read_data()
    print(f"Running retention task. Data contains {len(all_data)} data points.")
    filtered_data = enforce_retention(all_data, retention_period)
    write_data(filtered_data)
    print(f"Retention task executed. Data older than {retention_period} days removed.")


def enforce_retention(data, retention_period):
    """
    Removes data older than the retention period.

    Args:
        data (list): List of data points (must contain 'timestamp').
        retention_period (int): Retention period in days.

    Returns:
        list: Filtered list of data points within the retention period.
    """
    cutoff_time = datetime.utcnow() - timedelta(days=retention_period)
    return [d for d in data if datetime.fromisoformat(d['timestamp']) > cutoff_time]


# Load configurations
def load_db_info():
    with open(DB_INFO_PATH, 'r') as f:
        return json.load(f)
    
def write_db_info(data):
    with open(DB_INFO_PATH, 'w') as f:
        json.dump(data, f, indent=4)

def read_data():
    if not os.path.exists(DATA_PATH):
        return []
    with open(DATA_PATH, 'r') as f:
        return json.load(f)

def write_data(data):
    with open(DATA_PATH, 'w') as f:
        json.dump(data, f, indent=4)


def interpolate_data(device_data, start_time, end_time, interval):
    """
    Interpolates data for the given device within the specified time range and interval.

    Args:
        device_data (list): List of raw data points (must contain 'timestamp').
        start_time (datetime): Start time for interpolation.
        end_time (datetime): End time for interpolation.
        interval (int): Time interval in seconds for interpolation.

    Returns:
        list: Interpolated data points with timestamps and interpolated values.
    """
    # Ensure all timestamps are naive (remove timezone information if present)
    device_data = [
        {**d, "timestamp": datetime.fromisoformat(d["timestamp"]).replace(tzinfo=None)}  # Remove timezone info
        for d in device_data
    ]

    # Ensure start_time and end_time are naive (remove timezone information if present)
    start_time = start_time.replace(tzinfo=None)
    end_time = end_time.replace(tzinfo=None)

    # Sort device_data by timestamp
    device_data.sort(key=lambda x: x["timestamp"])

    # Create list of all target timestamps
    target_timestamps = [
        start_time + timedelta(seconds=i)
        for i in range(0, int((end_time - start_time).total_seconds()) + 1, interval)
    ]

    interpolated = []
    current_index = 0

    for target_time in target_timestamps:
        # Find two closest raw data points (before and after target_time)
        while current_index < len(device_data) - 1 and device_data[current_index + 1]["timestamp"] <= target_time:
            current_index += 1

        if current_index == len(device_data) - 1:
            # We've reached the last data point, no more interpolation possible
            break

        point_before = device_data[current_index]
        point_after = device_data[current_index + 1]

        # Check if target_time falls between the two points
        t_before = point_before["timestamp"]
        t_after = point_after["timestamp"]

        if t_before <= target_time <= t_after:
            # Perform linear interpolation for numeric fields
            interpolated_point = {"timestamp": target_time.isoformat()}
            for key in point_before:
                if key == "timestamp" or key == "device_id":
                    continue
                v_before = point_before[key]
                v_after = point_after[key]
                if isinstance(v_before, (int, float)) and isinstance(v_after, (int, float)):
                    # Linear interpolation formula
                    fraction = (target_time - t_before).total_seconds() / (t_after - t_before).total_seconds()
                    interpolated_point[key] = v_before + fraction * (v_after - v_before)
                else:
                    # Non-numeric fields: fallback to value of point_before
                    interpolated_point[key] = v_before
            interpolated.append(interpolated_point)

    return interpolated

@app.route('/help', methods=['GET'])
def help():
    """API help."""
    return jsonify({
        "endpoints": {
            "/data": {
                "POST": {
                    "description": "Add new data point.",
                    "parameters": {
                        "device_id": "Device ID",
                        "timestamp": "Timestamp (ISO format)",
                        "value": "Value"
                    }
                },
                "GET": {
                    "description": "Query data with optional interpolation.",
                    "parameters": {
                        "device_id": "Device ID",
                        "start_time": "Start time (ISO format)",
                        "end_time": "End time (ISO format)",
                        "interval": "Interpolation interval in seconds (default: 1)"
                    }
                }
            }
        }
    })

# Route to get the location information
@app.route('/locations', methods=['GET'])
def get_locations():
    return jsonify(db_info['location'])

# Route to get alerts for a specific device id
@app.route('/getalerts/<device_id>', methods=['GET'])
def get_alerts(device_id):
    alerts = db_info['alerts'].get(device_id)
    if alerts:
        return jsonify(alerts)
    else:
        return jsonify({"error": "Device ID not found"}), 404

# Route to get all notifications
@app.route('/get_notifications', methods=['GET'])
def get_notifications():
    return jsonify(db_info['notifications'])

# Route to modify the alerts for a device
@app.route('/modify_alerts/<device_id>', methods=['POST'])
def modify_alerts(device_id):
    if device_id in db_info['alerts']:
        data = request.get_json()
        db_info['alerts'][device_id].update(data)
        return jsonify({"message": "Alerts updated successfully", "alerts": db_info['alerts'][device_id]})
    else:
        return jsonify({"error": "Device ID not found"}), 404

def increment_counter(counter, device_id, json_data):
    print(f"Incrementing counter '{counter}' for device...")  # Debug
    alerts = json_data.get("alerts", {})
    print(f"Alerts: {alerts}")  # Debug: Show the entire alerts section

    #device_id = json_data.get(device_id)
    print(f"Device ID: {device_id}")  # Debug: Show the device ID

    if device_id in alerts:
        device_alert = alerts[device_id]
        print(f"Found alerts for device '{device_id}': {device_alert}")  # Debug: Show the device's alert data
        if counter in device_alert:
            print(f"Before incrementing, {counter}: {device_alert[counter]}")  # Debug: Show the counter value before increment
            device_alert[counter] += 1
            print(f"{counter} incremented to: {device_alert[counter]}")  # Debug: Show the new counter value after increment
        else:
            print(f"Error: '{counter}' key not found in '{device_alert}' alert")
    else:
        print(f"Error: '{device_id}' not found in alerts")

    return write_db_info(json_data)

def reset_counter(counter, json_data):
    alerts = json_data.get("alerts", {})
    device_id = json_data.get("device_id", "")
    if device_id in alerts:
        device_alert = alerts[device_id]
        if counter in device_alert:
            device_alert[counter] = 0
            print(f"{counter} reset to: {device_alert[counter]}")
        else:
            print(f"Error: '{counter}' key not found in '{device_id}' alert")
    else:
        print(f"Error: '{device_id}' not found in alerts")

    return json_data

def add_notification(device_id, message):
    notification = {
        "id": device_id,
        "message": message,
        "time": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    }
    db_info = load_db_info()
    db_info["notifications"].append(notification)
    write_db_info(db_info)  # Write the updated data back to the file

def check_alertes(data):
    # Load the alerts data from the JSON
    print("Loading data from JSON...")
    db_info = load_db_info()
    print(f"Loaded db_info: {db_info}")  # Debug: print the entire db_info

    # Access the specific alert for the device from the loaded data
    try:
        mins_maxs = db_info["alerts"][data["device_id"]]
        print(f"mins_maxs for device {data['device_id']}: {mins_maxs}")  # Debug: check mins_maxs
    except KeyError as e:
        print(f"Error: Key not found - {e}")
        return  # Exit if the device_id does not exist in alerts

    # Copy the payload data
    payload = data.copy()
    print(f"Payload: {payload}")  # Debug: print the payload to check its contents
    device_id = payload["device_id"]

    # Check if the temperature exceeds the max allowed
    print(f"Checking if temperature {payload['temperature']} exceeds t_max {mins_maxs['t_max']}")  # Debug
    if payload["temperature"] > mins_maxs["t_max"]:
        print(f"Temperature {payload['temperature']} exceeds t_max {mins_maxs['t_max']}")  # Debug
        increment_counter("counter_tmax",device_id, db_info)
    else:
        print(f"Temperature {payload['temperature']} is within the allowed range.")  # Debug

    # Check if the humidity is below the min allowed
    print(f"Checking if humidity {payload['humidity']} is below h_min {mins_maxs['h_min']}")  # Debug
    if payload["humidity"] < mins_maxs["h_min"]:
        print(f"Humidity {payload['humidity']} is below h_min {mins_maxs['h_min']}")  # Debug
        increment_counter("counter_hmin",device_id, db_info)
    else:
        print(f"Humidity {payload['humidity']} is within the allowed range.")  # Debug

    # Check if the gas concentration exceeds the max allowed
    print(f"Checking if gas_concentration {payload['gas_concentration']} exceeds gas_max {mins_maxs['gas_max']}")  # Debug
    if payload["gas_concentration"] > mins_maxs["gas_max"]:
        print(f"Gas concentration {payload['gas_concentration']} exceeds gas_max {mins_maxs['gas_max']}")  # Debug
        increment_counter("counter_gas", device_id, db_info)
    else:
        print(f"Gas concentration {payload['gas_concentration']} is within the allowed range.")  # Debug

    # Check if the infrared data exceeds the max allowed
    print(f"Checking if ir_data {payload['ir_data']} exceeds ir_max {mins_maxs['ir_max']}")  # Debug
    if payload["ir_data"] > mins_maxs["ir_max"]:
        print(f"IR data {payload['ir_data']} exceeds ir_max {mins_maxs['ir_max']}")  # Debug
        increment_counter("counter_ir", device_id, db_info)
    else:
        print(f"IR data {payload['ir_data']} is within the allowed range.")  # Debug

    # Check if the temperature is within a "reset" range, and reset counter if necessary
    print(f"Checking if temperature {payload['temperature']} is below threshold {mins_maxs['t_max'] - 3}")  # Debug
    if (payload["temperature"] < (mins_maxs["t_max"] - 3)) and (mins_maxs["counter_tmax"] > 0):  # -3 for double threshold
        print(f"Temperature {payload['temperature']} is below threshold, resetting counter_tmax.")  # Debug
        reset_counter("counter_tmax", db_info)
    else:
        print(f"Temperature {payload['temperature']} is not below the reset threshold.")  # Debug

    # Check if the humidity is within a "reset" range, and reset counter if necessary
    print(f"Checking if humidity {payload['humidity']} is above threshold {mins_maxs['h_min'] + 3}")  # Debug
    if (payload["humidity"] > (mins_maxs["h_min"] + 3)) and (mins_maxs["counter_hmin"] > 0):  # +3 for double threshold
        print(f"Humidity {payload['humidity']} is above threshold, resetting counter_hmin.")  # Debug
        reset_counter("counter_hmin", db_info)
    else:
        print(f"Humidity {payload['humidity']} is not above the reset threshold.")  # Debug

    # Check if the gas concentration is within a "reset" range, and reset counter if necessary
    print(f"Checking if gas_concentration {payload['gas_concentration']} is below threshold {mins_maxs['gas_max'] - 3}")  # Debug
    if (payload["gas_concentration"] < (mins_maxs["gas_max"] - 30)) and (mins_maxs["counter_gas"] > 0):  # -3 for double threshold
        print(f"Gas concentration {payload['gas_concentration']} is below threshold, resetting counter_gas.")  # Debug
        reset_counter("counter_gas", db_info)
    else:
        print(f"Gas concentration {payload['gas_concentration']} is not below the reset threshold.")  # Debug

    # Check if the infrared data is within a "reset" range, and reset counter if necessary
    print(f"Checking if ir_data {payload['ir_data']} is below threshold {mins_maxs['ir_max'] - 3}")  # Debug
    if (payload["ir_data"] < (mins_maxs["ir_max"] - 30)) and (mins_maxs["counter_ir"] > 0):  # -3 for double threshold
        print(f"IR data {payload['ir_data']} is below threshold, resetting counter_ir.")  # Debug
        reset_counter("counter_ir", db_info)
    else:
        print(f"IR data {payload['ir_data']} is not below the reset threshold.")  # Debug

    # Add a notification if necessary
    if mins_maxs["counter_hmin"] == 3:
        print("Humidity is dangerously low. Adding notification...")  # Debug
        add_notification(data["device_id"], "Humidity is dangerously low")
    if mins_maxs["counter_tmax"] == 3:
        print("Temperature is dangerously high. Adding notification...")  # Debug
        add_notification(data["device_id"], "Temperature is dangerously high")
    if mins_maxs["counter_gas"] == 3:
        print("Gas concentration is dangerously high. Adding notification...")  # Debug
        add_notification(data["device_id"], "Gas concentration is dangerously high")
    if mins_maxs["counter_ir"] == 3:
        print("IR data is dangerously high. Adding notification...")  # Debug
        add_notification(data["device_id"], "IR data is dangerously high")




@app.route('/data', methods=['POST'])
def add_data():
    """Add new data point."""
    data = request.json
    all_data = read_data()
    all_data.append(data)
    write_data(all_data)
    print(f"Data added: {data}")
    check_alertes(data)
    return jsonify({"message": "Data added successfully"}), 201

@app.route('/data', methods=['GET'])
def get_data():
    """Query data with optional interpolation."""
    device_id = request.args.get('device_id')
    start_time = request.args.get('start_time')
    end_time = request.args.get('end_time')
    interval = request.args.get('interval', 1)  # Default interval: 1 second

    # Parse times
    start_time = datetime.fromisoformat(start_time)
    end_time = datetime.fromisoformat(end_time)

    # Load and filter data
    all_data = read_data()
    device_data = [d for d in all_data if d['device_id'] == device_id]

    # Interpolate data
    interpolated = interpolate_data(device_data, start_time, end_time, int(interval))
    return jsonify(interpolated)

# Scheduler setup
scheduler = BackgroundScheduler()
scheduler.add_job(run_retention_task, 'interval', hours=12)  # Run every 12 hours
scheduler.start()


if __name__ == '__main__':
    app.run(debug=True)
