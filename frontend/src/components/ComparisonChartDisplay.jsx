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

const ComparisonChartDisplay = ({
  data = [],
  title,
  predictedData = [],
  backPast = 90,
  fwdPred = 30,
}) => {
  if (!data.length || !predictedData.length) {
    return <p>No data available for comparison</p>;
  }

  // 排序
  const sortedData = [...data].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );
  const sortedPred = [...predictedData].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );

  // 找出「預測資料的最後一筆」時間；若沒有預測資料就直接用整個data
  const lastPastIndex = sortedData.length - 1;
  const lastPastTime = sortedData[lastPastIndex].timestamp;

  // 過去資料：只取[lastPastIndex - backPast + 1, last]
  // (代表最後一筆往前90筆)
  const pastStartIndex = Math.max(lastPastIndex - backPast + 1, 0);
  const limitedData = sortedData.slice(pastStartIndex, lastPastIndex + 1);

  // 【預測資料】改為「下採樣」方式：
  // a. 從lastPastTime 往前 10 天
  // b. 對於每個刻度，在sortedPred中找距離刻度最接近的一筆
  // c. 排序後得到 limitedPred

  // a. 準備時間刻度 (10 個 1 天 => 10 小時)
  const lastPastDate = new Date(lastPastTime);
  const timeInterval = 24 * 60 * 60 * 1000; //一天(毫秒)
  let targetTimes = [];
  for (let i = 0; i < 10; i++) {
    // i = 0 => lastPastTime自己，i=1 => lastPastTime - 1天, i=9 => lastPastTime - 9 天
    const t = new Date(lastPastDate.getTime() - i * timeInterval);
    targetTimes.push(t);
  }

  // b. 對 predictedData 下採樣：對每個目標刻度t, 找 sortedPred 中離 t最近的一筆
  const samplePred = targetTimes
    .map((t) => {
      let best = null;
      let bestDist = Infinity;
      for (let item of sortedPred) {
        const dist = Math.abs(new Date(item.timestamp) - t);
        if (dist < bestDist) {
          bestDist = dist;
          best = item;
        }
      }
      return best; // may be null
    })
    .filter(Boolean); // filter null

  // c. 排序 => 讓時間從舊到新
  const limitedPred = [...samplePred].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );

  // 合併 timestamp 供 X軸顯示
  const allTimestamps = [
    ...limitedData.map((item) => item.timestamp),
    ...limitedPred.map((item) => item.timestamp),
  ];

  const uniqueTimestamps = Array.from(new Set(allTimestamps)).sort(
    (a, b) => new Date(a) - new Date(b)
  );

  // 建立 chartData 的兩條線
  const pastLine = {
    label: "過去的交易數量",
    data: uniqueTimestamps.map((t) => {
      const match = limitedData.find((d) => d.timestamp === t);
      return match ? parseFloat(match.quantity) : null;
    }),
    borderColor: "rgba(255, 0, 0, 1)", //red
    borderWidth: 2,
    fill: false,
    spanGaps: true,
  };

  const predLine = {
    label: "預測的交易數量",
    data: uniqueTimestamps.map((t) => {
      const matches = limitedPred.find((d) => d.timestamp === t);
      return matches
        ? parseFloat(
            matches.reduce((acc, item) => {
              const qty = item.quantity;
              return acc + qty;
            }, 0)
          )
        : null;
    }),
    borderColor: "rgba(0, 0, 255, 1)", // blue
    borderDash: [5, 5], //虛線
    borderWidth: 2,
    fill: false,
    spanGaps: true,
  };

  const chartData = {
    labels: uniqueTimestamps.map((t) => moment(t).format("YYYY-MM-DD")),
    datasets: [pastLine, predLine],
  };

  return (
    <div style={{ width: "100%", height: "400px", marginTop: "30px" }}>
      <h3>{title}</h3>
      <Line
        data={chartData}
        options={{
          maintainAspectRatio: false,
          response: true,
          scales: {
            x: {
              title: { display: true, text: "Timestamp" },
            },
            y: {
              title: { display: true, text: "Quantity(桶)" },
            },
          },
        }}
      />
    </div>
  );
};

export default ComparisonChartDisplay;
