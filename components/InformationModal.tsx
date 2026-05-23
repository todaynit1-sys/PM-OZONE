import React, { useState } from 'react';
import appConfig from '../config/app_config';
import { MapPin, Building2, Wind } from 'lucide-react';

interface InformationModalProps {
  onClose: () => void;
}

export const InformationModal: React.FC<InformationModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'complex' | 'station'>('complex');

  const { industrialComplexes, stationCoordinates } = appConfig;
  const stations = Object.entries(stationCoordinates).map(([name, data]) => ({
    name,
    ...data,
  }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-fade-in-fast">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl p-6 relative max-h-[90vh] flex flex-col transition-colors">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 text-3xl font-light leading-none z-10"
        >
          &times;
        </button>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <MapPin className="text-brand-blue dark:text-blue-400" />
          위치 정보 안내
        </h2>

        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
          <button
            onClick={() => setActiveTab('complex')}
            className={`px-4 py-2 font-medium text-sm flex items-center gap-2 transition-colors ${
              activeTab === 'complex'
                ? 'border-b-2 border-brand-blue text-brand-blue dark:border-blue-400 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Building2 size={18} />
            산업단지 목록 ({industrialComplexes.length})
          </button>
          <button
            onClick={() => setActiveTab('station')}
            className={`px-4 py-2 font-medium text-sm flex items-center gap-2 transition-colors ${
              activeTab === 'station'
                ? 'border-b-2 border-brand-blue text-brand-blue dark:border-blue-400 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Wind size={18} />
            대기 측정망 목록 ({stations.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          {activeTab === 'complex' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {industrialComplexes.map((complex, index) => (
                <div key={index} className="bg-white dark:bg-gray-700 p-4 rounded-md shadow-sm border border-gray-100 dark:border-gray-600">
                  <h3 className="font-bold text-gray-800 dark:text-white text-sm mb-2">{complex.name}</h3>
                  <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                    <p><span className="font-semibold">주소:</span> {complex.address}</p>
                    <p><span className="font-semibold">위도:</span> {complex.lat.toFixed(6)}</p>
                    <p><span className="font-semibold">경도:</span> {complex.lon.toFixed(6)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'station' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stations.map((station, index) => (
                <div key={index} className="bg-white dark:bg-gray-700 p-4 rounded-md shadow-sm border border-gray-100 dark:border-gray-600">
                  <h3 className="font-bold text-gray-800 dark:text-white text-sm mb-2">{station.name}</h3>
                  <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                    {station.address && <p><span className="font-semibold">주소:</span> {station.address}</p>}
                    <p><span className="font-semibold">위도:</span> {station.lat.toFixed(6)}</p>
                    <p><span className="font-semibold">경도:</span> {station.lon.toFixed(6)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
