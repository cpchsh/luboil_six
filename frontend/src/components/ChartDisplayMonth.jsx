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
);

/**
 * 將原始資料 (daily/transaction level) 按「年月」彙總。
 * 例如同一 productName, 2024-01-xx 的多筆都合計到 "2024-01" 。
 * 回傳的新資料格式：{ productName, monthStr, quantity }。
 */
function groupByMonth(data) {
  // 用一個 Map< product + month, 累計量 > 來做彙總
  const monthlyMap = new Map();

  data.forEach((item) => {
    const dateObj = new Date(item.timestamp);
    const year = dateObj.getUTCFullYear();
    const month = dateObj.getUTCMonth() + 1; // 0-based → +1
    // 以 "YYYY-MM" 代表該月份
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;

    const prod = item.productName || "Unknown";
    const key = `${prod}___${monthStr}`;

    const qty = parseFloat(item.quantity) || 0;
    if (!monthlyMap.has(key)) {
      monthlyMap.set(key, { productName: prod, monthStr, quantity: qty });
    } else {
      // 累加
      const oldVal = monthlyMap.get(key);
      oldVal.quantity += qty;
      monthlyMap.set(key, oldVal);
    }
  });

  // 回傳 array
  return Array.from(monthlyMap.values());
}

/**
 * 取出 monthStr 的 Date 物件 (採當月1日 0:0:0 UTC 或類似)
 * 方便排序/比較
 */
function parseMonthStr(monthStr) {
  // monthStr = "2024-02"
  const [yyyy, mm] = monthStr.split("-");
  // 以每月1號 0點0分
  return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, 1));
}

/**
 * 若 title 不含 "Predictions" → 顯示過往 10 個月份
 * 若 title 含 "Predictions" → 顯示過往 5 個月份 + 未來預測 5 個月份
 * 
 * @param {Array} data - 歷史資料
 * @param {Array} futureData - 預測資料 (同樣 monthly level, ex "YYYY-MM")
 * @param {String} title 
 * @returns {Object} { limitedData, limitedFuture } (都已彙總為 [ {productName, monthStr, quantity}, ... ])
 */
function prepareMonthlyData(data, futureData, title) {
  const hasPrediction = title.includes("Predictions");

  // 1. 將 data 按月彙總
  const groupedHist = groupByMonth(data);

  // 2. 根據 groupedHist 找到「最後一個月」(最晚的 monthStr)
  if (!groupedHist.length) {
    return { limitedData: [], limitedFuture: [] };
  }
  // 排序
  groupedHist.sort((a, b) => parseMonthStr(a.monthStr) - parseMonthStr(b.monthStr));
  const lastMonth = groupedHist[groupedHist.length - 1].monthStr;

  // 要顯示的歷史月份數
  const monthsToShow = hasPrediction ? 5 : 10;

  // 3. 計算 cutoffMonth => 從 lastMonth 往前 monthsToShow-1
  //   (因 lastMonth 本身也算 1 個)
  function monthOffset(base, offset) {
    // offset為正數往前(更早)
    // 例如 lastMonth=2024-12, offset=1 => 2024-11
    const [yyyy, mm] = base.split("-");
    const dateObj = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, 1));
    dateObj.setUTCMonth(dateObj.getUTCMonth() - offset);

    const newY = dateObj.getUTCFullYear();
    const newM = dateObj.getUTCMonth() + 1;
    return `${newY}-${String(newM).padStart(2, "0")}`;
  }

  const cutoffMonth = monthOffset(lastMonth, monthsToShow - 1); // ex: 10 month => offset=9

  // 過濾 groupedHist，使 monthStr >= cutoffMonth
  // 但需注意 monthStr 也要 <= lastMonth
  // (若資料月分延伸到 lastMonth 之後? 不太可能, 但保險起見.)
  function inRange(m) {
    return parseMonthStr(m) >= parseMonthStr(cutoffMonth)
        && parseMonthStr(m) <= parseMonthStr(lastMonth);
  }

  const limitedData = groupedHist.filter(item => inRange(item.monthStr));

  // 4. 如果有預測
  let limitedFuture = [];
  if (hasPrediction && futureData && futureData.length) {
    // Prophet 會預測未來 5 個月份 => grouped monthly
    // 同樣先 groupByMonth (如果 futureData 也是 daily? 需先 monthly)
    const groupedFut = groupByMonth(futureData);

    // 取 groupedFut 中 monthStr >= (lastMonth+1) && <= (lastMonth+5)
    //   這表示未來 5 個月
    //   只要 parseMonthStr(futMonth) between parseMonthStr(lastMonth)+1 ~ +5
    const futStart = monthOffset(lastMonth, -1); // lastMonth +1
    // ex: if lastMonth=2024-09, futStart=2024-10
    function isFutureRange(m) {
      const mDate = parseMonthStr(m);
      return mDate > parseMonthStr(lastMonth) && mDate <= monthOffset(lastMonth, -5);
    }
    // 不過這邏輯可依自己實際 Prophet 輸出.
    // 這裡直接保留 groupedFut 所有 monthStr >= lastMonth
    // 之後 chart 會排序. 
    // 也可明確只取 5個月.

    groupedFut.sort((a, b) => parseMonthStr(a.monthStr) - parseMonthStr(b.monthStr));
    // cut off lastMonth+1 to lastMonth+5
    // for i in 1..5 => monthOffset( lastMonth, -i ), negative offset => future
    // 這可能有點繞, 也可以 simpler approach: just keep all future

    limitedFuture = groupedFut;  // or do a filter condition if you only want 5 months
  }

  return { limitedData, limitedFuture };
}

