
import { StationData, AnalysisResult, StationScores, TimeSeriesData, IndustrialComplex, AnalyzedComplex, PollutantType, AppConfig } from '../types';
import config from '../config/app_config';

const { parsingRules, scoringCriteria, ozoneCriteria, industrialComplexes, stationCoordinates } = config;

/**
 * Finds coordinates for a station by trying exact, normalized (space-insensitive), and substring matches.
 */
function findStationCoords(stationName: string, coordsConfig: { [key: string]: { lat: number; lon: number; address?: string } }) {
    if (coordsConfig[stationName]) return coordsConfig[stationName];

    const normalizedStationName = stationName.replace(/\s/g, '');
    const matchingKey = Object.keys(coordsConfig).find(key => 
        key.replace(/\s/g, '') === normalizedStationName
    );
    if (matchingKey) return coordsConfig[matchingKey];

    if (stationName.length > 1) { 
        const substringKey = Object.keys(coordsConfig).find(key => key.includes(stationName));
        if (substringKey) return coordsConfig[substringKey];
    }
    
    return null;
}

function parseCsvWithQuotes(csvContent: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;

    if (csvContent.charCodeAt(0) === 0xFEFF) {
        csvContent = csvContent.slice(1);
    }
    csvContent = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

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

    return rows.filter(row => row.length > 1 || (row.length === 1 && row[0].trim() !== ''));
}

