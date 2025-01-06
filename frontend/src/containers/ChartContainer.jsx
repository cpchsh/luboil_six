// src/containers/LeftChartContainer.jsx
import React, { useEffect, useState } from "react";
import FilterControls from "../components/FilterControls";
import ChartDisplay from "../components/ChartDisplay";
import { fetchLuboilData, fetchFuturePredictions } from "../services/api";
import PropTypes from "prop-types";
import { buildColorMap } from "../components/utils/colors";

const ChartContainer = ({ includeFutureData = false }) => {
  const [data, setData] = useState([]);
  const [futureData, setFutureData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  // 篩選條件
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [selectedProduct, setSelectedProduct] = useState(["All"]);

  useEffect(() => {
    // 抓取歷史數據
    fetchLuboilData()
      .then(setData)
      .catch((err) => console.error("Fetch data error:", err));

    // 根據 includeFutureData 決定是否抓取未來預測數據
    if (includeFutureData) {
      fetchFuturePredictions()
        .then(setFutureData)
        .catch((err) => console.error("Fetch future error:", err));
    }
  }, [includeFutureData]);

  // 過濾數據
  useEffect(() => {
    const filtered = data.filter((item) => {
      const date = new Date(item.timestamp);
      const inDateRange =
        (!dateRange.start || date >= new Date(dateRange.start)) &&
        (!dateRange.end || date <= new Date(dateRange.end));

      const matchesWarehouse =
        selectedProduct.includes("All") ||
        selectedProduct.includes(item.productName);

      return inDateRange && matchesWarehouse;
    });
    setFilteredData(filtered);
  }, [data, dateRange, selectedProduct]);

  // 檢查是否有 futureData
  const hasFutureData =
    includeFutureData && futureData && futureData.length > 0;
  
  // 合併 data & futureData 的 productName，建立 colorMap
  const allProducts = new Set([
    ...data.map((d) => d.productName),
    ...futureData.map((f) => f.productName),
  ]);
  const productList =Array.from(allProducts).sort();
  const colorMap = buildColorMap(productList);

  return (
    <div>
      {hasFutureData ? (
        // 有未來資料時
        <ChartDisplay
          data={data}
          futureData={futureData}
          title="Historical + Future Predictions Daily Data"
          colorMap={colorMap} // 傳給 ChartDisplay
        />
      ) : (
        // 無未來資料時
        <div>
          <FilterControls
            data={data}
            dateRange={dateRange}
            selectedProducts={selectedProduct}
            setDateRange={setDateRange}
            setSelectedProducts={setSelectedProduct}
          />
          <ChartDisplay
            data={filteredData}
            title={"Filtered Historical Data"}
            colorMap={colorMap} // 傳給 ChartDisplay
          />
        </div>
      )}
    </div>
  );
};

// 定義 propTypes 和 defaultProps
ChartContainer.propTypes = {
  includeFutureData: PropTypes.bool,
};
ChartContainer.defaultProps = {
  includeFutureData: false,
};

export default ChartContainer;
