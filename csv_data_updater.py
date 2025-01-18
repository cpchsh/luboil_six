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
        # ex: "2024-01-03" -> "2024-01-03T00:00:00+00:00"
        if "T" in date_str:
            # ex: "2024-01-03T12:00:00"
            # => "2024-01-03T12:00:00+00:00"
            if "+" not in date_str and "-" not in date_str[10:]:
                date_str += "+00:00"
        else:
            # ex: "2024-01-03"
            date_str += "T00:00:00+00:00"
    # 現在 date_str 應該類似 "2024-01-03T00:00:00+00:00"
    return datetime.fromisoformat(date_str) # offset-aware

def main():
    # 找 updatedData/ 下所有 .csv 檔
    print("===[csv_data_updater.py] START ===")
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
                    # "2024-01-03T00:00:00Z" => "2024-01-04T00:00:00+00:00"
                    db_ts_str = latest_rec["timestamp"].rstrip("Z") + "+00:00"
                    db_max_ts = datetime.fromisoformat(db_ts_str) # offset-aware
                else:
                    # 若資料庫沒這productName記錄
                    db_max_ts = datetime.fromisoformat("1900-01-01T00:00:00+00:00")

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
                        "timestamp": csv_ts.isoformat().replace("+00:00", "Z"),  # 統一存成 "xxxx-xx-xxT..Z"
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
    print("===[csv_data_updator.py] END ===")

if __name__ == "__main__":
    main()
