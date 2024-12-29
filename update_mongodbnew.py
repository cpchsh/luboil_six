import os
import json
import logging
from pymongo import MongoClient, InsertOne
from datetime import datetime

# 設置日誌
logging.basicConfig(
    filename="data_insertion.log",
    level=logging.INFO,
    format="%(asctime)s %(levelname)s: %(message)s"
)

# 讀取 MongoDB URI（若沒設定環境變數，採用預設）
mongodb_uri = os.getenv("MONGODB_URI")

client = MongoClient(mongodb_uri)

def is_valid_record(record):
    """
    檢查資料紀錄的基本有效性：
    1) timestamp：可被解析為 ISO8601
    2) productName：不為空
    (若需要檢查其他欄位，例如 quantity >= 0、salesAmount >= 0... 可自行加入)
    """
    # 檢查 timestamp
    try:
        datetime.fromisoformat(record["timestamp"].replace("Z", "+00:00"))
    except (ValueError, KeyError):
        logging.error("Invalid or missing timestamp: %s", record.get("timestamp"))
        return False

    # 檢查 productName
    if not record.get("productName"):
        logging.error("Missing or empty productName for record: %s", record)
        return False

    return True

try:
    db = client["luboil_data_db"]
    collection = db["luboil_data"]  # 您若想換集合名，可自行改
    logging.info("Connected to Database")

    # 打開 JSON 文件並讀取數據（假設檔名為 output.json）
    json_file_path = "sixoildata.json"
    with open(json_file_path, "r", encoding="utf-8") as file:
        data = json.load(file)

    operations = []
    valid_count = 0
    invalid_count = 0

    for record in data:
        # 驗證每筆資料
        if is_valid_record(record):
            # 不檢查重複，直接插入
            operations.append(InsertOne(record))
            valid_count += 1
            logging.info("Prepared InsertOne for record: %s", record)
        else:
            invalid_count += 1
            logging.warning("Invalid record, skipping: %s", record)

    # 如果有有效資料就做 bulk_write
    if operations:
        result = collection.bulk_write(operations)
        logging.info("Bulk write result: %s", result.bulk_api_result)
        print(f"成功插入 {valid_count} 筆有效紀錄（含重複），已寫入資料庫。")
    else:
        logging.info("No valid records to insert.")
        print("沒有有效紀錄可插入。")

    if invalid_count > 0:
        print(f"共有 {invalid_count} 筆資料格式不符，被跳過。")

except Exception as e:
    logging.critical("Database operation failed: %s", e)
    print(f"資料庫操作失敗: {e}")

finally:
    client.close()
