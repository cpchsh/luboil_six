import os
import logging
from pymongo import MongoClient

# 設置日誌
logging.basicConfig(filename="delete_data.log", level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")

# 讀取 MongoDB URI
mongodb_uri = os.getenv("MONGODB_URI")
client = MongoClient(mongodb_uri)

try:
    db = client["sensor_data_db"]
    collection = db["temperature_data"]
    logging.info("Connected to Database")

    # 刪除所有資料
    result = collection.delete_many({})
    logging.info(f"Deleted {result.deleted_count} documents from 'temperature_data'")
    print(f"Deleted {result.deleted_count} documents from 'temperature_data'")

except Exception as e:
    logging.critical("Failed to delete data: %s", e)
finally:
    client.close()
