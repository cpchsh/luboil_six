// const predefinedColors = [
//     "rgba(231, 76, 60, 1)",    // 紅色 (Red)
//     "rgba(46, 204, 113, 1)",   // 綠色 (Green)
//     "rgba(52, 152, 219, 1)",   // 藍色 (Blue)
//     "rgba(241, 196, 15, 1)",   // 黃色 (Yellow)
//     "rgba(155, 89, 182, 1)",   // 紫色 (Purple)
//     "rgba(243, 156, 18, 1)",   // 橙色 (Orange)
// ]

// 另一組顏色
const predefinedColors = [
    "rgba(255, 99, 132, 1)",    // 淺紅色 (Light Red)
    "rgba(54, 162, 235, 1)",    // 淺藍色 (Light Blue)
    "rgba(255, 206, 86, 1)",    // 淺黃色 (Light Yellow)
    "rgba(75, 192, 192, 1)",    // 淺綠色 (Light Green)
    "rgba(153, 102, 255, 1)",   // 淺紫色 (Light Purple)
    "rgba(255, 159, 64, 1)",    // 淺橙色 (Light Orange)
]

/**
 * 傳入一組產品清單 (e.g. ["R32", "R46", "R68"]),
 * 回傳 productName -> color 的 Map。
 */
export function buildColorMap(productNames) {
    const colorMap = new Map();
    productNames.forEach((prod, i) => {
        colorMap.set(prod, predefinedColors[i % predefinedColors.length]);
    });
    return colorMap;
}