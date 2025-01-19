import os
import glob
import csv
import uuid
from datetime import datetime
from pymongo import MongoClient

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise ValueError("No MONGODB_URI in environment variables")

client = MongoClient(MONGODB_URI)
db = client["luboil_data_db"]

def parse_date_str(date_str):
    """
    轉成 offset-aware datetime (UTC)
    """
    date_str = date_str.strip()
    if date_str.endswith("Z"):
        date_str = date_str[:-1] + "+00:00"
    else:
        if "T" in date_str:
            if "+" not in date_str and "-" not in date_str[10:]:
                date_str += "+00:00"
        else:
            date_str += "T00:00:00+00:00"
    return datetime.fromisoformat(date_str)  # offset-aware

def main():
    print("=== [csv_data_updater.py] START ===")
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
                    csv_ts = parse_date_str(timestamp_str)  # offset-aware
                except ValueError:
                    skip_count += 1
                    continue

                # 2) 先檢查 DB 中對應 productName 的最大日期
                latest_rec = db.luboil_data.find_one(
                    {"productName": productName},
                    sort=[("timestamp", -1)],  # 取得 timestamp 最大的
                    projection={"timestamp": 1}
                )
                if latest_rec:
                    db_ts_str = latest_rec["timestamp"].replace("Z", "+00:00")
                    db_max_ts = datetime.fromisoformat(db_ts_str)  # offset-aware
                else:
                    # DB 裡沒這個 productName
                    db_max_ts = datetime.fromisoformat("1900-01-01T00:00:00+00:00")

                # 若 csv_ts 不大於 db_max_ts -> skip
                # (表示該日期以前的已在 DB)
                if csv_ts <= db_max_ts:
                    skip_count += 1
                    continue

                # 3) 動態生成 _importUUID => 保證同一 CSV 同 timestamp 也能區分是不同交易
                row_uuid = str(uuid.uuid4())

                # 4) 組裝 doc
                cardCode = row.get("cardCode")
                processYm = row.get("processYm")
                quantity = row.get("quantity")
                salesAmount = row.get("salesAmount")
                productNumber = row.get("productNumber")
                salesPerson = row.get("salesPerson")
                custName = row.get("custName")
                custPlace = row.get("custPlace")

                doc = {
                    "_importUUID": row_uuid,
                    "productName": productName,
                    "timestamp": csv_ts.isoformat().replace("+00:00","Z"),
                    "quantity": float(quantity) if quantity else 0.0,
                    "cardCode": cardCode,
                    "processYm": processYm,
                    "salesAmount": float(salesAmount) if salesAmount else 0.0,
                    "productNumber": productNumber,
                    "salesPerson": salesPerson,
                    "custName": custName,
                    "custPlace": custPlace
                }

                # 5) upsert => 以 _importUUID 為 key => 不重複插入同CSV行
                result = db.luboil_data.update_one(
                    {"_importUUID": row_uuid},
                    {"$setOnInsert": doc},
                    upsert=True
                )
                if result.upserted_id:
                    inserted_count += 1
                else:
                    skip_count += 1

        print(f"Done {csv_file}, inserted so far: {inserted_count}, skipped={skip_count}")

    print(f"\nAll CSV processed. Total inserted: {inserted_count}, skipped={skip_count}")
    print("=== [csv_data_updater.py] END ===")

if __name__ == "__main__":
    main()
