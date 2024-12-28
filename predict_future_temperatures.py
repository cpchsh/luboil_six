import pandas as pd
from prophet import Prophet
from pymongo import MongoClient
import os
import json

def get_data_from_mongodb():
    """從MongoDB獲取完整數據"""
    client = MongoClient(os.getenv("MONGODB_URI"))
    db = client["sensor_data_db"]
    collection = db["temperature_data"]
    data = list(collection.find({}, {"_id": 0, "location": 1, "timestamp": 1, "temperature": 1}))
    return data

def predict_temperature(data, periods = 12, freq = "H"):
    """使用 Prophet 預測未來數據"""
    df = pd.DataFrame(data)
    #將timestamp轉換為datetime格式
    df["timestamp"] = pd.to_datetime(df["timestamp"], format="mixed", errors = "coerce")
    if df["timestamp"].isnull().any():
        raise ValueError("Some timestamps could not be parsed. Please check your data.")
    
    # 去除時區資訊
    df["timestamp"] = df["timestamp"].dt.tz_localize(None)

    df = df.rename(columns={"timestamp": "ds", "temperature": "y"})

    model = Prophet(interval_width=0.8)
    model.fit(df)

    future = model.make_future_dataframe(periods=periods, freq=freq)
    forecast = model.predict(future)

    future_forecast = forecast.iloc[-periods:][["ds", "yhat", "yhat_lower", "yhat_upper"]]
    return future_forecast.to_dict(orient="records")

def insert_future_predictions_to_mongodb(predictions):
    """將預測數據插入到MongoDB"""
    # 轉換字段名稱
    for prediction in predictions:
      prediction["timestamp"] = prediction.pop("ds")
      prediction["temperature"] = prediction.pop("yhat")
      prediction["lower_bound"] = prediction.pop("yhat_lower")
      prediction["upper_bound"] = prediction.pop("yhat_upper")

    client = MongoClient(os.getenv("MONGODB_URI"))
    db = client["sensor_data_db"]
    collection = db["future_temperature_data"]

    # 刪除舊數據
    collection.delete_many({})
    print("Old future data deleted")

    # 插入新數據
    collection.insert_many(predictions)
    print("New future temperature data inserted.")

if __name__ == "__main__":
    # 從 MongoDB獲取數據
    raw_data = get_data_from_mongodb()
    # 分倉庫進行預測
    warehouses =set(item["location"] for item in raw_data)
    predictions = []

    for warehouse in warehouses:
        warehouse_data = [
            {"timestamp": item["timestamp"], "temperature" : item["temperature"]}
            for item in raw_data
            if item["location"] == warehouse
        ]
        future_data = predict_temperature(warehouse_data)
        for item in future_data:
            item["location"] = warehouse
            # Convert Timestamp to ISO string and add 'Z' to denote UTC
            item["ds"] = item["ds"].isoformat() + "Z"
        predictions.extend(future_data)

    # 保存預測數據到JSON文件
    with open("future_temperature_data.json", "w") as f:
        json.dump(predictions, f, indent=4)
    print("Future predictions saved to future_temperature_data.json.")

    # 將預測數據插入到 MongoDB
    insert_future_predictions_to_mongodb(predictions)