function parseCsv(csvContent: string, pollutantType: PollutantType): StationData[] {
    const rows = parseCsvWithQuotes(csvContent);
    if (rows.length < 2) return [];

    let headerRowIndex = 0;
    let maxNonEmpty = 0;
    for (let i = 0; i < Math.min(20, rows.length); i++) {
        if (!rows[i]) continue;
        const nonEmptyCount = rows[i].filter(c => c && c.trim() !== '').length;
        if (nonEmptyCount > maxNonEmpty) {
            maxNonEmpty = nonEmptyCount;
            headerRowIndex = i;
        }
    }
    
    const headerRow = rows[headerRowIndex] || [];
    
    let hasDateCol = false;
    let hasNameCol = false;
    let hasValCol = false;

    headerRow.forEach(h => {
        const clean = h.replace(/\s/g, '').toLowerCase();
        if (clean.includes('측정일시') || clean.includes('일시') || clean.includes('날짜')) hasDateCol = true;
        if (clean === '측정소명' || clean === '지점명' || clean === '측정소' || clean === '지점') hasNameCol = true;
        
        if (pollutantType === 'PM2.5') {
            if (/pm[_\- ]?2\.?5|초미세먼지|초미세|pm25/.test(clean)) hasValCol = true;
        } else {
            if (clean.includes('o3') || clean.includes('오존')) hasValCol = true;
        }
    });

    // It's long format ONLY if it explicitly has the Station column, Date column, AND Value column.
    const isLongFormat = hasNameCol && hasValCol; // Date col might be assumed to be 0 if missing from header but values exist

    const stationDataMap = new Map<string, StationData>();

    if (isLongFormat) {
        let nameCol = headerRow.findIndex(h => {
            const clean = h.replace(/\s/g, '');
            return clean.includes('측정소명') || clean.includes('지점명') || clean.includes('지점') || clean.includes('측정소');
        });
        let dateCol = headerRow.findIndex(h => {
            const clean = h.replace(/\s/g, '');
            return clean.includes('측정일시') || clean.includes('일시') || clean.includes('날짜');
        });
        
        let valCol = -1;
        if (pollutantType === 'PM2.5') {
            valCol = headerRow.findIndex(h => {
                const clean = h.replace(/\s/g, '').toLowerCase();
                return /pm[_\- ]?2\.?5|초미세먼지|초미세|pm25/.test(clean);
            });
        } else {
            valCol = headerRow.findIndex(h => {
                const clean = h.replace(/\s/g, '').toLowerCase();
                return clean.includes('o3') || clean.includes('오존');
            });
        }
        
        if (nameCol === -1) nameCol = 1; 
        if (dateCol === -1) dateCol = 0; 
        
        if (valCol === -1) {
             throw new Error(`[데이터 분석 오류] ${pollutantType} 데이터의 측정값 컬럼을 찾을 수 없습니다. 파일의 헤더를 확인해주세요: ${headerRow.slice(0, 5).join(', ')}`);
        }
        
        for (let i = headerRowIndex + 1; i < rows.length; i++) {
            const cols = rows[i];
            if (!cols || cols.length <= Math.max(nameCol, dateCol)) continue;
            
            const rawName = cols[nameCol];
            if (!rawName) continue;
            const cleanName = rawName.replace(/\n/g, ' ').replace(/\([^)]+\)/g, '').trim().replace(/\s+/g, ' ');
            if (!cleanName || cleanName === '날짜' || cleanName === '측정소명' || cleanName === '지점명' || cleanName === '구분' || cleanName === '측정소') continue;
            
            let station = stationDataMap.get(cleanName);
            if (!station) {
                station = {
                    id: stationDataMap.size,
                    name: cleanName,
                    fullName: rawName.trim().replace(/\n/g, ' '),
                    metrics: { longest_constant_run: 0 },
                    timeseries: [],
                    scores: null,
                };
                stationDataMap.set(cleanName, station);
            }
            
            const timestampRaw = cols[dateCol] || '';
            const timestamp = timestampRaw.replace(/^\s+|\s+$/g, '');
            let valueStr = '';
            if (valCol !== -1 && cols.length > valCol) {
                valueStr = (cols[valCol] || '').replace(/^\s+|\s+$/g, '');
            }
            const parsedVal = parseFloat(valueStr);
            const value = !isNaN(parsedVal) ? parsedVal : null;
            
            if (timestamp && /^20\d{2}/.test(timestamp)) {
                station.timeseries.push({ timestamp, value });
            }
        }
    } else {
        let dataStartIndex = -1;
        // Permissive date check: starts with 20XX, or 24-XX, or a number followed by date separators
        const isDateString = (str: string) => {
            if (!str) return false;
            const s = str.trim().replace(/^['"]|['"]$/g, '');
            // Matches 2023, 2024, 24-01, 24/01, 24.01, 45123 (numeric excel date)
            return /^20\d{2}/.test(s) || /^\d{2}[-.\/년]/.test(s) || /^\d{4,5}$/.test(s);
        };

        for (let i = 0; i < rows.length; i++) {
            const firstCell = rows[i][0] ? rows[i][0] : '';
            if (isDateString(firstCell)) {
                dataStartIndex = i;
                break;
            }
        }

        if (dataStartIndex <= 0) {
            dataStartIndex = parsingRules.station_name_row_index + 1;
        }

        let nameRowIndex = 0;
        let localMaxNonEmpty = 0;
        for (let i = 0; i < dataStartIndex; i++) {
            if (!rows[i]) continue;
            const nonEmptyCount = rows[i].filter(c => c && c.trim() !== '').length;
            if (nonEmptyCount > localMaxNonEmpty) {
                localMaxNonEmpty = nonEmptyCount;
                nameRowIndex = i;
            }
        }

        let stationNamesRaw = rows[nameRowIndex] || [];
        
        // Auto-detect column step by finding the next non-empty cell
        let colStep = parsingRules.value_column_step || 1;
        if (stationNamesRaw.length > 2) {
            let actualStep = 1;
            // Start from index 1 (assumes index 0 is Date) and find the distance to the next station name
            const firstStation = stationNamesRaw[1]?.trim() || '';
            if (firstStation !== '') {
                for (let k = 2; k < stationNamesRaw.length; k++) {
                    const colName = stationNamesRaw[k]?.trim().toUpperCase();
                    if (colName !== '' && colName !== 'FLAG' && colName !== '선별기호' && colName !== '상태' && !/PM\s*(10|2\.5)|O3/i.test(colName)) {
                        actualStep = k - 1;
                        break;
                    }
                }
                colStep = actualStep;
            } else {
                // Fallback
                const col2 = stationNamesRaw[2]?.trim() || '';
                if (col2 === '' || col2 === '선별기호' || col2 === '상태') {
                    colStep = 2;
                }
            }
        }


        const stationArr: { colIndex: number, station: StationData }[] = [];
        
        let valueOffset = 0;
        // Check if there is a subheader row between nameRowIndex and dataStartIndex
        // which might indicate PM10 vs PM2.5 columns
        if (colStep > 1 && dataStartIndex > nameRowIndex + 1) {
            const subHeaderRow = rows[nameRowIndex + 1] || [];
            if (subHeaderRow.length > 2) {
                // Look at the first 2-3 columns to see if we can find PM2.5 or O3
                for (let offset = 0; offset < colStep; offset++) {
                    const h = subHeaderRow[1 + offset] || '';
                    const cleanH = h.replace(/\s/g, '').toLowerCase();
                    if (pollutantType === 'PM2.5' && /pm[_\- ]?2\.?5|초미세먼지|초미세|pm25/.test(cleanH)) {
                        valueOffset = offset;
                        break;
                    }
                    if (pollutantType === 'O3' && (cleanH.includes('o3') || cleanH.includes('오존'))) {
                        valueOffset = offset;
                        break;
                    }
                }
            }
        }

        for (let i = 1; i < stationNamesRaw.length; i += colStep) {
            const rawName = stationNamesRaw[i];
            if (rawName && rawName.trim()) {
                const cleanName = rawName
                    .replace(/\n/g, ' ')
                    .replace(/\([^)]+\)/g, '')
                    .trim()
                    .replace(/\s+/g, ' ');

                if (cleanName && cleanName !== '날짜' && cleanName !== '측정일시' && cleanName !== '구분') {
                    stationArr.push({
                        colIndex: i,
                        station: {
                            id: stationArr.length,
                            name: cleanName,
                            fullName: rawName.trim().replace(/\n/g, ' '),
                            metrics: { longest_constant_run: 0 },
                            timeseries: [],
                            scores: null,
                        }
                    });
                }
            }
        }
        
        if (stationArr.length > 0) {
            // Parse data rows
            for (let r = dataStartIndex; r < rows.length; r++) {
                const columns = rows[r];
                if (!columns || columns.length < 2) continue;
                
                const rowHeader = columns[0].trim();
                // Treat any row where the first column is a date or a number as a data row
                if (isDateString(rowHeader) || /^\d+$/.test(rowHeader)) {
                    const timestamp = rowHeader;
                    for (let i = 0; i < stationArr.length; i++) {
                        const valueIndex = stationArr[i].colIndex + valueOffset;
                        if (columns.length > valueIndex) {
                            const valueStr = columns[valueIndex] ? columns[valueIndex].trim() : '';
                            const parsedVal = parseFloat(valueStr);
                            const value = !isNaN(parsedVal) ? parsedVal : null;
                            
                            stationArr[i].station.timeseries.push({ timestamp, value });
                        }
                    }
                } else if (parsingRules.summary_rows_map[rowHeader]) {
                    const metricKey = parsingRules.summary_rows_map[rowHeader];
                    for (let i = 0; i < stationArr.length; i++) {
                        const valueIndex = stationArr[i].colIndex + valueOffset;
                        if (columns.length > valueIndex) {
                            const valueStr = columns[valueIndex] ? columns[valueIndex].trim() : '';
                            const parsedVal = parseFloat(valueStr);
                            const value = (!isNaN(parsedVal) && parsedVal > 0) ? parsedVal : 0;
                            
                            stationArr[i].station.metrics[metricKey] = value;
                        }
                    }
                }
            }
            stationArr.forEach(item => stationDataMap.set(item.station.name, item.station));
        }
    }

    return Array.from(stationDataMap.values());
}

