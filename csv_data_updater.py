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
    將 date_str 轉成 offset-aware datetime (UTC).
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

def get_max_ts_for_product(productName):
    """
    從資料庫抓該 productName 的最大 timestamp, 若無則回傳 1900-01-01
    (此函式只查一次，不會動態隨插入更新)
    """
    latest_rec = db.luboil_data.find_one(
        {"productName": productName},
        sort=[("timestamp", -1)],
        projection={"timestamp": 1}
    )
    if latest_rec:
        db_ts_str = latest_rec["timestamp"].replace("Z", "+00:00")
        return datetime.fromisoformat(db_ts_str)  # offset-aware
    else:
        return datetime.fromisoformat("1900-01-01T00:00:00+00:00")

def main():
    print("=== [csv_data_updater.py] START ===")

    csv_files = glob.glob("updatedData/*.csv")
    if not csv_files:
        print("No CSV found in updatedData folder, skip insertion.")
        return

    inserted_count = 0
    skip_count = 0

    # 先將 CSV 全部讀起來(若CSV很多行, 請斟酌用其他方法).
    # 或做單一檔案一次處理, 也行。
    for csv_file in csv_files:
        print(f"\nProcessing {csv_file} ...")

        # 第一階段：讀CSV所有行到 memory
        with open(csv_file, "r", encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
        
        # 取得所有在此CSV出現的 productName (避免對每行都 findOne)
        productNames_in_csv = set(row["productName"] for row in rows if row.get("productName"))

        # 建立 dict { productName: dbMaxTs }，只查一次
        dictProductMaxTs = {}
        for pName in productNames_in_csv:
            if pName:  # 排除空
                dictProductMaxTs[pName] = get_max_ts_for_product(pName)

        # 第二階段：逐行處理
        for row in rows:
            productName = row.get("productName")
            timestamp_str = row.get("timestamp")
            if not productName or not timestamp_str:
                skip_count += 1
                continue

            try:
                csv_ts = parse_date_str(timestamp_str)
            except ValueError:
                skip_count += 1
                continue

            # 如果 dictionary 沒有, 表示 CSV 有 productName 但沒在 DB => 用(1900-01-01)
            db_max_ts = dictProductMaxTs.get(productName)
            if not db_max_ts:
                db_max_ts = datetime.fromisoformat("1900-01-01T00:00:00+00:00")

            # 檢查 "csv_ts > db_max_ts"?
            if csv_ts <= db_max_ts:
                # 舊日期 or 同日期 => skip
                skip_count += 1
                continue

            # 動態 UUID => 允許同一CSV中 (同 timestamp) 也插多筆
            row_uuid = str(uuid.uuid4())

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

            # 上傳(單純插入, 不 upsert => 每次執行都新插, 看需求)
            # 若您想避免同CSV重複 => 用 upsert
            # 這邊示範 insert_one 就好
            db.luboil_data.insert_one(doc)
            inserted_count += 1

        print(f"Done {csv_file}, inserted so far: {inserted_count}, skipped={skip_count}")

    print(f"\nAll CSV processed. Total inserted: {inserted_count}, skipped={skip_count}")
    print("=== [csv_data_updater.py] END ===")

if __name__ == "__main__":
    main()
