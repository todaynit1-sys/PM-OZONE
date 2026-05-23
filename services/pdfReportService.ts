import { AnalysisResult, AnalyzedComplex, StationScores } from '../types';
import { nanumGothic } from '../assets/NanumGothic-Regular';
import appConfig from '../config/app_config';

declare const jspdf: any;

export function getOfficialAnalysis(scores: StationScores): { assessment: string, keyFactors: string[] } {
    const uScore = scores.u1 + scores.u2;
    const sScore = scores.s1 + scores.s2;
    const pScore = scores.p1;
    const dScore = scores.d1 + (scores.d2 || 0);
    
    let assessment = "본 산업단지 인근의 PM2.5 농도 패턴을 분석한 결과, ";
    const keyFactors: string[] = [];
    
    // Urgency (U) Detail
    if (uScore > 25) {
        assessment += `최근 농도가 매우 높거나 급격히 상승하여 '시급성(U)'이 ${uScore.toFixed(1)}점으로 매우 높게 나타났습니다. `;
        keyFactors.push(`[시급성-매우높음] 최신 1시간 평균 농도가 ${scores.components['최신 1시간 농도']}이며, 최근 2시간 동안 ${scores.components['2시간 농도 변화']}의 급격한 농도 변화가 관측되었습니다.`);
    } else if (uScore > 15) {
        assessment += `'시급성(U)'이 ${uScore.toFixed(1)}점으로 다소 높아 단기적인 농도 변화에 주의가 필요합니다. `;
        keyFactors.push(`[시급성-높음] 최신 1시간 농도(${scores.components['최신 1시간 농도']}) 및 단기 상승폭을 고려할 때 주의가 필요한 수준입니다.`);
    } else {
        keyFactors.push(`[시급성-보통] 최신 농도(${scores.components['최신 1시간 농도']})는 안정적인 추세를 보이고 있습니다.`);
    }

    // Severity (S) Detail
    if (sScore > 20) {
        assessment += `분석 기간 중 고농도 스파이크가 발생하여 '심각성(S)' 지표가 ${sScore.toFixed(1)}점으로 높습니다. `;
        keyFactors.push(`[심각성-높음] 기간 중 최대 농도가 ${scores.components['기간 최대 농도']}에 달했으며, 발생 시점(${scores.components['최대농도 최근성']})이 비교적 최근이거나 농도 수준이 매우 높습니다.`);
    } else if (sScore > 12) {
        assessment += `간헐적으로 높은 농도가 관측되어 '심각성(S)'에 대한 모니터링이 필요합니다. `;
        keyFactors.push(`[심각성-주의] 기간 내 간헐적인 농도 상승(최대 ${scores.components['기간 최대 농도']}, 발생: ${scores.components['최대농도 최근성']})이 확인되었습니다.`);
    } else {
        keyFactors.push(`[심각성-양호] 분석 기간 중 특이할 만한 고농도 발생은 없었습니다.`);
    }

    // Persistence (P) Detail
    if (pScore > 0) {
        assessment += `또한, 전체 기간 평균 농도가 높아 '지속성(P)' 점수(${pScore.toFixed(1)}점)가 산정되었습니다.`;
        keyFactors.push(`[지속성-높음] 기간 평균 농도가 ${scores.components['기간 평균 농도']}로, 기준치(${appConfig.scoringCriteria.P1.threshold_low}µg/m³)를 상회하여 지속적인 관리가 필요합니다.`);
    } else {
        keyFactors.push(`[지속성-보통] 기간 평균 농도는 ${scores.components['기간 평균 농도']}로 일반적인 수준입니다.`);
    }
    
    // Reliability (D) Detail
    if (scores.d1 < 0) {
        keyFactors.push(`[데이터 품질 이슈] ${scores.components['이상값'] !== '없음' ? `비정상적으로 높은 값(${scores.components['이상값']})` : `장기간 변동 없는 값(${scores.components['장기 동일값']})`}이 감지되어 신뢰성 점수가 차감되었습니다.`);
    }
    if (scores.d2 && scores.d2 >= 2.0) {
        keyFactors.push(`[위치 근접성] 산업단지와 측정소 간 거리가 가까워(${scores.components['근접성 점수']}), 분석 결과의 대표성이 높습니다.`);
    }

    return {
        assessment,
        keyFactors
    };
}


