function parseCsvWithQuotes(csvContent: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;

    if (csvContent.charCodeAt(0) === 0xFEFF) {
        csvContent = csvContent.slice(1);
    }
    csvContent = csvContent.replace(/\r\n/g, '\n');

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

    return rows;
}
console.log(parseCsvWithQuotes('A,"35",B'));
