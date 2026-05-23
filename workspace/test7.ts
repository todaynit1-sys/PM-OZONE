const columns = ["2025-12-03 08:00","35","1","40","0"];
const valueIndex = 1 + 0;
const valueStr = columns[valueIndex] ? columns[valueIndex].trim() : '';
const parsedVal = parseFloat(valueStr);
console.log(parsedVal);
