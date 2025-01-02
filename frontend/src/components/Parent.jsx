import React, { useEffect, useState } from "react";
import ChartDisplay from "./ChartDisplay";
import { buildColorMap } from "./utils/colors";
import { fetchLuboilData, fetchFuturePredictions } from "../services/api";

const Parent = () => {
    const [historicalData, setHistoricalData] = useState([]);
    const [futureData, setFutureData] = useState([]);
    const [error, setError] = useState(null);
    const [data, setData] = useState([]);

    // 當初次進入時獲取歷史資料
    useEffect(() => {
      fetchLuboilData()
        .then((fetchedData) => setData(fetchedData))
        .catch((error) => {setError(error.message);});
    }, []);

    useEffect(() => {
      fetchFuturePredictions()
        .then((predictions) => setFutureData(predictions))
        .catch((error) => {setError(error.message);});
    }, []);

    // 收集所有可能的產品
    const allProducts = Array.from(
        new Set([
            ...historicalData.map((d) => d.productName),
            ...futureData.map((d) => d.productName),
        ])
    )

    // 建立顏色對照Map
    const colorMap = buildColorMap(allProducts);
    return(
        <div>
            {/* 上方圖表：只顯示歷史，想要少一點筆數 */}
            <ChartDisplay
              data={historicalData}
              title="Filtered Historical Data"
              futureData={[]}       //不顯示未來資料
              maxHistory={50}       //只顯示最後50筆歷史
              colorMap={colorMap}
            />
            {/* 下方圖表：歷史 + 預測 (顯示更多資料) */}
            <ChartDisplay
              data={historicalData}
              futureData={futureData}
              title="Historical + Predictions (All products)"
              maxHistory={200} // 顯示最後200筆歷史
              colorMap={colorMap}
            />
        </div>
    );
};

export default Parent;