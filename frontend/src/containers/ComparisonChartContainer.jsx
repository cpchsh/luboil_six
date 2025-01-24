import React, { useEffect, useState } from "react";
import ComparisonChartDisplay from "../components/ComparisonChartDisplay";
import { fetchLuboilData, fetchFuturePredictions } from "../services/api";

const ComparisonChartContainer = () => {
  const [data, setData] = useState([]);
  const [futureData, setFutureData] = useState([]);

  useEffect(() => {
    // 抓取歷史數據
    fetchFuturePredictions()
      .then((data) => {
        setFutureData(data);
      })
      .catch((err) => console.error("Fetch data error:", err));
  });

  useEffect(() => {
    // 抓取歷史數據
    fetchLuboilData()
      .then((data) => {
        setData(data);
      })
      .catch((err) => console.error("Fetch data error:", err));
  });


  return (
    <div className="mt-3">
        <div className="row">
            <div className="col-4 mt-5">
                <ComparisonChartDisplay
                  title="比較：R32"
                  data={data.filter(d => d.productName === "R32")}
                  predictedData={futureData.filter(d => d.productName === "R32")}
                  backPast={20}
                />
            </div>
            <div className="col-4 mt-5">
                <ComparisonChartDisplay
                  title="比較：R46"
                  data={data.filter(d => d.productName === "R46")}
                  predictedData={futureData.filter(d => d.productName === "R46")}
                  backPast={20}
                />
            </div>
            <div className="col-4 mt-5">
                <ComparisonChartDisplay
                  title="比較：R68"
                  data={data.filter(d => d.productName === "R68")}
                  predictedData={futureData.filter(d => d.productName === "R68")}
                  backPast={20}
                />
            </div>
            <div className="col-4 mt-5">
                <ComparisonChartDisplay
                  title="比較：32AWS"
                  data={data.filter(d => d.productName === "32AWS")}
                  predictedData={futureData.filter(d => d.productName === "32AWS")}
                  backPast={20}
                />
            </div>
            <div className="col-4 mt-5">
                <ComparisonChartDisplay
                  title="比較：46AWS"
                  data={data.filter(d => d.productName === "46AWS")}
                  predictedData={futureData.filter(d => d.productName === "46AWS")}
                  backPast={20}
                />
            </div>
            <div className="col-4 mt-5">
                <ComparisonChartDisplay
                  title="比較：68AWS"
                  data={data.filter(d => d.productName === "68AWS")}
                  predictedData={futureData.filter(d => d.productName === "68AWS")}
                  backPast={20}
                />
            </div>

        </div>
    </div>
  );
};


export default ComparisonChartContainer;
