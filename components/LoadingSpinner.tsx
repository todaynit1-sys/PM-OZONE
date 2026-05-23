
import React from 'react';

export const LoadingSpinner: React.FC = () => (
  <div className="flex flex-col items-center justify-center my-10">
    <div className="w-16 h-16 border-4 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
    <p className="mt-4 text-lg text-brand-darkgray dark:text-gray-200 font-semibold">데이터를 분석하고 있습니다...</p>
  </div>
);