// Applies Ozone specific preprocessing: Outlier removal (> 1.0) and Forward Fill
function preprocessOzoneData(station: StationData) {
    // 1. Remove Outliers (> 1.0 ppm)
    station.timeseries.forEach(pt => {
        if (pt.value !== null && pt.value >= 1.0) {
            pt.value = null; 
        }
    });

    // 2. Forward Fill (ffill)
    // Iterate and fill nulls with previous valid value
    let lastValidValue: number | null = null;
    station.timeseries.forEach(pt => {
        if (pt.value !== null) {
            lastValidValue = pt.value;
        } else if (lastValidValue !== null) {
            pt.value = lastValidValue;
        }
    });
}

function calculateAdditionalMetricsPM25(station: StationData): void {
    // Simple filter for PM2.5: Remove < 0 values for calculation (e.g. -999 for missing)
    const validTimeseries = station.timeseries.filter(ts => ts.value !== null && ts.value >= 0) as {timestamp: string, value: number}[];
    
    if (validTimeseries.length === 0) {
        station.metrics.longest_constant_run = 0;
        return;
    }

    // Fallback calculation for summary metrics if missing
    if (station.metrics.full_period_max === undefined) {
        station.metrics.full_period_max = Math.max(...validTimeseries.map(ts => ts.value));
    }
    if (station.metrics.full_period_avg === undefined) {
        const sum = validTimeseries.reduce((acc, curr) => acc + curr.value, 0);
        station.metrics.full_period_avg = parseFloat((sum / validTimeseries.length).toFixed(1));
    }
    if (station.metrics.full_period_min === undefined) {
        station.metrics.full_period_min = Math.min(...validTimeseries.map(ts => ts.value));
    }

    if (validTimeseries.length > 0) {
        // If less than 12 valid values, just use what we have for recent average
        const last12 = validTimeseries.slice(-Math.min(12, validTimeseries.length));
        const sum = last12.reduce((acc, curr) => acc + curr.value, 0);
        station.metrics.latest_1hr_avg = parseFloat((sum / last12.length).toFixed(2));
    }

    if (validTimeseries.length >= 2) {
        // If we don't have 24 items, try looking back up to 24 slots, or just use the earliest in the recent window
        const lookbackIndex = Math.max(0, validTimeseries.length - 24);
        const value2hAgo = validTimeseries[lookbackIndex].value;
        station.metrics.c_2h_ago = value2hAgo;
        if (station.metrics.latest_1hr_avg !== undefined && value2hAgo !== null) {
            station.metrics.delta_2hr = parseFloat((station.metrics.latest_1hr_avg - value2hAgo).toFixed(2));
        }
    }

    if (station.metrics.full_period_max !== undefined) {
        const maxTs = [...validTimeseries].reverse().find(ts => ts.value === station.metrics.full_period_max);
        station.metrics.max_value_timestamp = maxTs ? maxTs.timestamp : null;
    }

    let longestRun = 0;
    let currentRun = 0;
    let lastValue: number | null = -Infinity;
    for (const ts of validTimeseries) {
        if (ts.value !== null && ts.value === lastValue) {
            currentRun++;
        } else {
            longestRun = Math.max(longestRun, currentRun);
            currentRun = 1;
            lastValue = ts.value;
        }
    }
    station.metrics.longest_constant_run = Math.max(longestRun, currentRun);
}

