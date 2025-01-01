import os
import json
import logging
from pymongo import MongoClient, UpdateOne
from datetime import datetime

# 設置日誌
logging.basicConfig(filename="data_insertion.log", level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")

# 讀取 MongoDB URI
mongodb_uri = os.getenv("MONGODB_URI")

client = MongoClient(mongodb_uri)

def is_valid_record(record):
    """檢查記錄的有效性"""
    try:
        # 驗證 timestamp 格式
        datetime.fromisoformat(record["timestamp"].replace("Z", "+00:00"))
    except ValueError:
        logging.error("Invalid timestamp: %s", record["timestamp"])
        return False

    # 驗證 location 是否存在
    if not record.get("location"):
        logging.error("Missing or empty location")
        return False

    # 驗證 temperature 是否在合理範圍內
    if not isinstance(record.get("temperature"), (int, float)) or not (-50 <= record["temperature"] <= 100):
        logging.error("Invalid temperature: %s", record["temperature"])
        return False

    return True

try:
    db = client["sensor_data_db"]
    collection = db["temperature_data"]
    logging.info("Connected to Database")

    # 打開 JSON 文件並讀取數據
    with open("temperature_data.json", "r") as file:
        data = json.load(file)
        operations = []  # 批量操作儲存清單

        for record in data:
            if is_valid_record(record):
                # 設置查詢條件（唯一識別標準：timestamp 和 location）
                query = {"timestamp": record["timestamp"], "location": record["location"]}

                # 更新數據或插入新數據
                update = {
                    "$set": {"temperature": record["temperature"]},  # 如果 temperature 不同，更新
                    "$setOnInsert": {"timestamp": record["timestamp"], "location": record["location"]}
                }

                # 將操作加入批量處理清單
                operations.append(UpdateOne(query, update, upsert=True))
                logging.info("Prepared operation for record: %s", record)
            else:
                logging.warning("Invalid record, skipping: %s", record)

        # 批量執行操作
        if operations:
            result = collection.bulk_write(operations)
            logging.info("Bulk write result: %s", result.bulk_api_result)
        else:
            logging.info("No valid records to insert or update.")

except Exception as e:
    logging.critical("Database operation failed: %s", e)
finally:
    client.close()