const ChartDisplayMonth = ({ data = [], title = "", futureData = [] }) => {
  if (!data.length) {
    return <p>No data available for {title}</p>;
  }

  // 準備彙總後資料
  const { limitedData, limitedFuture } = prepareMonthlyData(data, futureData, title);
  if (!limitedData.length) {
    return <p>No monthly data available for {title}</p>;
  }

  // 收集所有 monthStr
  const allMonthStrs = [
    ...limitedData.map((d) => d.monthStr),
    ...limitedFuture.map((d) => d.monthStr),
  ];
  const uniqueMonthStrs = Array.from(new Set(allMonthStrs)).sort(
    (a, b) => parseMonthStr(a) - parseMonthStr(b)
  );

  // 收集所有 productName
  const products = Array.from(
    new Set([
      ...limitedData.map((item) => item.productName),
      ...limitedFuture.map((item) => item.productName),
    ])
  );

  // 顏色
  const predefinedColors = [
    "rgba(231, 76, 60, 1)",   // red
    "rgba(46, 204, 113, 1)", // green
    "rgba(52, 152, 219, 1)", // blue
    "rgba(241, 196, 15, 1)", // yellow
    "rgba(155, 89, 182, 1)", // purple
    "rgba(243, 156, 18, 1)", // orange
  ];

  // 建立 dataset
  const datasets = products.flatMap((product, index) => {
    const color = predefinedColors[index % predefinedColors.length];

    // historical
    const histDataset = {
      label: `${product} (Historical)`,
      data: uniqueMonthStrs.map((m) => {
        // find in limitedData (monthStr===m & productName===product)
        const match = limitedData.find(
          (d) => d.monthStr === m && d.productName === product
        );
        return match ? match.quantity : null;
      }),
      borderColor: color,
      spanGaps: true,
      borderWidth: 2,
      fill: false
    };

    // 如果沒有預測 => 只回傳 historical
    if (!title.includes("Predictions") || !limitedFuture.length) {
      return [histDataset];
    }

    // future
    const predDataset = {
      label: `${product} (Prediction)`,
      data: uniqueMonthStrs.map((m) => {
        const match = limitedFuture.find(
          (d) => d.monthStr === m && d.productName === product
        );
        return match ? match.quantity : null;
      }),
      borderColor: color,
      borderDash: [5, 5],
      spanGaps: true,
      borderWidth: 2,
      fill: false
    };

    return [histDataset, predDataset];
  });

  const chartData = {
    labels: uniqueMonthStrs, // ["2024-06","2024-07",...]
    datasets: datasets.flat()
  };

  // Chart options
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
          text: "Month (YYYY-MM)"
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

  // helper: parse "YYYY-MM" → Date
  function parseMonthStr(str) {
    const [yyyy, mm] = str.split("-");
    return new Date(Number(yyyy), Number(mm) - 1, 1).getTime();
  }

  return (
    <div style={{ width: "100%", height: "600px" }}>
      <h2>{title}</h2>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default ChartDisplayMonth;