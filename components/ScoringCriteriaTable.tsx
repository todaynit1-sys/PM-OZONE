
import React from 'react';
import appConfig from '../config/app_config';
import { ScoringCriteria, OzoneCriteria, PollutantType } from '../types';

interface ScoringCriteriaTableProps {
    title?: string;
    mode?: PollutantType;
}

export const ScoringCriteriaTable: React.FC<ScoringCriteriaTableProps> = ({ title, mode = 'PM2.5' }) => {
    const critPM: ScoringCriteria = appConfig.scoringCriteria;
    const critO3: OzoneCriteria = appConfig.ozoneCriteria;

    const pmData = [
        { category: '시급성 (U)', component: 'U1 (최신농도)', description: `최신 1시간 평균 농도 1µg/m³당 0.5점 부여. (${critPM.U1.threshold_high}µg/m³ 이상에서 최고점)`, maxScore: critPM.U1.max_score },
        { category: '시급성 (U)', component: 'U2 (급상승)', description: `최근 2시간 농도 변화량 기반. 농도 상승폭이 ${critPM.U2.threshold_high}µg/m³일 때 최고점.`, maxScore: critPM.U2.max_score },
        { category: '심각성 (S)', component: 'S1 (최대농도)', description: `분석 기간 내 5분 단위 최대 농도 1µg/m³당 0.2점 부여. (${critPM.S1.threshold_high}µg/m³ 이상에서 최고점)`, maxScore: critPM.S1.max_score },
        { category: '심각성 (S)', component: 'S2 (최근성)', description: '최대 농도 발생 시점이 최근일수록 높은 점수.', maxScore: critPM.S2.max_score },
        { category: '지속성 (P)', component: 'P1 (평균농도)', description: `평균 농도 ${critPM.P1.threshold_low}µg/m³ 이상일 때 초과분 1µg/m³당 0.5점 부여. (${critPM.P1.threshold_high}µg/m³ 이상에서 최고점)`, maxScore: critPM.P1.max_score },
        { category: '신뢰성 (D)', component: 'D1 (데이터품질)', description: `이상 최고농도(${critPM.D1.anomaly_threshold}µg/m³) 감지 시 ${critPM.D1.penalty_anomaly}점, 장기 동일값(${critPM.D1.constant_run_threshold / 12}시간) 감지 시 ${critPM.D1.penalty_constant}점 감점.`, maxScore: 0 },
        { category: '신뢰성 (D)', component: 'D2 (근접성 점수)', description: `산업단지와 측정소 거리가 가까울수록 높은 점수 부여. ${critPM.D2.max_distance_km}km 이상 시 0점, 0km 근접 시 최고점.`, maxScore: critPM.D2.max_score },
    ];

    const ozoneData = [
        { category: '시급성 (U)', component: 'U1 (최신농도)', description: critO3.U1.description, maxScore: critO3.U1.max_score },
        { category: '시급성 (U)', component: 'U2 (평균농도)', description: critO3.U2.description, maxScore: critO3.U2.max_score },
        { category: '심각성 (S)', component: 'Severity', description: `(기간 내 최대 농도 / ${critO3.S.standard_val}) × ${critO3.S.multiplier}`, maxScore: critO3.S.max_score },
        { category: '지속성 (P)', component: 'Persistence', description: `(${critO3.P.threshold}ppm 초과 데이터 수 / 전체 데이터) × ${critO3.P.multiplier}`, maxScore: critO3.P.max_score },
        { category: '신뢰성 (D)', component: 'Reliability', description: `기본 ${critO3.D.base_score}점 - (거리(km) × ${critO3.D.penalty_per_km}). ${critO3.D.max_dist}km 이상 시 0점.`, maxScore: critO3.D.base_score },
    ];

    const criteriaData = mode === 'PM2.5' ? pmData : ozoneData;

    const mergedRows = [];
    let lastCategory = '';

    criteriaData.forEach((item, index) => {
        if (item.category !== lastCategory) {
            const rowSpan = criteriaData.filter(d => d.category === item.category).length;
            mergedRows.push({ ...item, rowSpan, isFirst: true });
            lastCategory = item.category;
        } else {
            mergedRows.push({ ...item, rowSpan: 1, isFirst: false });
        }
    });

    return (
        <section>
            {title && <h3 className="text-xl font-semibold text-brand-darkgray dark:text-gray-200 mb-4 whitespace-nowrap">{title}</h3>}
            <div className="overflow-x-auto rounded-lg border dark:border-gray-700">
                <table className="w-full text-left text-sm">
                    <thead className="bg-brand-gray dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                        <tr>
                            <th className="p-3 font-semibold w-1/6">구분</th>
                            <th className="p-3 font-semibold w-1/6">항목</th>
                            <th className="p-3 font-semibold w-2/3">산정 기준</th>
                            <th className="p-3 text-center font-semibold">최고점/배점</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mergedRows.map((item, index) => (
                            <tr key={index} className="border-b dark:border-gray-600 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700">
                                {item.isFirst && <td className="p-3 align-top text-gray-800 dark:text-gray-300" rowSpan={item.rowSpan}>{item.category}</td>}
                                <td className="p-3 font-medium text-gray-800 dark:text-gray-300">{item.component}</td>
                                <td className="p-3 text-gray-600 dark:text-gray-400">{item.description}</td>
                                <td className="p-3 text-center font-medium text-gray-800 dark:text-gray-300">{typeof item.maxScore === 'number' && item.maxScore <= 0 ? '감점' : item.maxScore}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
};
