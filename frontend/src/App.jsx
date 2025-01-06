// App.jsx
import React, { useState } from "react";
import ChartContainer from "./containers/ChartContainer";
import MonthChartContainer from "./containers/MonthChartContainer";

function App() {
  const [activeTab, setActiveTab] = useState("daily");

  // Tab 切換 handle
  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
  };
  return (
    <div className="container-fluid">
      <h1 className="text-center">Luboil Data Visualization</h1>
      {/* Bootstrap NavTabs */}
      <ul className="nav nav-tabs">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "daily" ? "active" : ""}`}
            onClick={() => handleTabChange("daily")}
          >
            日資料(Daily)
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "monthly" ? "active" : ""}`}
            onClick={() => handleTabChange("monthly")}
          >
            月資料(Monthly)
          </button>
        </li>
      </ul>

      {/* 依 activeTab 顯示內容 */}
      {activeTab === "daily" && (
        <div className="mt-3">
          {/* 左右圖 (日) - 不含 futureData */}
          <div className="row">
            <div className="col-6">
              <ChartContainer includeFutureData={false} />
            </div>
            <div className="col-6">
              <ChartContainer includeFutureData={false} />
            </div>
          </div>
          {/* 下圖 (日) - 含 futureData */}
          <div className="row mt-5">
            <div className="col-12">
              <ChartContainer includeFutureData={true} />
            </div>
          </div>
        </div>
      )}

      {activeTab === "monthly" && (
        <div className="mt-3">
          {/* 左右圖 (月) - 不含 futureData */}
          <div className="row">
            <div className="col-6">
              <MonthChartContainer includeFutureData={false} />
            </div>
            <div className="col-6">
              <MonthChartContainer includeFutureData={false} />
            </div>
          </div>
          {/* 下圖 (月) - 含 futureData */}
          <div className="row mt-5">
            <div className="col-12">
              <MonthChartContainer includeFutureData={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;