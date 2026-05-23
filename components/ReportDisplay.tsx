
import React, { useState } from 'react';
import { AnalysisResult, AnalyzedComplex, PollutantType } from '../types';
import appConfig from '../config/app_config';
import { InfoIcon, MapIcon } from './icons';
import { ReportViewer } from './ReportViewer';
import { ScoringCriteriaTable } from './ScoringCriteriaTable';
import { StationMap } from './StationMap';

interface ReportDisplayProps {
  result: AnalysisResult;
}

const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
);
  
const ComplexRow: React.FC<{ analyzedComplex: AnalyzedComplex; rank: number; type: PollutantType }> = ({ analyzedComplex, rank, type }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { complex, station, distanceKm, stationLat, stationLon, stationAddress } = analyzedComplex;
    const scores = station.scores!;
    
    // PM2.5 Helper
    const scoreSum = (val1: number, val2: number) => (val1 + val2).toFixed(1);
    const dTotal = type === 'PM2.5' ? (scores.d1 || 0) + (scores.d2 || 0) : (scores.d || 0);
    const uTotal = type === 'PM2.5' ? (scores.u1 || 0) + (scores.u2 || 0) : (scores.u1 || 0) + (scores.u2 || 0); // Ozone also uses U1+U2 now

    return (
        <>
            <tr 
                className={`border-b dark:border-gray-700 cursor-pointer transition-colors ${isOpen ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`} 
                onClick={() => setIsOpen(!isOpen)}
                title="클릭하여 지도 및 상세 정보 확인"
            >
                <td className="p-3 text-center text-sm text-gray-800 dark:text-gray-200 whitespace-nowrap">{rank}</td>
                <td className="p-3 font-semibold text-sm text-gray-800 dark:text-gray-200 whitespace-nowrap">{complex.name}</td>
                <td className="p-3 text-sm text-gray-800 dark:text-gray-200 whitespace-nowrap">{station.name}<span className="inline-block ml-1 text-xs text-gray-500 dark:text-gray-400">({distanceKm.toFixed(1)}km)</span></td>
                <td className="p-3 text-center text-sm text-gray-800 dark:text-gray-200 whitespace-nowrap">{station.metrics.latest_1hr_avg?.toFixed(3) ?? '-'}</td>
                <td className="p-3 text-center text-sm text-gray-800 dark:text-gray-200 whitespace-nowrap">{station.metrics.full_period_max?.toFixed(3) ?? '-'}</td>
                <td className="p-3 text-center font-bold text-lg text-brand-blue dark:text-blue-400 whitespace-nowrap">{scores.total.toFixed(1)}</td>
                
                {type === 'PM2.5' ? (
                    <>
                        <td className="p-3 text-center text-sm text-gray-800 dark:text-gray-200 whitespace-nowrap">{scoreSum(scores.u1 || 0, scores.u2 || 0)}</td>
                        <td className="p-3 text-center text-sm text-gray-800 dark:text-gray-200 whitespace-nowrap">{scoreSum(scores.s1 || 0, scores.s2 || 0)}</td>
                        <td className="p-3 text-center text-sm text-gray-800 dark:text-gray-200 whitespace-nowrap">{(scores.p1 || 0).toFixed(1)}</td>
                    </>
                ) : (
                    <>
                        <td className="p-3 text-center text-sm text-gray-800 dark:text-gray-200 whitespace-nowrap" title="U1+U2">{uTotal.toFixed(1)}</td>
                        <td className="p-3 text-center text-sm text-gray-800 dark:text-gray-200 whitespace-nowrap">{(scores.s || 0).toFixed(1)}</td>
                        <td className="p-3 text-center text-sm text-gray-800 dark:text-gray-200 whitespace-nowrap">{(scores.p || 0).toFixed(1)}</td>
                    </>
                )}
                
                <td className={`p-3 text-center font-semibold text-sm whitespace-nowrap ${dTotal < 0 ? 'text-danger dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    {dTotal.toFixed(1)}
                </td>

                <td className="p-3 text-center">
                    <div className="flex flex-col items-center justify-center space-y-1">
                        <MapIcon className={`h-5 w-5 text-brand-blue dark:text-blue-400 ${isOpen ? 'opacity-100' : 'opacity-60'}`} />
                        <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                </td>
            </tr>
            {isOpen && (
                <tr className="bg-blue-50 dark:bg-blue-900/10 border-b dark:border-gray-700">
                    <td colSpan={11} className="p-4">
                        <div className="flex flex-col lg:flex-row gap-6 animate-fade-in-fast">
                            <div className="flex-1">
                                <h5 className="font-bold mb-3 text-brand-darkgray dark:text-gray-200">세부 점수 및 근거 데이터 (근거 측정소: {station.name})</h5>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-700 dark:text-gray-300">
                                    {type === 'PM2.5' ? (
                                        <>
                                            <div><strong>U1 (최신농도):</strong> {scores.u1} <span className="text-gray-500 dark:text-gray-400">({scores.components['최신 1시간 농도']})</span></div>
                                            <div><strong>U2 (급상승):</strong> {scores.u2} <span className="text-gray-500 dark:text-gray-400">({scores.components['2시간 농도 변화']})</span></div>
                                            <div><strong>S1 (최대농도):</strong> {scores.s1} <span className="text-gray-500 dark:text-gray-400">({scores.components['기간 최대 농도']})</span></div>
                                            <div><strong>S2 (최근성):</strong> {scores.s2} <span className="text-gray-500 dark:text-gray-400">({scores.components['최대농도 최근성']})</span></div>
                                            <div><strong>P1 (평균농도):</strong> {scores.p1} <span className="text-gray-500 dark:text-gray-400">({scores.components['기간 평균 농도']})</span></div>
                                            <div><strong>D1 (데이터품질):</strong> {scores.d1}</div>
                                            {(scores.d2 || 0) > 0 && <div><strong>D2 (근접성 점수):</strong> {scores.d2} <span className="text-gray-500 dark:text-gray-400">({scores.components['근접성 점수']})</span></div>}
                                            <div className="col-span-2"><strong>D1 근거:</strong> 이상값: {scores.components['이상값']}, 장기 동일값: {scores.components['장기 동일값']}</div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="col-span-2"><strong>U1 (최신):</strong> {(scores.u1 || 0).toFixed(1)}점 <span className="text-gray-500">({scores.components['U1_val']})</span></div>
                                            <div className="col-span-2"><strong>U2 (평균):</strong> {(scores.u2 || 0).toFixed(1)}점 <span className="text-gray-500">({scores.components['U2_val']})</span></div>
                                            <div className="col-span-2"><strong>S (심각성):</strong> {(scores.s || 0).toFixed(1)}점 <span className="text-gray-500">({scores.components['S_val']})</span></div>
                                            <div className="col-span-2"><strong>P (지속성):</strong> {(scores.p || 0).toFixed(1)}점 <span className="text-gray-500">({scores.components['P_val']})</span></div>
                                            <div className="col-span-2"><strong>D (신뢰성):</strong> {(scores.d || 0).toFixed(1)}점 <span className="text-gray-500">({scores.components['D_val']})</span></div>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 lg:max-w-md">
                                <h5 className="font-bold mb-3 text-brand-darkgray dark:text-gray-200">위치 확인</h5>
                                <div className="rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 shadow-sm">
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
                    </td>
                </tr>
            )}
        </>
    );
};

export const ReportDisplay: React.FC<ReportDisplayProps> = ({ result }) => {
  const [isReportVisible, setIsReportVisible] = useState(false);
  const [isCriteriaVisible, setIsCriteriaVisible] = useState(false);
  const { pdfReportTemplate } = appConfig;
  const { rankedComplexes, startTimestamp, endTimestamp, totalStationsParsed, totalComplexesAnalyzed, pollutantType } = result;

  const summaryIntro = pdfReportTemplate.summary_template.split('\n\n')[1] || "데이터를 종합 분석하여 우선관리 산업단지 순위를 도출하였습니다.";
    
  return (
    <>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 animate-fade-in transition-colors">
        <h2 className="text-2xl font-bold text-brand-blue dark:text-blue-400 border-b-2 border-brand-blue dark:border-blue-400 pb-3 mb-6 whitespace-nowrap">
            [{pollutantType}] {pdfReportTemplate.title}
        </h2>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md mb-8 transition-colors">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
              <div>
                  <h3 className="text-lg font-semibold text-brand-darkgray dark:text-gray-100 mb-2 whitespace-nowrap">분석 요약</h3>
                  <div className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
                     <p className="whitespace-nowrap"><strong>데이터 분석 기간:</strong> {startTimestamp} ~ {endTimestamp}</p>
                     <p className="mt-2">{summaryIntro}</p>
                  </div>
              </div>
              <button
                  onClick={() => setIsReportVisible(true)}
                  className="flex-shrink-0 flex items-center px-4 py-2 text-sm font-medium text-white bg-brand-blue dark:bg-blue-700 rounded-lg shadow-sm hover:bg-brand-lightblue dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue transition-colors duration-200 whitespace-nowrap"
              >
                  상세 분석 보고서 보기
              </button>
          </div>
           <div className="text-sm text-gray-600 dark:text-gray-400 mt-4 pt-3 border-t border-blue-200 dark:border-blue-800">
              <p className="whitespace-nowrap"><strong>총 분석된 측정소:</strong> {totalStationsParsed}개</p>
              <p className="whitespace-nowrap"><strong>분석 완료된 산업단지:</strong> {totalComplexesAnalyzed}개</p>
          </div>
        </div>
        
        <div className="mb-8">
            <button 
                onClick={() => setIsCriteriaVisible(!isCriteriaVisible)}
                className="w-full flex justify-between items-center text-left p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
                <span className="text-lg font-semibold text-brand-darkgray dark:text-gray-200 whitespace-nowrap">평가 기준 안내</span>
                <ChevronDownIcon className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isCriteriaVisible ? 'rotate-180' : ''}`} />
            </button>
            {isCriteriaVisible && (
                <div className="mt-4 animate-fade-in-fast">
                    <ScoringCriteriaTable mode={pollutantType} />
                </div>
            )}
        </div>

        {rankedComplexes.length > 0 ? (
          <section>
            <h3 className="text-xl lg:text-2xl font-semibold text-brand-darkgray dark:text-gray-100 mb-4">{pdfReportTemplate.portfolio_section_title}</h3>
            <p className="text-sm lg:text-base text-gray-500 dark:text-gray-400 mb-2 text-right">* 항목을 클릭하면 지도와 상세 정보를 확인할 수 있습니다.</p>
             <div className="overflow-x-auto rounded-lg border dark:border-gray-700">
                <table className="w-full text-left">
                    <thead className="bg-brand-gray dark:bg-gray-700">
                        <tr className="border-b dark:border-gray-600">
                            <th className="p-3 text-center font-semibold text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap">순위</th>
                            <th className="p-3 font-semibold text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap">산업단지</th>
                            <th className="p-3 font-semibold text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap">근거 측정소<span className="inline-block ml-1 font-normal text-xs">(거리)</span></th>
                            <th className="p-3 text-center font-semibold text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap">최근농도<span className="inline-block ml-1 font-normal text-xs">({pollutantType === 'PM2.5' ? 'µg/m³' : 'ppm'})</span></th>
                            <th className="p-3 text-center font-semibold text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap">최고농도<span className="inline-block ml-1 font-normal text-xs">({pollutantType === 'PM2.5' ? 'µg/m³' : 'ppm'})</span></th>
                            <th className="p-3 text-center font-semibold text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap">총점</th>
                            
                            {pollutantType === 'PM2.5' ? (
                                <>
                                    <th className="p-3 text-center font-semibold text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap" title="U1+U2">시급성(U)</th>
                                    <th className="p-3 text-center font-semibold text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap" title="S1+S2">심각성(S)</th>
                                    <th className="p-3 text-center font-semibold text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap" title="P1">지속성(P)</th>
                                </>
                            ) : (
                                <>
                                    <th className="p-3 text-center font-semibold text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap" title="U1+U2">시급성(U)</th>
                                    <th className="p-3 text-center font-semibold text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap">심각성(S)</th>
                                    <th className="p-3 text-center font-semibold text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap">지속성(P)</th>
                                </>
                            )}
                            
                            <th className="p-3 text-center font-semibold text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap" title="D">신뢰성(D)</th>
                            <th className="p-3 text-center font-semibold text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap">상세/지도</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rankedComplexes.map((ac, index) => (
                            <ComplexRow key={ac.complex.name} analyzedComplex={ac} rank={index + 1} type={pollutantType} />
                        ))}
                    </tbody>
                </table>
            </div>
          </section>
        ) : (
          <div className="text-center py-10 px-6 bg-gray-50 dark:bg-gray-900 rounded-lg border dark:border-gray-700">
            <InfoIcon className="h-12 w-12 text-info mx-auto" />
            <h4 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-200">분석 완료</h4>
            <p className="mt-2 text-gray-600 dark:text-gray-400">선택된 산업단지에 대해 분석을 완료했으나, 점수를 산출할 수 있는 데이터가 부족하거나 기준에 해당하는 지역이 없습니다.</p>
          </div>
        )}
      </div>

      {isReportVisible && <ReportViewer result={result} onClose={() => setIsReportVisible(false)} />}
    </>
  );
};
