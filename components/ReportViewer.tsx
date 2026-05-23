
import React, { useState } from 'react';
import { AnalysisResult, AnalyzedComplex, PollutantType } from '../types';
import { generatePdfReport, getOfficialAnalysis } from '../services/pdfReportService';
import { PdfIcon } from './icons';
import { ScoringCriteriaTable } from './ScoringCriteriaTable';
import { StationMap } from './StationMap';

interface ReportViewerProps {
    result: AnalysisResult;
    onClose: () => void;
}

const DetailReportSection: React.FC<{ analyzedComplex: AnalyzedComplex, rank: number, type: PollutantType }> = ({ analyzedComplex, rank, type }) => {
    const { complex, station, distanceKm, stationLat, stationLon, stationAddress } = analyzedComplex;
    const scores = station.scores!;
    const metrics = station.metrics;
    
    const officialReport = type === 'PM2.5' ? getOfficialAnalysis(scores) : { assessment: "오존(O3) 분석 결과입니다.", keyFactors: [] };
    const unit = type === 'PM2.5' ? 'µg/m³' : 'ppm';

    return (
        <div className="p-4 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 mb-4 shadow-sm transition-colors">
            <h4 className="text-lg font-bold text-brand-lightblue dark:text-blue-300 border-b dark:border-gray-700 pb-2 mb-3">{rank}. {complex.name}</h4>
            
            <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                        <span className="font-semibold text-brand-darkgray dark:text-gray-100">순위:</span> {rank}위 &nbsp;|&nbsp; 
                        <span className="font-semibold text-brand-darkgray dark:text-gray-100">총점:</span> {scores.total.toFixed(1)}점 &nbsp;|&nbsp; 
                        <span className="font-semibold text-brand-darkgray dark:text-gray-100">근거 측정소:</span> {station.name} ({distanceKm.toFixed(1)}km)
                    </p>
                    
                    <div className="mb-4">
                        <h5 className="font-semibold text-brand-darkgray dark:text-gray-200 mb-1 text-sm">주요 농도 지표</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded-md border dark:border-gray-600">
                            <span><strong>최신 농도:</strong> {metrics.latest_value?.toFixed(3) ?? '-'} {unit}</span>
                            <span><strong>최고 농도:</strong> {metrics.full_period_max?.toFixed(3) ?? '-'} {unit}</span>
                            {type === 'PM2.5' && <span><strong>평균 농도:</strong> {metrics.full_period_avg?.toFixed(1) ?? '-'} {unit}</span>}
                            {type === 'O3' && <span><strong>초과 건수:</strong> {metrics.ozone_exceed_count ?? 0}회</span>}
                        </div>
                    </div>

                    <div className="space-y-3 text-sm">
                        {type === 'PM2.5' ? (
                            <>
                                <div>
                                    <h5 className="font-semibold text-brand-darkgray dark:text-gray-200">종합 평가</h5>
                                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{officialReport.assessment}</p>
                                </div>
                                <div>
                                    <h5 className="font-semibold text-brand-darkgray dark:text-gray-200">상세 분석 요인</h5>
                                    <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 text-xs sm:text-sm pl-2">
                                        {officialReport.keyFactors.map((factor, i) => <li key={i} className="mb-1">{factor}</li>)}
                                    </ul>
                                </div>
                                <div>
                                    <h5 className="font-semibold text-brand-darkgray dark:text-gray-200 mb-1">세부 점수 내역</h5>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                                        <span><strong>U1:</strong> {(scores.u1 || 0).toFixed(1)}</span>
                                        <span><strong>U2:</strong> {(scores.u2 || 0).toFixed(1)}</span>
                                        <span><strong>S1:</strong> {(scores.s1 || 0).toFixed(1)}</span>
                                        <span><strong>S2:</strong> {(scores.s2 || 0).toFixed(1)}</span>
                                        <span><strong>P1:</strong> {(scores.p1 || 0).toFixed(1)}</span>
                                        <span><strong>D1:</strong> {(scores.d1 || 0).toFixed(1)}</span>
                                        {(scores.d2 || 0) > 0 && <span><strong>D2:</strong> {(scores.d2 || 0).toFixed(1)}</span>}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div>
                                <h5 className="font-semibold text-brand-darkgray dark:text-gray-200 mb-1">세부 점수 내역 (오존)</h5>
                                <div className="grid grid-cols-1 gap-y-2 text-xs text-gray-700 dark:text-gray-300">
                                    <div><strong>U1 (최신):</strong> {(scores.u1 || 0).toFixed(1)}점 - {scores.components['U1_val']}</div>
                                    <div><strong>U2 (평균):</strong> {(scores.u2 || 0).toFixed(1)}점 - {scores.components['U2_val']}</div>
                                    <div><strong>S (심각성):</strong> {(scores.s || 0).toFixed(1)}점 - {scores.components['S_val']}</div>
                                    <div><strong>P (지속성):</strong> {(scores.p || 0).toFixed(1)}점 - {scores.components['P_val']}</div>
                                    <div><strong>D (신뢰성):</strong> {(scores.d || 0).toFixed(1)}점 - {scores.components['D_val']}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 lg:max-w-sm">
                     <h5 className="font-bold mb-2 text-brand-darkgray dark:text-gray-200 text-sm">위치 확인</h5>
                     <div className="h-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                        <StationMap 
                            complex={complex} 
                            stationName={station.name} 
                            stationLat={stationLat} 
                            stationLon={stationLon}
                            stationAddress={stationAddress}
                        />
                     </div>
                </div>
            </div>
        </div>
    );
};

export const ReportViewer: React.FC<ReportViewerProps> = ({ result, onClose }) => {
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const { rankedComplexes, startTimestamp, endTimestamp, pollutantType } = result;

    const handleGeneratePdf = async () => {
        setIsGeneratingPdf(true);
        try {
            await generatePdfReport(result);
        } catch (e) {
            console.error("PDF 생성 실패:", e);
            alert("PDF 보고서 생성에 실패했습니다.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-fade-in-fast">
            <div className="bg-brand-gray dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col transition-colors">
                <header className="flex justify-between items-center p-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-lg">
                    <div>
                        <h2 className="text-xl font-bold text-brand-blue dark:text-blue-400">분석 보고서 ({pollutantType})</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">분석 기간: {startTimestamp} ~ {endTimestamp}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 text-3xl font-light leading-none p-1">&times;</button>
                </header>
                
                <main className="flex-grow p-4 overflow-y-auto bg-gray-100 dark:bg-gray-900/50">
                    <section className="mb-6">
                        <h3 className="text-lg font-semibold text-brand-darkgray dark:text-gray-200 mb-2">종합 순위 (상위 5개)</h3>
                         <div className="overflow-x-auto rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                                    <tr>
                                        <th className="p-3 text-center font-semibold whitespace-nowrap">순위</th>
                                        <th className="p-3 font-semibold whitespace-nowrap">산업단지명</th>
                                        <th className="p-3 font-semibold whitespace-nowrap">근거 측정소</th>
                                        <th className="p-3 text-center font-semibold whitespace-nowrap">최근농도</th>
                                        <th className="p-3 text-center font-semibold whitespace-nowrap">최고농도</th>
                                        <th className="p-3 text-center font-semibold whitespace-nowrap">총점</th>
                                        {pollutantType === 'PM2.5' ? (
                                            <>
                                                <th className="p-3 text-center font-semibold whitespace-nowrap">시급성(U)</th>
                                                <th className="p-3 text-center font-semibold whitespace-nowrap">심각성(S)</th>
                                                <th className="p-3 text-center font-semibold whitespace-nowrap">지속성(P)</th>
                                                <th className="p-3 text-center font-semibold whitespace-nowrap">신뢰성(D)</th>
                                            </>
                                        ) : (
                                            <>
                                                <th className="p-3 text-center font-semibold whitespace-nowrap" title="U1+U2">시급성(U)</th>
                                                <th className="p-3 text-center font-semibold whitespace-nowrap">심각성(S)</th>
                                                <th className="p-3 text-center font-semibold whitespace-nowrap">지속성(P)</th>
                                                <th className="p-3 text-center font-semibold whitespace-nowrap">신뢰성(D)</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rankedComplexes.slice(0, 5).map((ac, i) => {
                                        const dTotal = pollutantType === 'PM2.5' ? (ac.station.scores!.d1 || 0) + (ac.station.scores!.d2 || 0) : (ac.station.scores!.d || 0);
                                        const uTotal = pollutantType === 'PM2.5' ? (ac.station.scores!.u1 || 0) + (ac.station.scores!.u2 || 0) : (ac.station.scores!.u1 || 0) + (ac.station.scores!.u2 || 0);
                                        const sTotal = pollutantType === 'PM2.5' ? (ac.station.scores!.s1 || 0) + (ac.station.scores!.s2 || 0) : (ac.station.scores!.s || 0);
                                        const pTotal = pollutantType === 'PM2.5' ? (ac.station.scores!.p1 || 0) : (ac.station.scores!.p || 0);

                                        return (
                                        <tr key={ac.complex.name} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="p-3 text-center text-gray-800 dark:text-gray-200">{i + 1}</td>
                                            <td className="p-3 font-medium text-gray-800 dark:text-gray-200">{ac.complex.name}</td>
                                            <td className="p-3 text-gray-600 dark:text-gray-400">{ac.station.name}</td>
                                            <td className="p-3 text-center text-gray-800 dark:text-gray-200">{ac.station.metrics.latest_1hr_avg?.toFixed(3) ?? '-'}</td>
                                            <td className="p-3 text-center text-gray-800 dark:text-gray-200">{ac.station.metrics.full_period_max?.toFixed(3) ?? '-'}</td>
                                            <td className="p-3 text-center font-bold text-brand-blue dark:text-blue-400">{(ac.station.scores!.total).toFixed(1)}</td>
                                            
                                            <td className="p-3 text-center text-gray-800 dark:text-gray-200">{uTotal.toFixed(1)}</td>
                                            <td className="p-3 text-center text-gray-800 dark:text-gray-200">{sTotal.toFixed(1)}</td>
                                            <td className="p-3 text-center text-gray-800 dark:text-gray-200">{pTotal.toFixed(1)}</td>
                                            <td className={`p-3 text-center font-semibold ${dTotal < 0 ? 'text-danger dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{dTotal.toFixed(1)}</td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-lg font-semibold text-brand-darkgray dark:text-gray-200 mb-2">상세 분석 (상위 10개)</h3>
                        <div className="space-y-4">
                            {rankedComplexes.slice(0, 10).map((ac, index) => (
                                <DetailReportSection key={ac.complex.name} analyzedComplex={ac} rank={index + 1} type={pollutantType} />
                            ))}
                        </div>
                    </section>

                    <section className="mt-6">
                        <ScoringCriteriaTable title="참고: 평가 기준표" mode={pollutantType} />
                    </section>
                </main>

                <footer className="flex justify-end items-center p-3 border-t dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-lg space-x-3">
                     <button
                        onClick={handleGeneratePdf}
                        disabled={isGeneratingPdf}
                        className="flex items-center px-4 py-2 text-sm font-medium text-white bg-brand-blue dark:bg-blue-700 rounded-md shadow-sm hover:bg-brand-lightblue dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue transition-colors duration-200 disabled:bg-gray-400 disabled:dark:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        <PdfIcon className="h-5 w-5 mr-2" />
                        {isGeneratingPdf ? '생성 중...' : 'PDF 다운로드'}
                    </button>
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                    >
                        닫기
                    </button>
                </footer>
            </div>
        </div>
    );
};
