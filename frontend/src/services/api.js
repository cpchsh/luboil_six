import axios from "axios";

export const fetchTemperatureData = async () => {
    const API_BASE_URL = import.meta.env.VITE_API_URL;
    try {
        const response = await axios.get(API_BASE_URL);
        return response.data; // Axios 的返回數據在 data 屬性中
    } catch (error) {
        if (error.response) {
            // 服務器返回了非 2xx 狀態碼
            throw new Error(`HTTP error! Status: ${error.response.status}`);
        } else if (error.request) {
            // 請求已發送但未收到回應
            throw new Error("No response received from server.");
        } else {
            // 發生其他錯誤
            throw new Error(`Error in making request: ${error.message}`);
        }
    }
}

export const fetchFuturePredictions = async () => {
    const API_BASE_URL = import.meta.env.VITE_API_URL_FUTURE;
    try {
        const response = await axios.get(API_BASE_URL);
        return response.data; // Axios 的返回數據在 data 屬性中
    } catch (error) {
        if (error.response) {
            // 服務器返回了非 2xx 狀態碼
            throw new Error(`HTTP error! Status: ${error.response.status}`);
        } else if (error.request) {
            // 請求已發送但未收到回應
            throw new Error("No response received from server.");
        } else {
            // 發生其他錯誤
            throw new Error(`Error in making request: ${error.message}`);
        }
    }
}
