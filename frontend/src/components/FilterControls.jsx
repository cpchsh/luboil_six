import Select from "react-select";
const FilterControls = ({
  data,
  dateRange,
  selectedWarehouses,
  setDateRange,
  setSelectedWarehouses,
}) => {
  // Generate warehouse options
  const warehouseOptions = [
    { value: "All", label: "All"},
    ...[... new Set(data.map((item) => item.location))].map((warehouse) => ({
      value: warehouse,
      label: warehouse,
    })),
  ];

  // Handle date input changes
  const handleDateChange = (e) => {
    setDateRange({ ...dateRange, [e.target.name]: e.target.value });
  }
  return (
    <div style={{ marginBottom: "20px" }}>
      <label>
        Start Date:
        <input
          type="date"
          name="start"
          value={dateRange.start}
          onChange={handleDateChange}
        />
      </label>
      <label>
        End Date:
        <input
          type="date"
          name="end"
          value={dateRange.end}
          onChange={handleDateChange}
        />
      </label>
      <label>
        Warehouse:
        <Select
          isMulti
          value={selectedWarehouses.map((value) => ({
            value,
            label: value,
          }))}
          onChange={(selectedOptions) => {
            const values = selectedOptions.map((option) => option.value);
            setSelectedWarehouses(values.includes("All") ? ["All"] : values);
          }}
          options={warehouseOptions}
        />
      </label>
    </div>
  );
};

export default FilterControls