function formatTimestamp(timestamp: string): string {
    try {
        const standardized = timestamp.replace(/\./g, '-'); 
        const date = new Date(standardized);
        if (isNaN(date.getTime())) return timestamp;
        return `${date.getMonth() + 1}월 ${date.getDate()}일 ${date.getHours()}시 ${date.getMinutes()}분`;
    } catch (e) {
        return timestamp;
    }
}

function calculatePM25Scores(station: StationData): StationScores {
    const { metrics, timeseries } = station;
    const crit = scoringCriteria;
    const components: { [key: string]: number | string | null } = {};

    const cNow = metrics.latest_1hr_avg;
    let u1 = 0;
    if (cNow !== undefined) {
        const val = cNow * 0.5;
        u1 = Math.min(crit.U1.max_score, Math.max(0, val));
    }
    components['최신 1시간 농도'] = cNow !== undefined ? `${cNow}µg/m³` : 'N/A';

    const deltaC = metrics.delta_2hr;
    let u2 = 0;
    if (deltaC !== undefined && deltaC !== null) {
        const val = crit.U2.max_score * deltaC / crit.U2.threshold_high;
        u2 = Math.min(crit.U2.max_score, Math.max(0, val));
    }
    components['2시간 농도 변화'] = deltaC !== undefined && deltaC !== null ? `${deltaC.toFixed(1)}µg/m³` : 'N/A';

    const cMax = metrics.full_period_max;
    let s1 = 0;
    if (cMax !== undefined) {
        const val = cMax * 0.2;
        s1 = Math.min(crit.S1.max_score, Math.max(0, val));
    }
    components['기간 최대 농도'] = cMax !== undefined ? `${cMax}µg/m³` : 'N/A';

    let s2 = 0;
    if (metrics.max_value_timestamp && timeseries.length > 1) {
        const tFirst = new Date(timeseries[0].timestamp).getTime();
        const tLast = new Date(timeseries[timeseries.length - 1].timestamp).getTime();
        const tMax = new Date(metrics.max_value_timestamp).getTime();
        if (tLast > tFirst) {
            const ratio = (tMax - tFirst) / (tLast - tFirst);
            s2 = crit.S2.max_score * Math.min(1, Math.max(0, ratio));
        }
    }
    components['최대농도 최근성'] = metrics.max_value_timestamp ? formatTimestamp(metrics.max_value_timestamp) : 'N/A';

    const cMean = metrics.full_period_avg;
    let p1 = 0;
    if (cMean !== undefined && cMean >= crit.P1.threshold_low) {
        const val = (cMean - crit.P1.threshold_low) * 0.5;
        p1 = Math.min(crit.P1.max_score, Math.max(0, val));
    }
    components['기간 평균 농도'] = cMean !== undefined ? `${cMean}µg/m³` : 'N/A';
    
    let d1 = 0;
    if (metrics.full_period_max && metrics.full_period_max >= crit.D1.anomaly_threshold) {
        d1 = crit.D1.penalty_anomaly;
    } else if (metrics.longest_constant_run >= crit.D1.constant_run_threshold) {
        d1 = crit.D1.penalty_constant;
    }
    components['이상값'] = metrics.full_period_max && metrics.full_period_max >= crit.D1.anomaly_threshold ? metrics.full_period_max : '없음';
    components['장기 동일값'] = metrics.longest_constant_run >= crit.D1.constant_run_threshold ? `${metrics.longest_constant_run}회` : '없음';

    const total = u1 + u2 + s1 + s2 + p1 + d1;

    return {
        u1: parseFloat(u1.toFixed(1)), u2: parseFloat(u2.toFixed(1)), s1: parseFloat(s1.toFixed(1)),
        s2: parseFloat(s2.toFixed(1)), p1: parseFloat(p1.toFixed(1)), d1: parseFloat(d1.toFixed(1)),
        d2: 0,
        total: parseFloat(Math.max(0, total).toFixed(1)), components,
    };
}

