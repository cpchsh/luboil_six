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
);

const ChartDisplay = ({
  data = [],
  futureData = [],
  title = "Chart",
  maxHistory = 102,
  colorMap
}) => {
  // 若歷史資料完全沒有，就顯示提示
  if (!data.length) {
    return <p>No data available for {title}</p>;
  }

  // 1) 排序 & 限制歷史資料筆數
  const sortedData = [...data].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );
  const limitedData = sortedData.slice(
    Math.max(0, sortedData.length - maxHistory)
  );

  // 2) 收集全部 timestamps (含歷史 & 未來)
  const allTimestamps = [
    ...limitedData.map((item) => item.timestamp),
    ...futureData.map((item) => item.timestamp),
  ];
  // 去重、排序
  const timestamps = Array.from(new Set(allTimestamps)).sort(
    (a, b) => new Date(a) - new Date(b)
  );

  // 3) 收集所有產品名稱 (歷史 + 未來)
  const products = Array.from(
    new Set([
      ...limitedData.map((d) => d.productName),
      ...futureData.map((d) => d.productName),
    ])
  );

  // 4) 建立 Dataset
  const datasets = products.flatMap((product) => {
    const productColor = colorMap?.get(product) || "rgba(0,0,0,1)";

    // === A. Historical ===
    const historicalDataset = {
      label: `${product} (Historical)`,
      data: timestamps.map((ts) => {
        // 找出同一時間多筆 -> 加總
        const matches = limitedData.filter(
          (item) => item.productName === product && item.timestamp === ts
        );
        if (!matches.length) return null;

        const totalQty = matches.reduce(
          (acc, item) => acc + (parseFloat(item.quantity) || 0),
          0
        );
        return totalQty;
      }),
      borderColor: productColor,
      spanGaps: true,
      borderWidth: 2,
      fill: false,
    };

    // 若沒有未來資料，直接返回
    if (!futureData.length) {
      return [historicalDataset];
    }

    // === B. Prediction (只會一筆 -> .find) ===
    const predictionDataset = {
      label: `${product} (Prediction)`,
      data: timestamps.map((ts) => {
        // 只找一筆
        const match = futureData.find(
          (item) => item.productName === product && item.timestamp === ts
        );
        return match ? parseFloat(match.quantity) : null;
      }),
      borderColor: productColor,
      borderDash: [5, 5],
      spanGaps: true,
      borderWidth: 2,
      fill: false,
    };

    // === C. 下界 (Lower Bound) - 也只會一筆 => find
    const lowerBoundData = timestamps.map((ts) => {
      const lbMatch = futureData.find(
        (it) => it.productName === product && it.timestamp === ts
      )?.lower_bound;
      return lbMatch !== undefined ? parseFloat(lbMatch) : null;
    });
    const lowerBoundDataset = {
      label: `${product} (Lower Bound)`,
      data: lowerBoundData,
      borderColor: "rgba(0,0,0,0)",
      pointRadius: 0,
      spanGaps: true,
      fill: false,
    };

    // === D. 上界 (Upper Bound) - 也只會一筆 => find
    const upperBoundData = timestamps.map((ts) => {
      const ubMatch = futureData.find(
        (it) => it.productName === product && it.timestamp === ts
      )?.upper_bound;
      return ubMatch !== undefined ? parseFloat(ubMatch) : null;
    });
    const upperBoundDataset = {
      label: `${product} (Confidence Interval)`,
      data: upperBoundData,
      borderColor: "rgba(0,0,0,0)",
      backgroundColor: productColor.replace("1)", "0.2)"), 
      pointRadius: 0,
      borderWidth: 0,
      spanGaps: true,
      fill: "-1",
    };

    return [historicalDataset, lowerBoundDataset, upperBoundDataset, predictionDataset];
  });

  // 5) 組裝 chartData
  const chartData = {
    labels: timestamps.map((ts) => moment(ts).format("YYYY-MM-DD HH:mm")),
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
            if (txt.includes("Lower Bound") || txt.includes("Confidence Interval")) {
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
        title: {
          display: true,
          text: "Quantity(桶)",
        },
        beginAtZero: true,
        // 若 Prophet 可能出現負值而您不想看到，可加 min: 0
      },
    },
  };

  return (
    <div>
      <h2>{title}</h2>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default ChartDisplay;
