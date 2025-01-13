import React, { useEffect, useState } from "react";
import FilterControls from "../components/FilterControls";
import ChartDisplay from "../components/ChartDisplay";
import { fetchLuboilData, fetchFuturePredictions } from "../services/api";
import PropTypes from "prop-types";
import { buildColorMap } from "../components/utils/colors";


/**
 * ChartContainer - 可根據 seriesType 顯示不同系列(R/AWS/ALL)的潤滑油圖表
 * @param {Boolean} includeFutureData - 若為true, 會抓取未來預測並ㄧ同顯示
 * @param {String} seriesType         - "ALL", "R", "AWS" 用以篩選特定產品系列
 */
const ChartContainer = ({ includeFutureData = false, seriesType = "ALL" }) => {
  const [data, setData] = useState([]);
  const [futureData, setFutureData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  // 篩選條件
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [selectedProduct, setSelectedProduct] = useState(["All"]);

  useEffect(() => {
    // 抓取歷史數據
    fetchLuboilData()
      .then((allData) => {
        // 若 seriesType = "R", 只保留 R32, R46, R68
        // 若 seriesType = "AWS", 只保留 32AWS, 46AWS, 68AWS
        // 否則全部保留
        let filtered = allData;
        if (seriesType === "R") {
          filtered = allData.filter((item) => 
          ["R32", "R46", "R68"].includes(item.productName)
          );
        } else if (seriesType === "AWS") {
          filtered = allData.filter((item) =>
            ["32AWS", "46AWS", "68AWS"].includes(item.productName)
          );
        }
        setData(filtered);
      })
      .catch((err) => console.error("Fetch data error:", err));

    // 根據 includeFutureData 決定是否抓取未來預測數據
    if (includeFutureData) {
      fetchFuturePredictions()
        .then((allFuture) => {
          let futFiltered = allFuture;
          if (seriesType === "R") {
            futFiltered = allFuture.filter((item) =>
             ["R32", "R46", "R68"].includes(item.productName)
            );
          } else if (seriesType === "AWS") {
            futFiltered = allFuture.filter((item) =>
              ["32AWS", "46AWS", "68AWS"].includes(item.productName)
            );
          }
          setFutureData(futFiltered);
        })
        .catch((err) => console.error("Fetch future error:", err))
    }
  }, [includeFutureData, seriesType]);

  // 過濾數據
  useEffect(() => {
    const filtered = data.filter((item) => {
      const date = new Date(item.timestamp);
      const inDateRange =
        (!dateRange.start || date >= new Date(dateRange.start)) &&
        (!dateRange.end || date <= new Date(dateRange.end));

      // 若下拉選 "ALL"，表示不進行 productName 過濾
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
          title={
            seriesType === "R"
              ? "Historical + Future Predictions (R Series)"
              : seriesType === "AWS"
              ? "Historical + Future Predictions (AWS Series)"
              : "Historical + Future Predictions (All Products)"
          }
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
            title={
              seriesType === "R"
                ? "R Series Historical Data"
                : seriesType === "AWS"
                ? "AWS Series Historical Data"
                : "Filtered Historical Data(All Products)"
            }
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
  seriesType: PropTypes.oneOf(["ALL", "R", "AWS"])
};
ChartContainer.defaultProps = {
  includeFutureData: false,
  seriesType: "ALL",
};

export default ChartContainer;