function calculateOzoneScores(station: StationData): StationScores {
    const { timeseries } = station;
    const validData = timeseries.filter(d => d.value !== null);
    const count = validData.length;

    if (count === 0) {
        return { total: 0, components: {}, u:0, s:0, p:0, d:0 };
    }

    // Sort by time to ensure order
    validData.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    const current = validData[validData.length - 1];
    
    // Calculate 1-hour average of the most recent 1-hour window
    // Assuming data is sorted by time. We take the last window of ~60 mins.
    const oneHourMs = 60 * 60 * 1000;
    const lastTime = new Date(current.timestamp).getTime();
    const lastHourData = validData.filter(d => {
        const t = new Date(d.timestamp).getTime();
        return (lastTime - t) <= oneHourMs && (lastTime - t) >= 0;
    });
    
    let latest1HrAvg = 0;
    if (lastHourData.length > 0) {
        const sum = lastHourData.reduce((acc, curr) => acc + (curr.value || 0), 0);
        latest1HrAvg = sum / lastHourData.length;
    } else {
        latest1HrAvg = current.value || 0;
    }

    // 1. (U1) Urgency 1: Most recent concentration * 100 (Max 20)
    const u1Raw = (current.value || 0) * ozoneCriteria.U1.multiplier;
    const u1Score = Math.min(ozoneCriteria.U1.max_score, Math.max(0, u1Raw));

    // 2. (U2) Urgency 2: Latest 1hr Avg * 100 (Max 20)
    const u2Raw = latest1HrAvg * ozoneCriteria.U2.multiplier;
    const u2Score = Math.min(ozoneCriteria.U2.max_score, Math.max(0, u2Raw));

    // 3. (S) Severity: Max * 100 (Max 30)
    // Note: ozoneCriteria.S.standard_val is 1, multiplier is 100.
    const maxVal = Math.max(...validData.map(d => d.value || 0));
    const sRaw = (maxVal / ozoneCriteria.S.standard_val) * ozoneCriteria.S.multiplier;
    const sScore = Math.min(ozoneCriteria.S.max_score, sRaw);

    // 4. (P) Persistence: (Count > 0.12 / Total) * 100 (Max 25)
    const exceedCount = validData.filter(d => (d.value || 0) > ozoneCriteria.P.threshold).length;
    const pRaw = (exceedCount / count) * ozoneCriteria.P.multiplier;
    const pScore = Math.min(ozoneCriteria.P.max_score, pRaw);

    // 5. (D) Reliability -> Calculated in analyzeData using distance. 
    const dScore = 0; // Placeholder for now

    // Save metrics for display
    station.metrics.full_period_max = maxVal;
    station.metrics.latest_value = current.value || 0;
    station.metrics.latest_1hr_avg = latest1HrAvg;
    station.metrics.ozone_exceed_count = exceedCount;
    station.metrics.total_valid_count = count;

    const components = {
        'U1_val': `${u1Score.toFixed(1)}점 (최신: ${current.value}ppm)`,
        'U2_val': `${u2Score.toFixed(1)}점 (1시간평균: ${latest1HrAvg.toFixed(3)}ppm)`,
        'S_val': `${sScore.toFixed(1)}점 (최대: ${maxVal}ppm)`,
        'P_val': `${pScore.toFixed(1)}점 (초과빈도: ${(exceedCount/count*100).toFixed(1)}%)`,
        '최신 농도': `${current.value}ppm`,
        '최대 농도': `${maxVal}ppm`,
    };

    return {
        u1: parseFloat(u1Score.toFixed(1)), // reuse u1 field
        u2: parseFloat(u2Score.toFixed(1)), // reuse u2 field
        u: parseFloat((u1Score + u2Score).toFixed(1)), // legacy u field sum for display
        s: parseFloat(sScore.toFixed(1)),
        p: parseFloat(pScore.toFixed(1)),
        d: 0, // Placeholder
        d1: 0, d2: 0, 
        total: parseFloat((u1Score + u2Score + sScore + pScore).toFixed(1)),
        components
    };
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export function analyzeData(csvContents: string[], selectedComplexNames: string[], pollutantType: PollutantType = 'PM2.5'): AnalysisResult {
    const allStationsRaw = csvContents.flatMap(content => parseCsv(content, pollutantType));

    if (allStationsRaw.length === 0) {
        throw new Error("제공된 파일에서 유효한 측정소 데이터를 찾을 수 없습니다. 파일 형식과 내용을 확인해주세요.");
    }
    
    // Deduplicate stations
    const stationMap = new Map<string, StationData>();
    allStationsRaw.forEach(station => {
        if (stationMap.has(station.name)) {
            const existing = stationMap.get(station.name)!;
            existing.timeseries.push(...station.timeseries);
        } else {
            stationMap.set(station.name, station);
        }
    });

    // Sort timeseries after merging
    stationMap.forEach(station => {
        station.timeseries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    });

    const uniqueStations = Array.from(stationMap.values());
    uniqueStations.forEach((station, index) => station.id = index);

    const totalValidValues = uniqueStations.reduce((sum, s) => sum + s.timeseries.filter(ts => ts.value !== null).length, 0);
    if (totalValidValues === 0) {
        // Build thorough debug message
        let extraDebug = '';
        if (dataStartIndex >= 0 && dataStartIndex < rows.length) {
            extraDebug += `\nRow[${dataStartIndex}]: ${JSON.stringify(rows[dataStartIndex].slice(0, 5))}`;
        }
        if (dataStartIndex > 0) {
            extraDebug += `\nSubHeaderRow[${dataStartIndex-1}]: ${JSON.stringify(rows[dataStartIndex-1].slice(0, 5))}`;
        }
        extraDebug += `\ncolStep: ${colStep}, valOffset: ${valueOffset}, colIdx[0]: ${uniqueStations[0]?.name}=${stationArr[0]?.colIndex}`;

        throw new Error(`데이터 파싱 실패: ${pollutantType} 의 유효한 측정값을 찾을 수 없습니다.\n[상세 정보]\n파싱된 측정소 수: ${uniqueStations.length}${extraDebug}`);
    }

    // Filter complexes
    const selectedComplexes = industrialComplexes.filter(c => selectedComplexNames.includes(c.name));
    const analyzedComplexes: AnalyzedComplex[] = [];
    
    selectedComplexes.forEach(complex => {
        let closestStation: StationData | null = null;
        let minDistance = Infinity;
        let closestStationCoord: { lat: number, lon: number, address?: string } | null = null;

        uniqueStations.forEach(station => {
            const stationCoord = findStationCoords(station.name, stationCoordinates);
            if (stationCoord) {
                const distance = haversineDistance(complex.lat, complex.lon, stationCoord.lat, stationCoord.lon);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestStation = station;
                    closestStationCoord = stationCoord;
                }
            }
        });

        if (closestStation) {
            // Apply preprocessing and Scoring ONLY IF not already calculated or type changed (implied new run)
            if (!closestStation.scores) { 
                if (pollutantType === 'O3') {
                    preprocessOzoneData(closestStation);
                    closestStation.scores = calculateOzoneScores(closestStation);
                } else {
                    calculateAdditionalMetricsPM25(closestStation);
                    closestStation.scores = calculatePM25Scores(closestStation);
                }
            }

            if (closestStation.scores) {
                const stationCopy: StationData = JSON.parse(JSON.stringify(closestStation));
                
                if (pollutantType === 'PM2.5') {
                    // PM2.5 Distance Logic (D2)
                    const { max_score, max_distance_km } = scoringCriteria.D2;
                    const proximityScore = Math.max(0, max_score * (1 - minDistance / max_distance_km));
                    stationCopy.scores!.d2 = parseFloat(proximityScore.toFixed(1));
                    
                    const { u1=0, u2=0, s1=0, s2=0, p1=0, d1=0, d2=0 } = stationCopy.scores!;
                    const newTotal = u1 + u2 + s1 + s2 + p1 + d1 + d2;
                    stationCopy.scores!.total = parseFloat(Math.max(0, newTotal).toFixed(1));
                    stationCopy.scores!.components['근접성 점수'] = `${stationCopy.scores!.d2}점 (${minDistance.toFixed(1)}km)`;
                } else {
                    // Ozone Distance Logic (D)
                    // base - (distance * penalty). Clamped 0.
                    let dScore = ozoneCriteria.D.base_score - (minDistance * ozoneCriteria.D.penalty_per_km);
                    dScore = Math.max(0, dScore);
                    
                    stationCopy.scores!.d = parseFloat(dScore.toFixed(1));
                    
                    // Ozone Total = U1 + U2 + S + P + D
                    const { u1=0, u2=0, s=0, p=0 } = stationCopy.scores!;
                    const newTotal = u1 + u2 + s + p + dScore;
                    stationCopy.scores!.total = parseFloat(newTotal.toFixed(1));
                    stationCopy.scores!.components['D_val'] = `${dScore.toFixed(1)}점 (${minDistance.toFixed(1)}km)`;
                }

                 analyzedComplexes.push({
                    complex: complex,
                    station: stationCopy,
                    distanceKm: minDistance,
                    stationLat: closestStationCoord?.lat,
                    stationLon: closestStationCoord?.lon,
                    stationAddress: closestStationCoord?.address
                });
            }
        }
    });

    if (analyzedComplexes.length === 0) {
        const parsedNames = uniqueStations.map(s => s.name).slice(0, 5).join(', ');
        throw new Error(`선택한 산업단지와 매칭되는 유효한 측정소 데이터를 찾을 수 없습니다.\n파일에서 파싱된 측정소 예: ${parsedNames}`);
    }

    const rankedComplexes = analyzedComplexes
        .sort((a, b) => b.station.scores!.total - a.station.scores!.total);

    let startTimestamp = "N/A";
    let endTimestamp = "N/A";
    const allValidTimestamps = uniqueStations
      .flatMap(s => s.timeseries)
      .map(ts => ts.timestamp)
      .filter((ts): ts is string => !!ts);
      
    if (allValidTimestamps.length > 0) {
        allValidTimestamps.sort((a, b) => a.localeCompare(b));
        startTimestamp = allValidTimestamps[0];
        endTimestamp = allValidTimestamps[allValidTimestamps.length - 1];
    }

    return {
        pollutantType,
        rankedComplexes,
        startTimestamp,
        endTimestamp,
        totalStationsParsed: uniqueStations.length,
        totalComplexesAnalyzed: rankedComplexes.length,
        unmatchedComplexes: [], 
    };
}