export const generatePdfReport = async (result: AnalysisResult) => {
    const doc = new jspdf.jsPDF({ orientation: 'landscape' });
    const { rankedComplexes, startTimestamp, endTimestamp } = result;

    let fontLoaded = false;
    const fontData = nanumGothic as string;
    if (fontData && fontData.length > 1000) {
        try {
            doc.addFileToVFS('NanumGothic-Regular.ttf', fontData);
            doc.addFont('NanumGothic-Regular.ttf', 'NanumGothic', 'normal');
            doc.setFont('NanumGothic');
            fontLoaded = true;
        } catch (e) {
            console.error("PDF font loading failed.", e);
        }
    }

    if (!fontLoaded) {
        console.warn("Korean font not loaded. PDF may not render Korean characters correctly.");
        doc.setFont('helvetica');
    }
    const fontName = fontLoaded ? 'NanumGothic' : 'helvetica';
    
    const pageHeight = doc.internal.pageSize.height || 210;
    const pageWidth = doc.internal.pageSize.width || 297;

    const addHeader = (title: string) => {
        doc.setFontSize(18);
        doc.setTextColor('#0D47A1');
        doc.text(title, 14, 22);
        doc.setDrawColor('#1976D2');
        doc.line(14, 25, pageWidth - 14, 25);
    };

    const addFooter = () => {
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text(`페이지 ${i} / ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
            doc.text(appConfig.appName, 14, pageHeight - 10);
        }
    };
    
    // Page 1: Title and Summary
    addHeader(appConfig.pdfReportTemplate.title);
    
    doc.setFontSize(11);
    doc.setTextColor(60);
    const summaryText = appConfig.pdfReportTemplate.summary_template.replace('{{timestamp}}', `${startTimestamp} ~ ${endTimestamp}`);
    doc.text(summaryText, 14, 35, { maxWidth: pageWidth - 28 });

    // Summary Table
    const tableHeaders = [['순위', '산업단지명', '측정소(거리)', '최신농도', '최고농도', '총점', '시급성(U)', '심각성(S)', '지속성(P)', '신뢰성(D)']];
    const tableData = rankedComplexes.slice(0, 15).map((item, index) => {
        const s = item.station;
        const sc = s.scores!;
        return [
            (index + 1).toString(),
            item.complex.name,
            `${s.name}\n(${item.distanceKm.toFixed(1)}km)`,
            s.metrics.latest_1hr_avg?.toFixed(1) ?? '-',
            s.metrics.full_period_max?.toFixed(1) ?? '-',
            sc.total.toFixed(1),
            (sc.u1 + sc.u2).toFixed(1),
            (sc.s1 + sc.s2).toFixed(1),
            sc.p1.toFixed(1),
            (sc.d1 + (sc.d2 || 0)).toFixed(1)
        ];
    });

    doc.autoTable({
        startY: 50,
        head: tableHeaders,
        body: tableData,
        styles: { font: fontName, fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [13, 71, 161], textColor: 255, halign: 'center' },
        columnStyles: {
            0: { halign: 'center', cellWidth: 15 },
            2: { cellWidth: 35 },
            3: { halign: 'center' },
            4: { halign: 'center' },
            5: { halign: 'center', fontStyle: 'bold', textColor: [13, 71, 161] },
            6: { halign: 'center' },
            7: { halign: 'center' },
            8: { halign: 'center' },
            9: { halign: 'center' }
        },
        margin: { top: 50, left: 14, right: 14 }
    });

    addFooter();

    // Page 2+: Details
    const itemsPerPage = 6;
    let yPos = 30;
    
    doc.addPage();
    addHeader(`${appConfig.pdfReportTemplate.portfolio_section_title} - 상세 분석`);
    addFooter();

    for (let i = 0; i < Math.min(rankedComplexes.length, 20); i++) {
        const item = rankedComplexes[i];
        const scores = item.station.scores!;
        const officialAnalysis = getOfficialAnalysis(scores);
        
        if (yPos > pageHeight - 50) {
            doc.addPage();
            addHeader(`${appConfig.pdfReportTemplate.portfolio_section_title} - 상세 분석`);
            addFooter();
            yPos = 30;
        }

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont(fontName, 'bold');
        doc.text(`${i + 1}. ${item.complex.name}`, 14, yPos);
        
        doc.setFontSize(10);
        doc.setFont(fontName, 'normal');
        doc.setTextColor(80);
        const metaInfo = `총점: ${scores.total.toFixed(1)}점 | 근거 측정소: ${item.station.name} (거리: ${item.distanceKm.toFixed(1)}km)`;
        doc.text(metaInfo, 14, yPos + 6);
        
        doc.setTextColor(50);
        const scoreDetail = `[세부점수] 시급성(U): ${(scores.u1+scores.u2).toFixed(1)}, 심각성(S): ${(scores.s1+scores.s2).toFixed(1)}, 지속성(P): ${scores.p1.toFixed(1)}, 신뢰성(D): ${(scores.d1 + (scores.d2||0)).toFixed(1)}`;
        doc.text(scoreDetail, 14, yPos + 11);

        doc.setTextColor(0);
        const analysisLines = doc.splitTextToSize(`분석: ${officialAnalysis.assessment}`, pageWidth - 28);
        doc.text(analysisLines, 14, yPos + 18);
        
        yPos += 18 + (analysisLines.length * 5);
        
        // Key Factors
        doc.setFontSize(9);
        officialAnalysis.keyFactors.forEach(factor => {
             const factorLines = doc.splitTextToSize(`- ${factor}`, pageWidth - 32);
             doc.text(factorLines, 18, yPos);
             yPos += (factorLines.length * 4) + 1;
        });

        yPos += 8; // Spacing between items
    }

    // Scoring Criteria Page
    doc.addPage();
    addHeader("참고: 평가 기준표");
    addFooter();
    
    const criteriaData = [
        ['시급성 (U)', 'U1', `최신 1시간 평균 농도 1µg/m³당 0.5점 부여 (${appConfig.scoringCriteria.U1.threshold_high}µg/m³ 이상 최고점)`, `${appConfig.scoringCriteria.U1.max_score}점`],
        ['시급성 (U)', 'U2', `2시간 농도 급상승 (상승폭 ${appConfig.scoringCriteria.U2.threshold_high}µg/m³ 기준)`, `${appConfig.scoringCriteria.U2.max_score}점`],
        ['심각성 (S)', 'S1', `분석 기간 내 최대 농도 1µg/m³당 0.2점 부여 (${appConfig.scoringCriteria.S1.threshold_high}µg/m³ 이상 최고점)`, `${appConfig.scoringCriteria.S1.max_score}점`],
        ['심각성 (S)', 'S2', `최대 농도 발생 시점의 최근성`, `${appConfig.scoringCriteria.S2.max_score}점`],
        ['지속성 (P)', 'P1', `전체 기간 평균 농도 ${appConfig.scoringCriteria.P1.threshold_low}µg/m³ 이상 시 초과분 1당 0.5점 (${appConfig.scoringCriteria.P1.threshold_high}µg/m³ 만점)`, `${appConfig.scoringCriteria.P1.max_score}점`],
        ['신뢰성 (D)', 'D1', `데이터 품질 (이상값 감지시 -10, 장기 고정값 -5)`, `감점`],
        ['신뢰성 (D)', 'D2', `측정소 거리 근접성 (${appConfig.scoringCriteria.D2.max_distance_km}km 이내 차등 점수)`, `${appConfig.scoringCriteria.D2.max_score}점`],
    ];

    doc.autoTable({
        startY: 35,
        head: [['구분', '항목', '산정 기준', '배점']],
        body: criteriaData,
        styles: { font: fontName, fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [100, 100, 100], textColor: 255, halign: 'center' },
        columnStyles: {
            0: { halign: 'center', cellWidth: 30 },
            1: { halign: 'center', cellWidth: 20 },
            3: { halign: 'center', cellWidth: 20 }
        },
        margin: { left: 14, right: 14 }
    });

    doc.save(`${appConfig.pdfReportTemplate.title}_${new Date().toISOString().slice(0,10)}.pdf`);
};