
import React, { useCallback, useRef, useState } from 'react';

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  isLoading: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isLoading }) => {
  const [selectedFileNames, setSelectedFileNames] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const files = Array.from(event.target.files);
      setSelectedFileNames(`${files.length}개의 파일이 선택되었습니다.`);
      onFileSelect(files);
    } else {
        setSelectedFileNames('파일이 선택되지 않았습니다.');
        onFileSelect([]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".csv,.xlsx,.xls"
        multiple
      />
      <button
        onClick={triggerFileSelect}
        disabled={isLoading}
        className="w-full sm:w-auto flex-shrink-0 px-5 py-3 text-base font-medium text-brand-blue dark:text-blue-300 bg-white dark:bg-gray-800 border-2 border-brand-blue dark:border-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-lightblue transition-colors duration-200 disabled:opacity-50 whitespace-nowrap"
      >
        CSV / EXCEL 파일 선택
      </button>
      <div className="flex-grow w-full h-12 flex items-center px-4 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors">
        <span className="text-gray-500 dark:text-gray-300 truncate" title={selectedFileNames}>
            {selectedFileNames || '파일이 선택되지 않았습니다.'}
        </span>
      </div>
    </div>
  );
};
