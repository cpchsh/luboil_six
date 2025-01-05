// src/containers/LeftChartContainer.jsx
import React, { useEffect, useState } from "react";
import FilterControls from "../components/FilterControls";
import ChartDisplay from "../components/ChartDisplay";
import { fetchLuboilData, fetchFuturePredictions } from "../services/api";
import PropTypes from "prop-types";

const LeftChartContainer = ({ includeFutureData = false }) => {
  const [data, setData] = useState([]);
  const [futureData, setFutureData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  // 篩選條件
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [selectedWarehouse, setSelectedWarehouse] = useState(["All"]);

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
        selectedWarehouse.includes("All") || selectedWarehouse.includes(item.location);

      return inDateRange && matchesWarehouse;
    });
    setFilteredData(filtered);
  }, [data, dateRange, selectedWarehouse]);

  return (
    <div>
      <h2>Left Chart (Daily)</h2>
      <FilterControls
        data={data}
        dateRange={dateRange}
        selectedWarehouses={selectedWarehouse}
        setDateRange={setDateRange}
        setSelectedWarehouses={setSelectedWarehouse}
      />
      <ChartDisplay
        data={filteredData}
        {...(includeFutureData && { futureData })}
        title="Left Filtered Historical Data"
      />
    </div>
  );
};

// 定義 propTypes 和 defaultProps
LeftChartContainer.propTypes = {
  includeFutureData: PropTypes.bool,
};

LeftChartContainer.defaultProps = {
  includeFutureData: false,
};

export default LeftChartContainer;
