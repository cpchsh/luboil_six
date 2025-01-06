import Select from "react-select";
const FilterControls = ({
  data,
  dateRange,
  selectedProducts,
  setDateRange,
  setSelectedProducts,
}) => {
  // Generate product options
  const productOptions = [
    { value: "All", label: "All"},
    ...[... new Set(data.map((item) => item.productName))].map((product) => ({
      value: product,
      label: product,
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
        Product:
        <Select
          isMulti
          value={selectedProducts.map((value) => ({
            value,
            label: value,
          }))}
          onChange={(selectedOptions) => {
            const values = selectedOptions.map((option) => option.value);
            setSelectedProducts(values.includes("All") ? ["All"] : values);
          }}
          options={productOptions}
        />
      </label>
    </div>
  );
};

export default FilterControls