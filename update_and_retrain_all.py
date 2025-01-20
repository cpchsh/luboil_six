import os
import json
import numpy as np
import pandas as pd
from datetime import datetime

from pymongo import MongoClient
import joblib
import glob

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor

###############################
#  1) 從 MongoDB 讀取資料     #
###############################
def fetch_data_from_mongodb(mongo_uri, db_name="luboil_data_db", coll_name="luboil_data"):
    client = MongoClient(mongo_uri)
    db = client[db_name]
    collection = db[coll_name]

    data_cursor = collection.find({}, {
        "_id": 0,
        "productName": 1,
        "timestamp": 1,
        "quantity": 1,
        "cardCode": 1,
        "salesAmount": 1,
        "productNumber": 1,
        "salesPerson": 1,
        "custName": 1,
        "custPlace": 1
    })
    data_list = list(data_cursor)

    df = pd.DataFrame(data_list)
    return df

###############################
#  2) 特徵工程函式           #
###############################
def feature_engineering_for_product(df):
    selected_cols = ['timestamp', 'quantity', 'salesAmount', 'custPlace', 'salesPerson']
    data = df[selected_cols].copy()

    # 1) timestamp -> datetime
    data['timestamp'] = data['timestamp'].str.split('T').str[0]
    data['timestamp'] = pd.to_datetime(data['timestamp'], format='%Y-%m-%d', errors='coerce')

    # 2) salesAmount, quantity => numeric
    data['salesAmount'] = pd.to_numeric(data['salesAmount'], errors='coerce').fillna(0)
    data['quantity'] = pd.to_numeric(data['quantity'], errors='coerce').fillna(0)

    # 3) 平均價格
    data['平均價格'] = (data['salesAmount'] / data['quantity']).replace([np.inf, -np.inf], 0).fillna(0).round(2)

    # 4) 排序, 篩選日期
    data.sort_values(by='timestamp', ascending=True, inplace=True)
    data = data[(data['timestamp'] >= '2023-01-01') & (data['timestamp'] <= '2024-11-30')]

    # 5) groupby salesPerson => mean
    avg_sales_per_person = data.groupby('salesPerson')['salesAmount'].mean()
    avg_quantity_per_person = data.groupby('salesPerson')['quantity'].mean()

    data['avg_sales_per_salesperson'] = data['salesPerson'].map(avg_sales_per_person)
    data['avg_quantity_per_salesperson'] = data['salesPerson'].map(avg_quantity_per_person)

    # 6) 每個客戶分區的平均交易數量
    data['avg_quantity_per_customer'] = data.groupby(['custPlace'])['quantity'].transform('mean')

    # 7) rolling_avg_quantity_7
    data['rolling_avg_quantity_7'] = data['quantity'].shift(1).rolling(window=7).mean()

    # 8) One-hot for custPlace
    data = pd.get_dummies(data, columns=['custPlace'], drop_first=False)
    for col in data.columns:
        if col.startswith('custPlace_'):
            data[col] = data[col].astype(int)

    # 9) 促銷期
    data['促銷期'] = ((data['timestamp'].dt.year == 2024) & (data['timestamp'].dt.month.isin([3,4,5]))).astype(int)

    # drop salesPerson欄位
    data.drop(columns=['salesPerson'], inplace=True, errors='ignore')

    # 補缺失
    data.fillna(0, inplace=True)
    return data

###############################
#  3) 重新訓練單一商品        #
###############################
def retrain_for_product(df_full, productName, model_file, feature_importances_dict):
    df_prod = df_full[df_full['productName'] == productName].copy()
    if df_prod.empty:
        print(f"[WARN] No data for {productName}, skip retrain.")
        return

    data = feature_engineering_for_product(df_prod)
    if 'quantity' not in data.columns:
        print(f"[WARN] No 'quantity' in data for {productName}, skip.")
        return

    y = data['quantity']
    feature_cols = [
        '促銷期','avg_quantity_per_salesperson','custPlace_南區','custPlace_中區','custPlace_北區',
        'avg_quantity_per_customer','rolling_avg_quantity_7'
    ]
    for col in feature_cols:
        if col not in data.columns:
            data[col] = 0
    X = data[feature_cols]

    if len(X) < 10:
        print(f"[WARN] {productName} data < 10 rows, skip training.")
        return

    if not os.path.exists(model_file):
        print(f"[WARN] {model_file} not found, create new model for {productName}.")
        model = RandomForestRegressor(n_estimators=100, random_state=42)
    else:
        model = joblib.load(model_file)
        print(f"[INFO] Load old model => {model_file} for {productName}.")

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model.fit(X_train, y_train)

    importances = model.feature_importances_

    # 儲存到 feature_importances_dict
    imp_list = []
    for col, imp_val in zip(feature_cols, importances):
        imp_list.append({
            "feature": col,
            "importance": float(imp_val)
        })
    feature_importances_dict[productName] = imp_list

    # 覆蓋檔案
    joblib.dump(model, model_file)
    print(f"[INFO] {productName} retrained => {model_file}")

###############################
#  4) 讀DB & retrain & 存json #
###############################
def main():
    # 連線
    MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://admin:password@localhost:27017/luboil_data_db?authSource=admin")
    df = fetch_data_from_mongodb(MONGODB_URI)

    if df.empty:
        print("[WARN] No data from DB, end.")
        return

    MODEL_MAP = {
        "R32":    "best_rf_R32_model.pkl",
        "R46":    "best_rf_R46_model.pkl",
        "R68":    "best_rf_R68_model.pkl",
        "32AWS":  "best_rf_32AWS_model.pkl",
        "46AWS":  "best_rf_46AWS_model.pkl",
        "68AWS":  "best_rf_68AWS_model.pkl"
    }

    feature_importances_dict = {}

    for prod, model_path in MODEL_MAP.items():
        retrain_for_product(df, prod, model_path, feature_importances_dict)

    # 寫 feature_importances.json
    with open("feature_importances.json", "w", encoding="utf-8") as f:
        json.dump(feature_importances_dict, f, ensure_ascii=False, indent=4)
    print("[INFO] Feature importances saved => feature_importances.json")

    # << 新增：插入 feature_importances.json 到 MongoDB >>
    insert_feature_importances_to_mongo(MONGODB_URI, feature_importances_dict)

def insert_feature_importances_to_mongo(mongo_uri, feature_importances_dict):
    """
    先清空 'feature_data' collection, 再插入 feature_importances.json 內容
    DB: luboil_data_db
    coll: feature_data
    一條 doc => { productName, feature, importance }
    """
    client = MongoClient(mongo_uri)
    db = client["luboil_data_db"]
    coll = db["feature_data"]

    # 清空舊資料
    delete_result = coll.delete_many({})
    print(f"[INFO] Cleared old feature_data => deleted {delete_result.deleted_count} docs.")

    # 插入
    # feature_importances_dict結構 => { "R32": [ {feature, importance}, ...], "R46": [...], ...}
    insert_count = 0
    for productName, feat_list in feature_importances_dict.items():
        for feat_item in feat_list:
            doc = {
                "productName": productName,
                "feature": feat_item["feature"],
                "importance": feat_item["importance"]
            }
            coll.insert_one(doc)
            insert_count += 1

    print(f"[INFO] Inserted feature_data => {insert_count} docs.")


if __name__ == "__main__":
    main()
