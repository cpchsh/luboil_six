import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import moment from "moment";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const ChartDisplay = ({ data, title, futureData = [], historyLimit = 102 }) => {
    if (!data.length) {
      return <p>No data available for {title}</p>;
    }
    
    // 限制數據點到最近的個數(limit)，並確保排序
    const limitData = (data, limit) => {
      const sortedData = [...data].sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );
      const startIndex = Math.max(0, sortedData.length - limit);
      return sortedData.slice(startIndex, sortedData.length);
    }

    // 若是下方圖表，歷史數據限制為36個點，其他圖表則使用`historyLimit`
    const limitedData = 
      title.includes("Predictions") && historyLimit > 36
        ? limitData(data, 36)
        : limitData(data, historyLimit);

    //const limitedFutureData = futureData ? limitData(futureData, 102) : [];

    // 將歷史及未來的timestamp全部收集起來
    const allTimestamps = [
      ...limitedData.map((item) => item.timestamp),
      ...(futureData ? futureData.map((item) => item.timestamp) : [])
    ]

    const timestamps = Array.from(new Set(allTimestamps)).sort(
      (a, b) => new Date(a) - new Date(b)
    );

    const warehouses = Array.from(
      new Set([
        ...limitedData.map((item) => item.location),
        ...(futureData
          ? futureData.map((item) => item.location)
          : []),
      ])
    );

    const predefinedColors = [
      "rgba(255, 0, 0, 1)", // red
      "rgba(0, 255, 0, 1)", // green
      "rgba(0, 0, 255, 1)", // blue
      // "rgba(255, 165, 0, 1)", // orange
      // "rgba(128, 0, 128, 1)", // purple
      // "rgba(255, 255, 0, 1)", // yellow
    ];

    const datasets = warehouses.flatMap((warehouse, index) => {
      // 原始數據
      const historicalDataset = {
        label: `${warehouse} (Historical)`,
        data: timestamps.map((timestamp) => {
          const match = data.find(
            (item) => item.location === warehouse && item.timestamp === timestamp
          );
          return match ? parseFloat(match.temperature) : null;
        }),
        borderColor: predefinedColors[index % predefinedColors.length],
        spanGaps: true, // 啟用 gap 自動連接
        borderWidth: 2,
        fill: false //不填滿
      };

      if (!futureData.length) {
        return [historicalDataset];
      }

      // 預測資料（中間虛線）
      const predictionDataset = {
            label: `${warehouse} (Prediction)`,
            data: timestamps.map((timestamp) => {
              const match = futureData.find(
                (item) => item.location === warehouse && item.timestamp === timestamp
              );
              return match ? parseFloat(match.temperature) : null;
            }),
            borderColor: predefinedColors[index % predefinedColors.length],
            borderDash: [5, 5], //虛線模式
            spanGaps: true,
            borderWidth: 2,
            fill: false
          }
      // 下界 (Lower Bound)
      const lowerBoundData =  timestamps.map((timestamp) =>{
        const lbMatch = futureData.find(
          (item) => item.location === warehouse && item.timestamp === timestamp 
        )?.lower_bound;
        return lbMatch !== undefined ? parseFloat(lbMatch) : null;
      });
      
      const lowerBoundDataset = {
        label: `${warehouse} (Lower Bound)`,
        data: lowerBoundData,
        borderColor: 'rgba(0,0,0,0)', // 不顯示線，透明邊線
        pointRadius: 0,
        spanGaps: true,
        fill: false
      };

      // 上界 (Upper Bound) - 將fill指向前一個資料集(即 lowerBoundDataset)
      const upperBoundData = timestamps.map((timestamp) => {
        const ubMatch = futureData.find(
          (item) => item.location === warehouse && item.timestamp === timestamp 
        )?.upper_bound;
        return ubMatch !== undefined ? parseFloat(ubMatch) : null;
      })

      const upperBoundDataset = {
        label: `${warehouse} (Confidence Interval)`,
        data: upperBoundData,
        borderColor: 'rgba(0,0,0,0)', //不顯示線
        backgroundColor: predefinedColors[index % predefinedColors.length].replace("1)", "0.2)"), //半透明背景
        pointRadius: 0,
        borderWidth: 0,
        spanGaps: true,
        fill: '-1' // 將此dataset與上個dataset行程填滿區域
      }

      // 回傳順序：
      // 1. Historical
      // 2. LowerBound (為fill的底線)
      // 3. UpperBound (fill: '-1' 表示填入到下界線)
      // 4. Prediction (中間虛線)
      return [historicalDataset, lowerBoundDataset, upperBoundDataset, predictionDataset]
    });


    const chartData = {
      labels: timestamps.map((timestamp) => 
        moment(timestamp).format("YYYY-MM-DD HH:mm")
      ),
      datasets: datasets.flat().filter(Boolean), //過濾掉 null
    };
      

    return (
      <div>
        <h2>{title}</h2>
        <Line
          data={chartData}
          options={{
            responsive: true,
            plugins: {
              legend: {
                display: true,
                position: "top",
                labels: {
                  // 使用 filter 函式過濾掉不想縣市的圖例
                  filter: (legendItem, chartData) => {
                    const text = legendItem.text || "";
                    // 只顯示 Historical 和 Prediction, 隱藏 Lower Bound , Condidence Interval
                    if (
                      text.includes("Lower Bound") ||
                      text.includes("Confidence Interval")
                    ) {
                      return false;
                    }
                    return true;
                  }
                }
              },
            },
            scales: {
              x: {
                title: {
                  display: true,
                  text: "Timestamp",
                },
              },
              y: {
                title: {
                  display: true,
                  text: "Temperature (°C)",
                },
                beginAtZero: true,
              },
            },
          }}
        />  
      </div>
      
    );
  };
  
  export default ChartDisplay;