// src/containers/MonthChartContainer.jsx
import React, { useEffect, useState } from "react";
import FilterControls from "../components/FilterControls";
import ChartDisplayMonth from "../components/ChartDisplayMonth";
import {
  fetchLuboilData,
  fetchFutureMonthlyPredictions,
} from "../services/api";
import PropTypes from "prop-types";

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

    fetchFutureMonthlyPredictions()
      .then(setFutureMonthly)
      .catch((err) => console.error("Fetch future monthly error:", err));
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

  return (
    <div>
      {hasFutureData ? (
        <ChartDisplayMonth
          data={data}
          futureData={futureMonthly}
          title="Historical + Future Predictions Monthly Data"
        />
      ) : (
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
