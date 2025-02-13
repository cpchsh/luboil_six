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

def predict_quantity(data, periods = 10, freq = "D"):
    """
    使用 Prophet 預測未來 'periods' 個時間點 (以天為單位 freq='D')
    data 應為同一個 productName的記錄
    """
    df = pd.DataFrame(data)

    #將timestamp轉換為datetime格式
    df["timestamp"] = pd.to_datetime(df["timestamp"], format="mixed", errors = "coerce")
    if df["timestamp"].isnull().any():
        raise ValueError("Some timestamps could not be parsed. Please check your data.")
    
    # 以「日期」為單位做加總
    # 1)取出date (不分時分秒)
    df["date"] = df["timestamp"].dt.date

    # 2)對同一天的 quantity 做 sum
    grouped = df.groupby("date", as_index=False)["quantity"].sum()
    
    # 3) Prophet 需要欄位 ds, y
    grouped["ds"] = pd.to_datetime(grouped["date"]) # 轉回 datetime
    grouped["y"] = grouped["quantity"]

    # 不需要的欄位丟掉
    grouped = grouped.drop(columns=["date", "quantity"])

    if grouped.empty:
        raise ValueError("No valid data after grouping - possibly empty dataset")
    # 建立 Prophet 模型並訓練
    model = Prophet(interval_width=0.8)
    model.fit(grouped)

    # 建立未來時間範圍
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
    collection = db["future_quantity_data"]

    # 刪除舊數據
    # collection.delete_many({})
    # print("Old future data deleted")

    # 插入或更新數據
    inserted_count = 0
    updated_count = 0
    for doc in predictions:
        # 以productName + timestamp 當成查詢條件
        query = {
            "productName": doc["productName"],
            "timestamp": doc["timestamp"]
        }
        # 使用 upsert=True, 若沒找到就插入，找到就更新
        result = collection.update_one(query, {"$set": doc}, upsert = True)

        # 依照回傳的 result 判斷是插入或更新
        if result.upserted_id:
            inserted_count += 1
        else:
            # 若matched_count 大於0 表示是更新
            if result.matched_count > 0:
                updated_count += 1
    print(f"Upsert finish. Inserted: {inserted_count}, Updated: {updated_count}")

if __name__ == "__main__":
    # 從 MongoDB獲取數據
    raw_data = get_data_from_mongodb()

    #建立一個存放所有預測結果的清單
    all_predictions = []

    # 依 productName分組
    product_names =set(item["productName"] for item in raw_data if "productName" in item)
    

    for product in product_names:
        #取出該 productName 的資料
        product_data = [
            {"timestamp": item["timestamp"], "quantity" : item["quantity"]}
            for item in raw_data
            if item.get("productName") == product
        ]

        # 進行預測
        future_data = predict_quantity(product_data, periods=10, freq="D")

        # 幫預測結果加上 productName
        for row in future_data:
            row["productName"] = product
            # Convert Timestamp to ISO string 
            row["ds"] = row["ds"].isoformat() + "Z"

        # 加到總 predictions
        all_predictions.extend(future_data)

    # 保存預測數據寫入 JSON檔
    with open("future_quantity_data.json", "w", encoding="utf-8") as f:
        json.dump(all_predictions, f, indent=4, ensure_ascii=False)
    print("Future predictions saved to future_quantity_data.json.")

    # 寫回 MongoDB
    insert_future_predictions_to_mongodb(all_predictions)