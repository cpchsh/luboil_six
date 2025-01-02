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
  Filler,
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
 * @param {Array} data - 歷史資料陣列，每筆至少有 {productName, timestamp, quantity} 
 * @param {Array} futureData - 預測資料陣列，每筆至少有 {productName, timestamp, quantity, lower_bound, upper_bound}
 * @param {string} title - 圖表標題
 * @param {number} maxHistory - 要顯示多少筆歷史 (預設102)
 * @param {Map} colorMap - productName -> color 映射 (若沒有就用黑色)
 */
const ChartDisplay = ({ 
  data = [], 
  futureData = [],
  title = "Chart",  
  maxHistory = 102, //預設顯示最後 102 筆歷史
  colorMap          // 父層傳入的 productName -> color 映射
 }) => {
    if (!data.length) {
      return <p>No data available for {title}</p>;
    }
    
    // 1) 按 timestamp 排序，再取最後 maxHistory 筆
    const sortByTime = [...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const limitedData = sortByTime.slice(Math.max(0, sortByTime.length - maxHistory));

    // 2) 收集全部 timestamps (含未來)
    const allTimestamps = [
      ...limitedData.map((item) => item.timestamp),
      ...(futureData || []).map((item) => item.timestamp),
    ];

    // 去重、排序
    const timestamps = Array.from(new Set(allTimestamps)).sort(
      (a, b) => new Date(a) - new Date(b)
    );

    // 3) 收集所有產品名稱
    const products = Array.from(new Set([
        ...limitedData.map((d) => d.productName),
        ...futureData.map((d) => d.productName)
    ]));

    // 4) 建立datasets
    const datasets = products.flatMap((product, index) => {
      // 如果 colorMap 有提供，就用 colorMap，否則預設黑色
      const productColor = colorMap?.get(product) || "rgba(0,0,0,1)";

      // =============== Historical ==================
      const historicalDataset = {
        label: `${product} (Historical)`,
        data: timestamps.map((ts) => {
          // 找出所有 (productName===product && timestamp===timestamp) 的紀錄
          const matches = limitedData.filter(
            (item) => item.productName === product && item.timestamp === ts
          );
          if (!matches.length) return null;
          
          // 將所有 matches 的 quantity 加總
          const totalQty = matches.reduce((acc, item) => acc +(parseFloat(item.quantity) || 0), 0);
          return totalQty;
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

      // ================ Prediction ===================
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
      const lowerBoundData =  timestamps.map((ts) =>{
        const lbMatch = futureData.filter(
          (item) => item.productName === product && item.timestamp === ts
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
        backgroundColor: productColor.replace("1)", "0.2)"), // 半透明
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

    // 5) 建立 chartData
    const chartData = {
      labels: timestamps.map((timestamp) => moment(timestamp).format("YYYY-MM-DD HH:mm")),
      datasets: datasets.flat(),
    };
      
    // 6) Chart options
    const options = {
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: {
            filter: (legendItem) => {
              const txt = legendItem.text || "";
              // 只顯示 Historical / Prediction
              if (txt.includes("Lower Bound") || txt.includes("Confidence Interval")){
                return false;
              } 
              return true;
            },
          },
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
          title:{
            display: true,
            text: "Quantity(桶)"
          },
          beginAtZero: true,
        },
      },
    };
    return (
      <div>
        <h2>{title}</h2>
        <Line data={chartData} options={options}/> 
      </div>
      
    );
  };
  
  export default ChartDisplay;