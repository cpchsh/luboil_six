import pandas as pd
from prophet import Prophet
from pymongo import MongoClient
import os
import json

def get_data_from_mongodb():
    """
    從MongoDB獲取「潤滑油資料」，欄位為:
     - productName
     - timestamp
     - quantity
    (若實際 collection/欄位名不同，請自行調整)
    """
    client = MongoClient(os.getenv("MONGODB_URI"))
    db = client["luboil_data_db"]
    collection = db["luboil_data"]
    #取出欄位
    data = list(collection.find({}, {
        "_id": 0, 
        "productName": 1, 
        "timestamp": 1, 
        "quantity": 1
    }))
    return data

def predict_quantity_monthly(data, periods = 5, freq = "MS"):
    """
    使用 Prophet 預測未來 'periods' 個時間點 (月首 freq='MS')
    data 應為同一個 productName的記錄
    """
    df = pd.DataFrame(data)

    # 1)將timestamp轉換為datetime格式
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors = "coerce")
    if df["timestamp"].isnull().any():
        raise ValueError("Some timestamps could not be parsed. Please check your data.")
    
    # 2) 以「年月」為單位做加總
    # 取出該筆交易的 (year, month)
    df["year_month"] = df["timestamp"].dt.to_period("M")  # ex: 2024-01

    # 對同一 year_month 的 quantity 做 sum
    grouped = df.groupby("year_month", as_index=False)["quantity"].sum()
    
    # 3) Prophet 需要欄位 ds, y, ds = (該月份)
    grouped["ds"] = grouped["year_month"].dt.to_timestamp(freq="M")
    grouped["y"] = grouped["quantity"]

    # 不需要的欄位丟掉
    grouped = grouped.drop(columns=["year_month", "quantity"])

    if grouped.empty:
        raise ValueError("No valid data after grouping - possibly empty dataset")
    # 4) 建立 Prophet 模型並訓練
    model = Prophet(interval_width=0.8)
    model.fit(grouped)

    # 5) 建立未來時間範圍
    future = model.make_future_dataframe(periods=periods, freq=freq)
    forecast = model.predict(future)

    # 取最後 'periods' 筆預測結果
    future_forecast = forecast.iloc[-periods:][["ds", "yhat", "yhat_lower", "yhat_upper"]]
    return future_forecast.to_dict(orient="records")

def insert_future_predictions_to_mongodb(predictions):
    """將預測數據插入到MongoDB"""
    # 轉換字段名稱
    for prediction in predictions:
      prediction["timestamp"] = prediction.pop("ds")
      prediction["quantity"] = prediction.pop("yhat")
      prediction["lower_bound"] = prediction.pop("yhat_lower")
      prediction["upper_bound"] = prediction.pop("yhat_upper")

    client = MongoClient(os.getenv("MONGODB_URI"))
    db = client["luboil_data_db"]
    collection = db["future_quantity_monthly"]

    # 刪除舊數據
    collection.delete_many({})
    print("Old future data deleted")

    # 插入新數據
    collection.insert_many(predictions)
    print("New monthly future quantity data inserted.")

if __name__ == "__main__":
    # 1) 從 MongoDB獲取原始數據
    raw_data = get_data_from_mongodb()

    #2) 建立一個存放所有預測結果的清單
    all_predictions = []

    # 3) 依 productName分組
    product_names =set(item["productName"] for item in raw_data if "productName" in item)
    

    for product in product_names:
        #取出該 productName 的資料
        product_data = [
            {"timestamp": item["timestamp"], "quantity" : item["quantity"]}
            for item in raw_data
            if item.get("productName") == product
        ]

        # 4) 進行月預測，預測未來5個月
        future_data = predict_quantity_monthly(product_data, periods=5, freq="MS")

        # 幫預測結果加上 productName
        for row in future_data:
            row["productName"] = product
            # Convert Timestamp to ISO string 
            row["ds"] = row["ds"].isoformat() + "Z"

        # 加到總 predictions
        all_predictions.extend(future_data)

    # 5) 保存預測數據寫入 JSON檔
    with open("future_quantity_monthly.json", "w", encoding="utf-8") as f:
        json.dump(all_predictions, f, indent=4, ensure_ascii=False)
    print("Future monthly predictions saved to future_quantity_monthly.json.")

    # 寫回 MongoDB
    insert_future_predictions_to_mongodb(all_predictions)