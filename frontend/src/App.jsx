import { useEffect, useState } from "react";
import FilterControls from "./components/FilterControls";
import ChartDisplay from "./components/ChartDisplay";
//import { fetchTemperatureData, fetchFuturePredictions } from "./services/api";
import { fetchLuboilData, fetchFuturePredictions } from "./services/api";



const App = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [futureData, setFutureData] = useState([]); //預測數據
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [selectedWarehouse, setSelectedWarehouse] = useState(["All"]);
  const [error, setError] = useState(null);
  
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

  // 根據user選擇來過濾資料
  useEffect(() => {
    const filtered= data.filter((item) => {
      const date = new Date(item.timestamp);
      const inDateRange =
        (!dateRange.start || date >= new Date(dateRange.start)) &&
        (!dateRange.end || date <= new Date(dateRange.end));

      const matchesWarehouse =
        selectedWarehouse.includes("All") || 
        selectedWarehouse.includes(item.location);
      return inDateRange && matchesWarehouse;
    });
    setFilteredData(filtered)
  }, [data, dateRange, selectedWarehouse]);

  
  if (error) {
    return <p style={{ color: "red" }}>Error: {error}</p>;
  }
  
  return (
    <div className="container-fluid">
      <h1>Luboil Data Visualization</h1>

      {/* 上方圖表:歷史數據(可篩選) */}
      <FilterControls
        data={data}
        dateRange={dateRange}
        selectedWarehouses={selectedWarehouse}
        setDateRange={setDateRange}
        setSelectedWarehouses={setSelectedWarehouse}
      />
      {/* 使用 Bootstrap Row + 兩個 Col */}
      <div className="row">
        <div className="col-6">
          <ChartDisplay
            data={filteredData} 
            title="Filtered Historical Data"
          />
        </div>
        <div className="col-6">
          <ChartDisplay
            data={filteredData} 
            title="Filtered Historical Data2"
          />
        </div>

      
      {/*坐下邊： Historical + Predictions */}
        <div className="col-6">
          <ChartDisplay 
            data={data} 
            futureData={futureData} 
            title="Historical + Predictions (All Products)"
          />
        </div>
      </div>
    </div>
  );
}

export default App;