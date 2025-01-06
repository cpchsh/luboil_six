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
 * 將「歷史資料」（每日層級）按「年月」彙總。
 * ※ 未來資料若已是一個月一筆，不需要再加總。
 * 回傳格式: [ { productName, monthStr, quantity }, ... ]
 */
function groupByMonth(data) {
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
      const oldVal = monthlyMap.get(key);
      oldVal.quantity += qty;
      monthlyMap.set(key, oldVal);
    }
  });

  return Array.from(monthlyMap.values());
}

/**
 * 取出 "YYYY-MM" → Date 物件 (當月1日 0:0:0)，用於排序/比較
 */
function parseMonthStr(monthStr) {
  const [yyyy, mm] = monthStr.split("-");
  return new Date(Number(yyyy), Number(mm) - 1, 1).getTime();
}

/**
 * 若 title 不含 "Predictions" → 顯示過往 10 個月份
 * 若 title 含 "Predictions" → 顯示過往 5 個月份 + 額外顯示未來預測 (5個月)
 */
function prepareMonthlyData(data, futureData, title) {
  const hasPrediction = title.includes("Predictions");

  // 1) 先把 "歷史資料" (每日多筆) 彙總成「月」層級
  const groupedHist = groupByMonth(data);

  // 沒有歷史資料
  if (!groupedHist.length) {
    return { limitedData: [], limitedFuture: [] };
  }

  // 依月份排序
  groupedHist.sort((a, b) => parseMonthStr(a.monthStr) - parseMonthStr(b.monthStr));

  // 找到歷史資料最後一個月
  const lastMonth = groupedHist[groupedHist.length - 1].monthStr;

  // 若無 Predictions => 顯示 10 個月；若有 => 顯示 5 個月
  const monthsToShow = hasPrediction ? 5 : 10;

  // monthOffset: 從某個 "YYYY-MM" 向前 offset 個月
  function monthOffset(base, offset) {
    const [yyyy, mm] = base.split("-");
    const dateObj = new Date(Date.UTC(+yyyy, +mm - 1, 1));
    dateObj.setUTCMonth(dateObj.getUTCMonth() - offset);

    const newY = dateObj.getUTCFullYear();
    const newM = dateObj.getUTCMonth() + 1;
    return `${newY}-${String(newM).padStart(2, "0")}`;
  }

  // cutoff (最後一個月 - (monthsToShow-1))
  const cutoffMonth = monthOffset(lastMonth, monthsToShow - 1);

  // 過濾 groupedHist，使 monthStr >= cutoffMonth && <= lastMonth
  function inRange(m) {
    return parseMonthStr(m) >= parseMonthStr(cutoffMonth)
        && parseMonthStr(m) <= parseMonthStr(lastMonth);
  }
  const limitedData = groupedHist.filter(item => inRange(item.monthStr));

  // 2) 如果有預測資料 => Prophet 已是一個月1筆，不需再 group
  let limitedFuture = [];
  if (hasPrediction && futureData && futureData.length) {
    // 直接假設 futureData 已是 { productName, timestamp, quantity }
    // 但要將 timestamp => "YYYY-MM"
    // or Prophet 也可能已直接給 monthStr
    // 如果 Prophet 輸出 timestamp = "2024-10-01T00:00:00Z" => 我們轉成 monthStr 以便同樣比較
    const futArray = futureData.map((f) => {
      const d = new Date(f.timestamp);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth() + 1;
      const mStr = `${y}-${String(m).padStart(2, '0')}`;
      return {
        productName: f.productName,
        monthStr: mStr,
        quantity: parseFloat(f.quantity) || 0,        //yhat
        lower_bound: parseFloat(f.lower_bound) || 0,  //yhat_lower
        upper_bound: parseFloat(f.upper_bound) || 0,  //yhat_upper
      };
    });

    // 排序
    futArray.sort((a, b) => parseMonthStr(a.monthStr) - parseMonthStr(b.monthStr));
    // 只顯示未來 5 個月(或更多)? => 視您 Prophet 輸出
    // 這邊可直接保留全部 futArray
    limitedFuture = futArray;
  }

  return { limitedData, limitedFuture };
}

const ChartDisplayMonth = ({ data = [], title = "", futureData = [], colorMap }) => {
  if (!data.length) {
    return <p>No data available for {title}</p>;
  }

  // 1) 預處理 -> limitedData(歷史), limitedFuture(預測)
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

  // 建立 dataset
  const datasets = products.flatMap((product) => {
    // 用 colorMap.get(product) 取得顏色
    const productColor = colorMap?.get(product) || "rgba(0,0,0,1)";

    //[A] Historical Dataset
    const historicalDataset = {
      label: `${product} (Historical)`,
      data: uniqueMonthStrs.map((m) => {
        // 找該月 + 該 productName
        const match = limitedData.find(
          (d) => d.monthStr === m && d.productName === product
        );
        return match ? match.quantity : null;
      }),
      borderColor: productColor,
      spanGaps: true,
      borderWidth: 2,
      fill: false
    };

    // 如果不含"Predictions" or 未來資料空，則只回傳歷史
    if (!title.includes("Predictions") || !limitedFuture.length) {
      return [historicalDataset];
    }
    // [B] lower Bound
    const lowerBoundData = uniqueMonthStrs.map((m) => {
      const lbMatch = limitedFuture.find(
        (f) => f.monthStr === m && f.productName === product
      )?.lower_bound;
      return lbMatch !== undefined ? lbMatch : null;
    });
    const lowerBoundDataset = {
      label: `${product} (Lower Bound)`,
      data: lowerBoundData,
      borderColor: "rgba(0,0,0,0)", //不顯示線
      pointRadius: 0,
      spanGaps: true,
      fill: false
    };

    // [C] (Upper Bound)
    const upperBoundData = uniqueMonthStrs.map((m) => {
      const ubMatch = limitedFuture.find(
        (f) => f.monthStr === m && f.productName === product
      )?.upper_bound;
      return ubMatch !== undefined ? ubMatch : null;
    });
    const upperBoundDataset = {
      label: `${product} (Confidence Interval)`,
      data: upperBoundData,
      borderColor: 'rgba(0,0,0,0)',
      backgroundColor: productColor.replace('1)', '0.2)'), //半透明填充
      pointRadius: 0,
      borderWidth: 0,
      spanGaps: true,
      fill: "-1" // 與下界形成區域
    };


    // [D] Prediction(虛線) 
    const predictionDataset = {
      label: `${product} (Prediction)`,
      data: uniqueMonthStrs.map((m) => {
        const match = limitedFuture.find(
          (f) => f.monthStr === m && f.productName === product
        );
        return match ? match.quantity : null;
      }),
      borderColor: productColor,
      borderDash: [5, 5],
      spanGaps: true,
      borderWidth: 2,
      fill: false
    };

    return [
      historicalDataset,  // 1) Historical
      lowerBoundDataset,  // 2) LowerBound
      upperBoundDataset,  // 3) UpperBound
      predictionDataset   // 4) Prediction
    ];
  });

  const chartData = {
    labels: uniqueMonthStrs, // e.g. ["2024-06","2024-07",...]
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

  return (
    <div style={{ width: "100%", height: "600px" }}>
      <h2>{title}</h2>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default ChartDisplayMonth;
