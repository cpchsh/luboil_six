// src/containers/MonthChartContainer.jsx
import React, { useEffect, useState } from "react";
import FilterControls from "../components/FilterControls";
import ChartDisplayMonth from "../components/ChartDisplayMonth";
import {
  fetchLuboilData,
  fetchFutureMonthlyPredictions,
} from "../services/api";
import PropTypes from "prop-types";
import { buildColorMap } from "../components/utils/colors";

const MonthChartContainer = ({ includeFutureData = false }) => {
  const [data, setData] = useState([]);
  const [futureMonthly, setFutureMonthly] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  // 篩選條件
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [selectedWarehouse, setSelectedWarehouse] = useState(["All"]);

  useEffect(() => {
    // 自己抓月資料 (或者抓同一 daily data? 依您設計)
    fetchLuboilData()
      .then(setData)
      .catch((err) => console.error("Fetch data error:", err));

    // 根據 includeFutureData 決定是否抓取未來預測數據
    if (includeFutureData) {
      fetchFutureMonthlyPredictions()
        .then(setFutureMonthly)
        .catch((err) => console.error("Fetch future monthly error:", err));
    }
  }, [includeFutureData]);

  useEffect(() => {
    const filtered = data.filter((item) => {
      const date = new Date(item.timestamp);
      const inDateRange =
        (!dateRange.start || date >= new Date(dateRange.start)) &&
        (!dateRange.end || date <= new Date(dateRange.end));
      const matchesWarehouse =
        selectedWarehouse.includes("All") ||
        selectedWarehouse.includes(item.location);

      return inDateRange && matchesWarehouse;
    });
    setFilteredData(filtered);
  }, [data, dateRange, selectedWarehouse]);

  // 檢查是否有 futureData
  const hasFutureData =
    includeFutureData && futureMonthly && futureMonthly.length > 0;

  const allProducts = new Set([
    ...data.map((d) => d.productName),
    ...futureMonthly.map((f) => f.productName)
  ]);
  const productList = Array.from(allProducts).sort();
  const colorMap = buildColorMap(productList);

  return (
    <div>
      {hasFutureData ? (
        <ChartDisplayMonth
          data={data}
          futureData={futureMonthly}
          title="Historical + Future Predictions Monthly Data"
          colorMap={colorMap}
        />
      ) : (
        //無未來資料時
        <div>
          <FilterControls
            data={data}
            dateRange={dateRange}
            selectedWarehouses={selectedWarehouse}
            setDateRange={setDateRange}
            setSelectedWarehouses={setSelectedWarehouse}
          />
          <ChartDisplayMonth
            data={filteredData}
            title="Monthly Filtered Historical Data"
            colorMap={colorMap}
          />
        </div>
      )}
    </div>
  );
};

MonthChartContainer.propTypes = {
  includeFutureData: PropTypes.bool,
};
MonthChartContainer.defaultProps = {
  includeFutureData: false,
};

export default MonthChartContainer;
