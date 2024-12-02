from datetime import datetime, timedelta
import json
import random

# File path for the generated data
DATA_PATH = 'ressources/data.json'

# Function to generate sample data
def generate_example_data():
    data = []
    device_ids = ['wfd-end', 'wfd-testing']

    # Generate data for the last 10 days
    for day_offset in range(-10, 1):  # From 10 days ago to today
        for _ in range(random.randint(5, 10)):  # Random number of entries per day
            timestamp = datetime.utcnow() + timedelta(days=day_offset, seconds=random.randint(0, 86400))
            data_point = {
                "device_id": random.choice(device_ids),
                "timestamp": timestamp.isoformat(),
                "flameAnalogTest2": round(random.uniform(20.0, 50.0), 2),
                "flameDigital": round(random.uniform(10.0, 90.0), 2),
                "humidity": round(random.uniform(10.0, 90.0), 2),
                "flameAnalog": round(random.uniform(10.0, 90.0), 2)
            }
            data.append(data_point)

    # Save to file
    with open(DATA_PATH, 'w') as f:
        json.dump(data, f, indent=4)

    print(f"Example data generated and saved to {DATA_PATH}")

# Run the data generation
generate_example_data()

""" 
        "flameAnalog": 130,
        "flameAnalogTest2": 1.1546699346036493e-42,
        "flameDigital": 0,
        "humidity": 100 
"""