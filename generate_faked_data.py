import json
import random
import datetime

def generate_fake_temperature_data():
    warehouses = ["Warehouse 1", "Warehouse 2", "Warehouse 3"]
    data = []
    current_time = datetime.datetime.utcnow()

    for warehouse in warehouses:
        for i in range(3):  # 生成一天內的3個時段數據
            timestamp = current_time - datetime.timedelta(hours=i * 4)  # 每4小時一個數據
            temperature = round(random.uniform(10.0, 40.0), 1)  # 隨機生成 10-40 度
            data.append({
                "location": warehouse,
                "timestamp": timestamp.isoformat() + "Z",  # 符合 ISO8601 格式
                "temperature": temperature,
            })

    return data

if __name__ == "__main__":
    fake_data = generate_fake_temperature_data()
    with open("temperature_data.json", "w") as f:
        json.dump(fake_data, f, indent=4)
    print("Fake data generated and saved to temperature_data.json.")

