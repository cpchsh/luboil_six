import os
import json
import joblib
import pandas as pd
from pymongo import MongoClient

# 
MODEL_FILES = [
    "best_rf_R32_20240929_model.pkl",
    "best_rf_R46_20240929_model.pkl",
    "best_rf_R68_20240930_model.pkl",
    "best_rf_32AWS_20240930_model.pkl",
    "best_rf_46AWS_20240930_model.pkl",
    "best_rf_68AWS_20240930_model.pkl"
]

# 對應每個模型用到的特徵欄位 (需跟訓練時ㄧ致)
FEATURE_COLS_MAP ={
    "best_rf_R32_20240929_model.pkl" : [
        "促銷期", "avg_quantity_per_salesperson", "avg_quantity_per_customer",
        "rolling_avg_quantity_7", "custPlace_南區", "custPlace_中區", "custPlace_北區"
    ],
    "best_rf_R46_20240929_model.pkl" : [
        "促銷期", "avg_quantity_per_salesperson", "avg_quantity_per_customer",
        "rolling_avg_quantity_7", "custPlace_南區", "custPlace_中區", "custPlace_北區"
    ],
    "best_rf_R68_20240930_model.pkl" : [
        "促銷期", "avg_quantity_per_salesperson", "avg_quantity_per_customer",
        "rolling_avg_quantity_7", "custPlace_南區", "custPlace_中區", "custPlace_北區"
    ],
    "best_rf_32AWS_20240930_model.pkl" : [
        "促銷期", "avg_quantity_per_salesperson", "avg_quantity_per_customer",
        "rolling_avg_quantity_7", "custPlace_南區", "custPlace_中區", "custPlace_北區"
    ],
    "best_rf_46AWS_20240930_model.pkl" : [
        "促銷期", "avg_quantity_per_salesperson", "avg_quantity_per_customer",
        "rolling_avg_quantity_7", "custPlace_南區", "custPlace_中區", "custPlace_北區"
    ],
    "best_rf_68AWS_20240930_model.pkl" : [
        "促銷期", "avg_quantity_per_salesperson", "avg_quantity_per_customer",
        "rolling_avg_quantity_7", "custPlace_南區", "custPlace_中區", "custPlace_北區"
    ]
}

def insert_feature_importances_to_mongodb(records):
    """
    將特徵重要度列表到 MongoDB(feature_importances collection).
    records: List[dict], 每個dict至少含 {modelName, feature, importance}
    """