import React, { useState, useEffect } from "react";
import { fetchLatestDate } from "../services/api";

const LatestDate = () => {
    const [latestDate, setLatestDate] = useState(null);

    useEffect(()=>{
        fetchLatestDate()
          .then((data) => {
            if (data.maxTimestamp) {
                setLatestDate(data.maxTimestamp);
            }
          })
          .catch(err => console.error("Failed to get latest date", err))
    }, []);

    return (
        <div>
            {latestDate?(
                <p style={{textAlign:"right"}}>最新上傳資料至: {latestDate}</p>
            ) : (
                <p style={{textAlign:"right"}}>目前尚無資料</p>
            )}
        </div>
    )
}

export default LatestDate;