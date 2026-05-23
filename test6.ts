function isDateString(str) {
    if (!str) return false;
    const s = str.trim().replace(/^['"]|['"]$/g, '');
    return /^20\d{2}/.test(s) || /^\d{2}[-.\/년]/.test(s) || /^\d{4,5}$/.test(s);
}

const csv = `"일시","서울","","서울",""\r\n" ","강남구","FLAG","강동구","FLAG"\r\n"2025-12-03 08:00","35","1","40","0"\r\n"2025-12-03 09:00","","","20","1"`;

function test() {
    let rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;
    let csvContent = csv.replace(/\r\n/g, '\n');
    for (let i = 0; i < csvContent.length; i++) {
        const char = csvContent[i];
        if (inQuotes) {
            if (char === '"') {
                if (i + 1 < csvContent.length && csvContent[i + 1] === '"') {
                    currentField += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                currentField += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                currentRow.push(currentField);
                currentField = '';
            } else if (char === '\n') {
                currentRow.push(currentField);
                rows.push(currentRow);
                currentRow = [];
                currentField = '';
            } else {
                currentField += char;
            }
        }
    }
    currentRow.push(currentField);
    rows.push(currentRow);

    const nameRowIndex = 1;
    const colStep = 2; // FLAG
    const stationNamesRaw = rows[nameRowIndex];
    let stationArr = [];
    for(let i=1; i<stationNamesRaw.length; i+=colStep) {
        stationArr.push({ name: stationNamesRaw[i], timeseries: [] });
    }

    for (let i=2; i<rows.length; i++) {
        const columns = rows[i];
        const rowHeader = columns[0].trim();
        if (isDateString(rowHeader) || /^\d+$/.test(rowHeader)) {
            for(let j=0; j<stationArr.length; j++) {
                const valueIndex = 1 + (j * colStep) + 0;
                let valueStr = columns[valueIndex]?.trim();
                let parsed = valueStr ? parseFloat(valueStr) : NaN;
                stationArr[j].timeseries.push({ val: !isNaN(parsed) ? parsed : null });
            }
        }
    }
    console.log(JSON.stringify(stationArr, null, 2));
}

test();
