import os
import glob
import csv
import uuid
from datetime import datetime
from pymongo import MongoClient

# 讀取環境變數
MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise ValueError("No MONGODB_URI in environment variables")

# 建立連線
client = MongoClient(MONGODB_URI)
db = client["luboil_data_db"]

def parse_date_str(date_str):
    """
    將 date_str 轉成 offset-aware 的 datetime (UTC)
    若含 'Z' 則替換成 +00:00
    若是 yyyy-mm-dd (無Z)，也強制視為 UTC
    """
    date_str = date_str.strip()
    if date_str.endswith("Z"):
        # ex: "2024-01-03T00:00:00Z" -> "2024-01-03T00:00:00+00:00"
        date_str = date_str[:-1] + "+00:00"
    else:
        # 若沒帶 Z or 時區，假設為 UTC
        if "T" in date_str:
            if "+" not in date_str and "-" not in date_str[10:]:
                date_str += "+00:00"
        else:
            date_str += "T00:00:00+00:00"

    return datetime.fromisoformat(date_str)  # offset-aware

def main():
    print("=== [csv_data_updater.py] START ===")

    # 找 updatedData/ 下所有 .csv 檔
    csv_files = glob.glob("updatedData/*.csv")
    if not csv_files:
        print("No CSV found in updatedData folder, skip insertion.")
        return

    inserted_count = 0
    skip_count = 0

    for csv_file in csv_files:
        print(f"\nProcessing {csv_file} ...")
        with open(csv_file, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                productName = row.get("productName")
                timestamp_str = row.get("timestamp")
                if not productName or not timestamp_str:
                    skip_count += 1
                    continue

                # 1) parse CSV timestamp
                try:
                    csv_ts = parse_date_str(timestamp_str)
                except ValueError:
                    skip_count += 1
                    continue

                # 2) 動態生成 一個唯一標識 (UUID)
                #    代表該行CSV交易的 "行ID" / "transID"。
                row_uuid = str(uuid.uuid4())

                # 3) 準備插入 doc
                cardCode = row.get("cardCode")
                processYm = row.get("processYm")
                quantity = row.get("quantity")
                salesAmount = row.get("salesAmount")
                productNumber = row.get("productNumber")
                salesPerson = row.get("salesPerson")
                custName = row.get("custName")
                custPlace = row.get("custPlace")

                doc = {
                    "_importUUID": row_uuid,  # 用uuid作為唯一標識
                    "productName": productName,
                    "timestamp": csv_ts.isoformat().replace("+00:00", "Z"),
                    "quantity": float(quantity) if quantity else 0.0,
                    "cardCode": cardCode,
                    "processYm": processYm,
                    "salesAmount": float(salesAmount) if salesAmount else 0.0,
                    "productNumber": productNumber,
                    "salesPerson": salesPerson,
                    "custName": custName,
                    "custPlace": custPlace
                }

                # 4) upsert: 以 "_importUUID" 為 key => 不會重複插入
                #    但多次執行同一檔, 也不會插入重複
                result = db.luboil_data.update_one(
                    {"_importUUID": row_uuid},
                    {"$setOnInsert": doc},
                    upsert=True
                )
                if result.upserted_id:
                    # 代表是新的插入
                    inserted_count += 1
                else:
                    # matched -> skip
                    skip_count += 1

        print(f"Done {csv_file}, inserted so far: {inserted_count}, skipped={skip_count}")

    print(f"\nAll CSV processed. Total inserted: {inserted_count}, skipped={skip_count}")
    print("=== [csv_data_updater.py] END ===")

if __name__ == "__main__":
    main()
