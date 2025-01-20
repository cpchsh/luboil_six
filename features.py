import pandas as pd
import json
import numpy as np
import statsmodels.api as sm
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score

with open('sixoildata.json', 'r', encoding='utf-8') as f:
    json_data = json.load(f)
df = pd.DataFrame(json_data)

data_r32 = df[df['productName'] == 'R32']
data_r46 = df[df['productName'] == 'R46']
data_r68 = df[df['productName'] == 'R68']
data_32aws = df[df['productName'] == '32AWS']
data_46aws = df[df['productName'] == '46AWS']
data_68aws = df[df['productName'] == '68AWS']

# for r32
data = data_r32

# 假設你的原始資料已經被讀取到名為 data 的 DataFrame 中
# 篩選出感興趣的欄位
selected_columns = ['timestamp', 'quantity', 'salesAmount', 'custPlace', 'salesPerson']

# 選擇相關欄位
data = data[selected_columns]

# 將 '交易日期' 轉換為日期格式，方便排序和處理
data['timestamp'] = data['timestamp'].str.split('T').str[0]
data['timestamp'] = pd.to_datetime(data['timestamp'], format='%Y-%m-%d')


# Convert 'salesAmount' and 'quantity' columns to numeric type before calculation
data['salesAmount'] = pd.to_numeric(data['salesAmount'], errors='coerce')
data['quantity'] = pd.to_numeric(data['quantity'], errors='coerce')

# 計算平均價格
data['平均價格'] = (data['salesAmount'] / data['quantity']).round(2)

# 按 '交易日期' 升序排序
data = data.sort_values(by='timestamp', ascending=True)

data = data[(data['timestamp'] >= '2023-01-01') & (data['timestamp'] <= '2024-11-30')]

# 計算每位銷售人員的平均銷售額和平均銷售量
avg_sales_per_person = data.groupby('salesPerson')['salesAmount'].mean()
avg_quantity_per_person = data.groupby('salesPerson')['salesAmount'].mean()

# 將這些匯總特徵合併到原始數據中
data['avg_sales_per_salesperson'] = data['salesPerson'].map(avg_sales_per_person)
data['avg_quantity_per_salesperson'] = data['salesPerson'].map(avg_quantity_per_person)

# 檢查客戶類型和客戶分區是否有異常的值
print(data['custPlace'].unique())  # 檢查客戶分區中是否有不正確的類別

# 如果發現異常類別，清理掉異常值
data['平均價格'] = data['平均價格'].replace([np.inf, -np.inf], 0)

# 每個客戶分區的平均交易數量
data['avg_quantity_per_customer'] = data.groupby(['custPlace'])['quantity'].transform('mean')

# 滑動平均
data['rolling_avg_quantity_7'] = data['quantity'].shift(1).rolling(window=7).mean()

# 進行 One-Hot Encoding，不丟棄任何類別
data = pd.get_dummies(data, columns=['custPlace'], drop_first=False)

# 將one-hot encoding的數值轉換成數字
for col in data.columns:
    if col.startswith('custPlace_'):
        data[col] = data[col].astype(int)


# 添加促銷標籤，標記2024年3到5月為促銷期
data['促銷期'] = ((data['timestamp'].dt.year == 2024) & (data['timestamp'].dt.month.isin([3, 4, 5]))).astype(int)

data = data.drop(['salesPerson'], axis=1)
data.fillna(0, inplace=True)

# 準備資料
y = data['quantity']
X = data[['促銷期', 'avg_quantity_per_salesperson', 'custPlace_南區', 'custPlace_中區', 'custPlace_北區','avg_quantity_per_customer','rolling_avg_quantity_7']]

# 分割訓練集和測試集 (80% 用於訓練，20% 用於測試)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 構建隨機森林迴歸模型
rf_model = RandomForestRegressor(n_estimators=100, random_state=42)

# 訓練模型
rf_model.fit(X_train, y_train)

# 使用測試集進行預測
y_pred = rf_model.predict(X_test)

# 評估模型
mse = mean_squared_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print(f'Mean Squared Error: {mse}')
print(f'R-squared: {r2}')


from sklearn.model_selection import GridSearchCV

# 設定要調整的參數
param_grid = {
    'n_estimators': [100, 200, 300],
    'max_depth': [10, 20, 30],
    'min_samples_split': [2, 5, 10],
    'min_samples_leaf': [1, 2, 4],
    'bootstrap': [True, False]
}

# 使用隨機森林進行參數搜索
rf = RandomForestRegressor(random_state=42)
grid_search = GridSearchCV(estimator=rf, param_grid=param_grid,
                           cv=3, n_jobs=-1, verbose=2)

# 訓練模型
grid_search.fit(X_train, y_train)

# 顯示最好的參數
print(f"最佳參數: {grid_search.best_params_}")

# 使用最佳參數進行預測
best_rf_model = grid_search.best_estimator_
y_pred = best_rf_model.predict(X_test)

# 計算 MSE 和 R²
mse = mean_squared_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print(f'Mean Squared Error: {mse}')
print(f'R-squared: {r2}')

import matplotlib.pyplot as plt
import seaborn as sns

# 獲取特徵重要性
importances = best_rf_model.feature_importances_
indices = np.argsort(importances)[::-1]
features = X.columns

# 畫圖顯示特徵重要性
plt.figure(figsize=(12, 6))
sns.barplot(x=importances[indices], y=features[indices])
plt.title('Feature Importances')
plt.show()
