import { useEffect, useState } from "react";
import FilterControls from "./components/FilterControls";
import ChartDisplay from "./components/ChartDisplay";
import ChartDisplayMonth from "./components/ChartDisplayMonth";
//import { fetchTemperatureData, fetchFuturePredictions } from "./services/api";
import { fetchLuboilData, fetchFuturePredictions, fetchFutureMonthlyPredictions } from "./services/api";

const App = () => {
  const [data, setData] = useState([]);
  const [futureData, setFutureData] = useState([]); //預測數據
  const [futureMonthly, setFutureMonthly] = useState([]) //按月預測數據
  // 2. 左圖的篩選條件 & 篩選後資料
  const [leftDateRange, setLeftDateRange] = useState({ start: "", end: "" });
  const [leftWarehouse, setLeftWarehouse] = useState(["All"]);
  const [leftFilteredData, setLeftFilteredData] = useState([]);

  // 3. 右圖的篩選條件 & 篩選後資料
  const [rightDateRange, setRightDateRange] = useState({ start: "", end: "" });
  const [rightWarehouse, setRightWarehouse] = useState(["All"]);
  const [rightFilteredData, setRightFilteredData] = useState([]);

  // 4. 右圖的篩選條件 & 篩選後資料
  const [monthDateRange, setMonthDateRange] = useState({ start: "", end: "" });
  const [monthWarehouse, setMonthWarehouse] = useState(["All"]);
  const [monthFilteredData, setMonthFilteredData] = useState([]);
  const [error, setError] = useState(null);

  // 當初次進入時獲取歷史資料
  useEffect(() => {
    fetchLuboilData()
      .then((fetchedData) => setData(fetchedData))
      .catch((error) => {
        setError(error.message);
      });
  }, []);

  useEffect(() => {
    fetchFuturePredictions()
      .then((predictions) => setFutureData(predictions))
      .catch((error) => {
        setError(error.message);
      });
  }, []);

  useEffect(() => {
    fetchFutureMonthlyPredictions()
      .then((predictions) => setFutureMonthly(predictions))
      .catch((error) => {
        setError(error.message);
      });
  }, []);

  // 左圖：依 leftDateRange, leftWarehouse 過濾
  useEffect(() => {
    const filtered = data.filter((item) => {
      const date = new Date(item.timestamp);
      const inDateRange =
        (!leftDateRange.start || date >= new Date(leftDateRange.start)) &&
        (!leftDateRange.end || date <= new Date(leftDateRange.end));

      const matchesWarehouse =
        leftWarehouse.includes("All") || leftWarehouse.includes(item.location);
      return inDateRange && matchesWarehouse;
    });
    setLeftFilteredData(filtered);
  }, [data, leftDateRange, leftWarehouse]);

  // 右圖：依 rightDateRange, rightWarehouse 過濾
  useEffect(() => {
    const filtered = data.filter((item) => {
      const date = new Date(item.timestamp);
      const inDateRange =
        (!rightDateRange.start || date >= new Date(rightDateRange.start)) &&
        (!rightDateRange.end || date <= new Date(rightDateRange.end));
      const matchesWarehouse =
        rightWarehouse.includes("All") ||
        rightWarehouse.includes(item.location);

      return inDateRange && matchesWarehouse;
    });
    setRightFilteredData(filtered);
  }, [data, rightDateRange, rightWarehouse]);

  // 月資料圖
  useEffect(() => {
    const filtered = data.filter((item) => {
      const date = new Date(item.timestamp);
      const inDateRange =
        (!monthDateRange.start || date >= new Date(monthDateRange.start)) &&
        (!monthDateRange.end || date <= new Date(monthDateRange.end));
      const matchesWarehouse =
        monthWarehouse.includes("All") ||
        monthWarehouse.includes(item.location);

      return inDateRange && matchesWarehouse;
    });
    setMonthFilteredData(filtered);
  }, [data, monthDateRange, monthWarehouse]);

  if (error) {
    return <p style={{ color: "red" }}>Error: {error}</p>;
  }

  return (
    <div className="container-fluid">
      <h1 className="text-center">Luboil Data Visualization</h1>

      <div className="row">
        {/* 左圖：col-6 */}
        <div className="col-6">
          {/*左圖篩選*/}
          <FilterControls
            data={data}
            dateRange={leftDateRange}
            selectedWarehouses={leftWarehouse}
            setDateRange={setLeftDateRange}
            setSelectedWarehouses={setLeftWarehouse}
          />
          {/*左圖的 Chart */}
          <ChartDisplay
            data={leftFilteredData}
            title="Left Filtered Historical Data"
          />
        </div>

        {/* 右圖：col-6 */}
        <div className="col-6">
          {/* 右圖篩選 */}
          <FilterControls
            data={data}
            dateRange={rightDateRange}
            selectedWarehouses={rightWarehouse}
            setDateRange={setRightDateRange}
            setSelectedWarehouses={setRightWarehouse}
          />
          <ChartDisplay
            data={rightFilteredData}
            title="Right Filtered Historical Data2"
          />
        </div>
      </div>
      <div className="row mt-5">
        {/*左下邊： Historical + Predictions */}
        <div className="col-6">
          <ChartDisplay
            data={data}
            futureData={futureData}
            title="Historical + Predictions (All Products)"
          />
        </div>
        <div className="col-6">
          {/*左圖篩選*/}
          <FilterControls
            data={data}
            dateRange={monthDateRange}
            selectedWarehouses={monthWarehouse}
            setDateRange={setMonthDateRange}
            setSelectedWarehouses={setMonthWarehouse}
          />
          {/*左圖的 Chart */}
          <ChartDisplayMonth
            data={monthFilteredData}
            title="Monthly Historical Data"
          />
        </div>
      </div>
      <div className="row mt-5">
        {/*左左下下邊： Historical + Predictions Monthly */}
        <div className="col-6">
          <ChartDisplayMonth
            data={data}
            futureData={futureMonthly}
            title="Historical + Predictions Monthly(All Products)"
          />
        </div>
      </div>
    </div>
  );
};

export default App;