# csv_data_updater.py
import os
import glob
import csv
from datetime import datetime
from pymongo import MongoClient

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise ValueError("No MONGODB_URI in environment variables")

client = MongoClient(MONGODB_URI)
db = client["luboil_data_db"]  # 您要使用的DB

def parse_date_str(date_str):
    """
    CSV 裡 'timestamp' 可能是 '2023-01-03T00:00:00Z' or '2023/1/3' etc
    需統一轉成 datetime 物件
    """
    # 嘗試多種格式
    fmts = ["%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d", "%Y/%m/%d"]
    for fmt in fmts:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            pass
    raise ValueError(f"Unrecognized date format: {date_str}")

def main():
    # 找 updatedData/ 下所有 .csv 檔
    csv_files = glob.glob("updatedData/*.csv")
    if not csv_files:
        print("No CSV found in updatedData folder, skip insertion.")
        return

    inserted_count = 0
    skip_count = 0

    for csv_file in csv_files:
        print(f"Processing {csv_file} ...")
        with open(csv_file, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)

            for row in reader:
                productName = row.get("productName")
                timestamp_str = row.get("timestamp")
                if not productName or not timestamp_str:
                    skip_count += 1
                    continue

                # 從DB找出該 productName 的最新 timestamp
                latest_rec = db.luboil_data.find_one(
                    {"productName": productName},
                    sort=[("timestamp", -1)],
                    projection={"timestamp": 1}
                )
                if latest_rec:
                    db_max_ts = datetime.fromisoformat(latest_rec["timestamp"].replace("Z","+00:00"))
                else:
                    # 若資料庫沒這productName記錄
                    db_max_ts = datetime(1900,1,1)

                try:
                    csv_ts = parse_date_str(timestamp_str)
                except ValueError:
                    skip_count += 1
                    continue

                # 如果 csv_ts > db_max_ts => 插入
                if csv_ts > db_max_ts:
                    # 其他欄位
                    cardCode = row.get("cardCode")
                    processYm = row.get("processYm")
                    quantity = row.get("quantity")
                    salesAmount = row.get("salesAmount")
                    productNumber = row.get("productNumber")
                    salesPerson = row.get("salesPerson")
                    custName = row.get("custName")
                    custPlace = row.get("custPlace")

                    doc = {
                        "productName": productName,
                        "timestamp": csv_ts.isoformat() + "Z",  # 統一存成 "xxxx-xx-xxT..Z"
                        "quantity": float(quantity) if quantity else 0,
                        "cardCode": cardCode,
                        "processYm": processYm,
                        "salesAmount": float(salesAmount) if salesAmount else 0,
                        "productNumber": productNumber,
                        "salesPerson": salesPerson,
                        "custName": custName,
                        "custPlace": custPlace
                    }
                    db.luboil_data.insert_one(doc)
                    inserted_count += 1
                else:
                    skip_count += 1

        print(f"Done {csv_file}, inserted={inserted_count}, skipped={skip_count}")

    print(f"All CSV processed. Inserted: {inserted_count}, skipped: {skip_count}")

if __name__ == "__main__":
    main()
