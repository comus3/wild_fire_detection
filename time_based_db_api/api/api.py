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

def increment_counter(counter, json_data):
    alerts = json_data.get("alerts", {})
    
    device_id = json_data.get("device_id", "")
    if device_id in alerts:
        device_alert = alerts[device_id]
        
        if counter in device_alert:
            device_alert[counter] += 1
            print(f"{counter} incremented to: {device_alert[counter]}")
        else:
            print(f"Error: '{counter}' key not found in '{device_id}' alert")
    else:
        print(f"Error: '{device_id}' not found in alerts")

    return json_data

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
    mins_maxs = load_db_info()["alerts"][data["device_id"]]
    payload = data.copy


    # Vérifier si les données récupérées sont au delà des normes admises, si c'est le cas on incrémente un compteur
    if payload["temperature"] > mins_maxs["t_max"]:
        increment_counter("counter_tmax", load_db_info())
    if payload["humidity"] < mins_maxs["h_min"]:
        increment_counter("counter_hmin", load_db_info())
    
    # Vérifier si les données sont au dela des normes depuis un moment, si c'est le cas une alerte est envoyée
    if payload["temperature"]< (mins_maxs["t_max"] - 3) & mins_maxs["counter_tmax"] > 0:   # -3 pour avoir un double seuil
        reset_counter("counter_tmax", load_db_info())
    if payload["humidity"] > (mins_maxs["h_min"] + 3)  & mins_maxs["counter_hmin"] > 0:     # +3 pour avoir un double seuil
        reset_counter("counter_hmin", load_db_info())
    
    if mins_maxs["counter_hmin"] > 3:
        add_notification(data["device_id"], "Humidity is dangerously low")
    if mins_maxs["counter_tmax"] > 3:
        add_notification(data["device_id"], "Temperature is dangerously high")




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
