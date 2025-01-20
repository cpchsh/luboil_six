import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import { fetchFeatures } from "../services/api";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
  } from "chart.js";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const FeatureChartsDisplay = () => {
  const [featureData, setFeatureData] = useState([]);
  const [error, setError] = useState(null);

  // 1) 向後端 /api/feature_data 取得特徵重要度
  useEffect(() => {
    fetchFeatures
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch feature_data")
        }
        return res.json();
      })
      .then((data) => {
        setFeatureData(data);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
      });
  }, []);

  if (error) {
    return <p style={{ color: "red" }}>Error: {error} </p>;
  }
  if (!featureData.length) {
    return <p>Loading feature data...</p>;
  }

  // 2) featureData 格式:
  // [
  // { _id..., productName: "R32", feature: "促銷期", importance: 0.0641 },
  // {...}, ...
  // ]
  // 我們要 groupBy productName
  const grouped = groupByProductName(featureData)

  // 動態從 grouped 的 key 取得產品名稱
  const productNames = Object.keys(grouped);

  // 2 columns x 3 rows
  const rows = [];
  for (let i = 0; i < productNames.length; i += 2) {
    const rowProdNames = productNames.slice(i, i + 2);
    rows.push(rowProdNames);
  }

  return (
    <div>
      <h2>特徵重要度 (Feature Importances)</h2>
      {rows.map((rowProdNames, rowIdx) => (
        <div className="row mb-4" key={rowIdx}>
          {rowProdNames.map((pName) => (
            <div className="col-6" key={pName}>
              <FeatureBarChart productName={pName} features={grouped[pName]} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// help function: 依 productName 分組
function groupByProductName(featureData) {
  // return e.g. {R32" [{feature, importance}, ....], R46: [...], ...}
  const result = {};
  for (let item of featureData) {
    const { productName, feature, importance } = item;
    if (!result[productName]) {
      result[productName] = [];
    }
    result[productName].push({
      feature,
      importance,
    });
  }
  return result;
}

// component: 單一產品的特徵BarChart(橫向)
function FeatureBarChart({ productName, features }) {
  // features => [{feature:..., importance:...}, {...}, ...]
  // 以 feature 為 label, importance 為 data
  // 橫向 => chart.js v3+ => options.indexAxis = "y"

  const labels = features.map((f) => f.feature);
  const dataVals = features.map((f) => f.importance);

  const data = {
    labels,
    datasets: [
      {
        label: "Importance",
        data: dataVals,
        backgroundColor: "rgba(75, 192, 192, 0.6)",
      }
    ]
  };

  const options = {
    indexAxis: "y", // 橫向
    responsive: true,
    scales: {
      x: { min: 0, title: {display: true, text: "Importance" }},
      y: { title: { display: true, text: "Feature" }},
    },
    plugins: {
      title: {
        display: true,
        text: productName + " Feature Importance",
      },
      legend: {
        display: false
      },
    },
  };
  return (
    <div>
      <Bar data={data} options={options}/>
    </div>
  );
}

export default FeatureChartsDisplay;