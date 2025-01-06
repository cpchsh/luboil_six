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

/**
 * 根據「最後一筆」的timestamp，往前days天做篩選
 * @param {Array}  data - 歷史資料 (每筆至少含timestamp)
 * @param {Number} days - 要顯示最近幾天
 * @returns {Array} 過濾後的資料
 */

const filterByDays = (data, days) => {
    if (!data.length) return data;
    const sorted = [...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const lastTimestamp = new Date(sorted[sorted.length - 1].timestamp);

    // cutoff = 最後一筆日期 往前 days 天
    const cutoff = new Date(lastTimestamp.getTime() - days * 24 * 60 * 60 * 1000);
    // 只保留 timestamp >= cutoff 的資料
    return sorted.filter(d => new Date(d.timestamp) >= cutoff);
}


const ChartDisplay = ({ data, title, futureData = [], colorMap }) => {
    if (!data.length) {
      return <p>No data available for {title}</p>;
    }

    // 依title 判斷要顯示幾天
    // - 若 title 含 "Predictions" => 只顯示近15天
    // - 否則 => 近30天
    const daysToShow = title.includes("Predictions") ? 15: 90;

    // 1) 過濾「最近N天」歷史資料
    const limitedData = filterByDays(data, daysToShow);
    

    // 將歷史及未來的timestamp全部收集起來
    const allTimestamps = [
      ...limitedData.map((item) => item.timestamp),
      ...(futureData ? futureData.map((item) => item.timestamp) : [])
    ]

    const timestamps = Array.from(new Set(allTimestamps)).sort(
      (a, b) => new Date(a) - new Date(b)
    );

    // 3)收集所有產品名稱
    const products = Array.from(
      new Set([
        ...limitedData.map((item) => item.productName),
        ...(futureData ? futureData.map((item) => item.productName) : []),
      ])
    );

    // const predefinedColors = [
    //     "rgba(231, 76, 60, 1)",    // 紅色 (Red)
    //     "rgba(46, 204, 113, 1)",   // 綠色 (Green)
    //     "rgba(52, 152, 219, 1)",   // 藍色 (Blue)
    //     "rgba(241, 196, 15, 1)",   // 黃色 (Yellow)
    //     "rgba(155, 89, 182, 1)",   // 紫色 (Purple)
    //     "rgba(243, 156, 18, 1)",   // 橙色 (Orange)
    // ]

    // 4) 建立 datasets 
    const datasets = products.flatMap((product) => {

      // 用 colorMap.get(product) 取得顏色
      const productColor = colorMap?.get(product) || "rgba(0,0,0,1)";//predefinedColors[index % predefinedColors.length];
      
      // =========================== Historical Dataset===========================
      const historicalDataset = {
        label: `${product} (Historical)`,
        data: timestamps.map((timestamp) => {
          // 找出所有 (productName===product && timestamp===timestamp) 的紀錄
          const matches = data.filter(
            (item) => item.productName === product && item.timestamp === timestamp
          );
          if (matches.length === 0) return null;
          
          // 將所有 matches 的 quantity 加總
          const totalQuantity = matches.reduce((acc, item) => {
            const qty = parseFloat(item.quantity) || 0;
            return acc + qty;
          }, 0);

          return totalQuantity;
        }),
        borderColor: productColor,
        spanGaps: true, // 啟用 gap 自動連接
        borderWidth: 2,
        fill: false //不填滿
      };

      // 若沒有 futureData, 就只回傳 historical
      if (!futureData.length) {
        return [historicalDataset];
      }

      // =======================Prediction Dataset========================
      const predictionDataset = {
            label: `${product} (Prediction)`,
            data: timestamps.map((timestamp) => {
              const match = futureData.find(
                (item) => item.productName === product && item.timestamp === timestamp
              );
              return match ? parseFloat(match.quantity) : null;
            }),
            borderColor: productColor,
            borderDash: [5, 5], //虛線模式
            spanGaps: true,
            borderWidth: 2,
            fill: false
          }
      // 下界 (Lower Bound)
      const lowerBoundData =  timestamps.map((timestamp) =>{
        const lbMatch = futureData.find(
          (item) => item.productName === product && item.timestamp === timestamp 
        )?.lower_bound;
        return lbMatch !== undefined ? parseFloat(lbMatch) : null;
      });
      
      const lowerBoundDataset = {
        label: `${product} (Lower Bound)`,
        data: lowerBoundData,
        borderColor: 'rgba(0,0,0,0)', // 不顯示線，透明邊線
        pointRadius: 0,
        spanGaps: true,
        fill: false
      };

      // 上界 (Upper Bound) - 將fill指向前一個資料集(即 lowerBoundDataset)
      const upperBoundData = timestamps.map((timestamp) => {
        const ubMatch = futureData.find(
          (item) => item.productName === product && item.timestamp === timestamp 
        )?.upper_bound;
        return ubMatch !== undefined ? parseFloat(ubMatch) : null;
      })

      const upperBoundDataset = {
        label: `${product} (Confidence Interval)`,
        data: upperBoundData,
        borderColor: 'rgba(0,0,0,0)', //不顯示線
        backgroundColor: productColor.replace("1)", "0.2)"), //半透明背景
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

    // 5) 組裝 chartData
    const chartData = {
      labels: timestamps.map((timestamp) => 
        moment(timestamp).format("YYYY-MM-DD")// HH:mm")
      ),
      datasets: datasets.flat().filter(Boolean), //過濾掉 null
    };

    // 6) Chart options
    const options = {
      maintainAspectRatio: false,
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: "top"
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Timestamp"
          }
        },
        y: {
          title: {
            display: true,
            text: "Quantity(桶)"
          },
          beginAtZero: true
        }
      }
    };

    return (
      <div style={{ width: "100%", height: "600px"}}>
        <h2>{title}</h2>
        <Line data={chartData} options={options} />
      </div>
    );
  };

  export default ChartDisplay;
      

    