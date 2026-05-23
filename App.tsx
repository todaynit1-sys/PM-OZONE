
import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { FileUpload } from './components/FileUpload';
import { ReportDisplay } from './components/ReportDisplay';
import { AnalysisResult, AppConfig, PollutantType } from './types';
import { analyzeData } from './services/analysisService';
import appConfig from './config/app_config';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorAlert } from './components/ErrorAlert';
import { IndustrialComplexSelector } from './components/IndustrialComplexSelector';
import { ScoringCriteriaTable } from './components/ScoringCriteriaTable';
import { InformationModal } from './components/InformationModal';
import { MapPin } from 'lucide-react';

const App: React.FC = () => {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedComplexes, setSelectedComplexes] = useState<string[]>([]);
  const [pollutantType, setPollutantType] = useState<PollutantType>('PM2.5');
  const [resetKey, setResetKey] = useState(0);
  const [showCriteriaModal, setShowCriteriaModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  
  const config: AppConfig = appConfig;

  const readFileAsText = (file: File): Promise<string> => {
    if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = new Uint8Array(event.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array', cellDates: true });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            // Format dates back to string so that grep for "20" (year) works
            const csvText = XLSX.utils.sheet_to_csv(worksheet, { dateNF: 'yyyy-mm-dd HH:mm:ss', blankrows: true });
            resolve(csvText);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
      });
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const buffer = event.target?.result as ArrayBuffer;
        if (!buffer) {
          resolve("");
          return;
        }
        const uint8Array = new Uint8Array(buffer);
        let text = "";
        try {
          // Attempt UTF-8 decode. If there's an encoding error, it will throw.
          const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
          text = utf8Decoder.decode(uint8Array);
        } catch (e) {
          // Fallback to EUC-KR
          const euckrDecoder = new TextDecoder('euc-kr');
          text = euckrDecoder.decode(uint8Array);
        }
        resolve(text);
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileSelection = useCallback((files: File[]) => {
    setSelectedFiles(files);
    setAnalysisResult(null); 
    setError(null);
  }, []);

  const handleComplexSelection = useCallback((complexNames: string[]) => {
    setSelectedComplexes(complexNames);
  }, []);

  const handleAnalysis = useCallback(async () => {
    if (selectedFiles.length === 0 || selectedComplexes.length === 0) {
      setError("분석을 위해서는 최소 1개의 데이터 파일과 1개의 산업단지를 선택해야 합니다.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const readPromises = selectedFiles.map(file => readFileAsText(file));
      const contents = await Promise.all(readPromises);
      const result = analyzeData(contents, selectedComplexes, pollutantType);
      setAnalysisResult(result);
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('알 수 없는 오류가 발생했습니다.');
      }
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFiles, selectedComplexes, pollutantType]);

  const handleReset = useCallback(() => {
    setAnalysisResult(null);
    setError(null);
    setSelectedFiles([]);
    setSelectedComplexes([]);
    setResetKey(prevKey => prevKey + 1);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-brand-darkgray dark:text-gray-100 transition-colors duration-200">
      <header className="bg-brand-blue shadow-md dark:bg-blue-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight whitespace-nowrap">{config.appName}</h1>
              <p className="text-sm text-blue-200 mt-1">v{config.version}</p>
            </div>
            
            {/* Pollutant Type Switch */}
            <div className="bg-blue-800 dark:bg-blue-950 p-1 rounded-lg flex space-x-1">
               <button
                 onClick={() => { setPollutantType('PM2.5'); setAnalysisResult(null); }}
                 className={`px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${pollutantType === 'PM2.5' ? 'bg-white text-brand-blue shadow' : 'text-blue-200 hover:bg-blue-700'}`}
               >
                 PM2.5 분석
               </button>
               <button
                 onClick={() => { setPollutantType('O3'); setAnalysisResult(null); }}
                 className={`px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${pollutantType === 'O3' ? 'bg-white text-brand-blue shadow' : 'text-blue-200 hover:bg-blue-700'}`}
               >
                 오존(O3) 분석
               </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 transition-colors">
          <h2 className="text-xl lg:text-2xl font-semibold text-brand-darkgray dark:text-white border-b dark:border-gray-700 pb-3 mb-4">
              1. 데이터 파일 업로드 ({pollutantType})
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 lg:text-lg">
              분석할 {pollutantType === 'PM2.5' ? '초미세먼지(PM2.5)' : '오존(O3)'} 데이터가 포함된 CSV 파일을 업로드해주세요.
          </p>
          <FileUpload key={`file-upload-${resetKey}`} onFileSelect={handleFileSelection} isLoading={isLoading} />
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 transition-colors">
          <h2 className="text-xl font-semibold text-brand-darkgray dark:text-white border-b dark:border-gray-700 pb-3 mb-4 whitespace-nowrap">2. 분석 대상 산업단지 선택</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm lg:text-base whitespace-nowrap">우선순위를 분석할 산업단지를 선택해주세요.</p>
          <IndustrialComplexSelector 
            key={`complex-selector-${resetKey}`}
            complexes={config.industrialComplexes}
            onSelectionChange={handleComplexSelection}
          />
        </div>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <button
              onClick={() => setShowCriteriaModal(true)}
              className="w-full sm:w-auto px-12 py-4 text-lg font-bold text-brand-blue dark:text-blue-300 bg-white dark:bg-gray-800 border-2 border-brand-blue dark:border-blue-500 rounded-lg shadow-md hover:bg-blue-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-lightblue transition-colors duration-200 whitespace-nowrap"
            >
              평가 기준표 ({pollutantType})
            </button>

            <button
              onClick={() => setShowInfoModal(true)}
              className="w-full sm:w-auto px-6 py-4 text-lg font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors duration-200 flex flex-row items-center justify-center gap-2 whitespace-nowrap"
            >
              <MapPin size={20} />
              데이터(산단/측정망) 정보
            </button>

            {analysisResult ? (
              <button
                onClick={handleReset}
                className="w-full sm:w-auto px-12 py-4 text-lg font-bold text-white bg-green-600 dark:bg-green-700 rounded-lg shadow-md hover:bg-green-700 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200 whitespace-nowrap"
              >
                초기화 및 새로운 분석 시작
              </button>
            ) : (
              <button
                onClick={handleAnalysis}
                disabled={selectedFiles.length === 0 || selectedComplexes.length === 0 || isLoading}
                className="w-full sm:w-auto px-12 py-4 text-lg font-bold text-white bg-brand-blue dark:bg-blue-700 rounded-lg shadow-md hover:bg-brand-lightblue dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue transition-colors duration-200 disabled:bg-gray-400 disabled:dark:bg-gray-600 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isLoading ? '분석 중...' : `${pollutantType} 우선순위 분석 실행`}
              </button>
            )}
        </div>

        {isLoading && <LoadingSpinner />}
        {error && <ErrorAlert message={error} />}
        
        {analysisResult && (
          <div className="mt-8">
            <ReportDisplay result={analysisResult} />
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-sm lg:text-base text-gray-500 dark:text-gray-400">
        <p>&copy; {new Date().getFullYear()} {config.appName}. All rights reserved.</p>
      </footer>

      {showCriteriaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-fade-in-fast">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl p-6 relative max-h-[90vh] overflow-y-auto transition-colors">
                <button 
                    onClick={() => setShowCriteriaModal(false)}
                    className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 text-3xl font-light leading-none"
                >
                    &times;
                </button>
                <div className="mt-2 text-brand-darkgray dark:text-gray-100">
                    <ScoringCriteriaTable 
                        title={`${pollutantType} 우선관리 대상 선정 평가 기준`} 
                        mode={pollutantType}
                    />
                </div>
                <div className="mt-6 flex justify-end">
                    <button 
                        onClick={() => setShowCriteriaModal(false)}
                        className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
      )}
      {showInfoModal && (
        <InformationModal onClose={() => setShowInfoModal(false)} />
      )}
    </div>
  );
};

export default App;
