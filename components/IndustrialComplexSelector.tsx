
import React, { useState, useEffect, useCallback } from 'react';
import { IndustrialComplex } from '../types';

interface IndustrialComplexSelectorProps {
  complexes: IndustrialComplex[];
  onSelectionChange: (selectedNames: string[]) => void;
}

export const IndustrialComplexSelector: React.FC<IndustrialComplexSelectorProps> = ({ complexes, onSelectionChange }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    onSelectionChange(Array.from(selected));
  }, [selected, onSelectionChange]);

  const handleToggle = (name: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(name)) {
      newSelected.delete(name);
    } else {
      newSelected.add(name);
    }
    setSelected(newSelected);
  };
  
  const handleSelectAll = useCallback(() => {
    const allNames = new Set(complexes.map(c => c.name));
    setSelected(allNames);
  }, [complexes]);

  const handleDeselectAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  const filteredComplexes = complexes.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
            <input
                type="text"
                placeholder="산업단지 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-grow w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-lightblue transition-colors"
            />
            <div className="flex-shrink-0 flex items-center gap-2">
                 <button onClick={handleSelectAll} className="px-4 py-2 text-sm text-brand-blue dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors whitespace-nowrap">
                    전체 선택
                </button>
                <button onClick={handleDeselectAll} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors whitespace-nowrap">
                    전체 해제
                </button>
            </div>
        </div>
      
        <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 bg-white dark:bg-gray-800 transition-colors">
        {filteredComplexes.map(complex => (
          <label key={complex.name} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded">
            <input
              type="checkbox"
              checked={selected.has(complex.name)}
              onChange={() => handleToggle(complex.name)}
              className="flex-shrink-0 h-5 w-5 rounded border-gray-300 text-brand-blue focus:ring-brand-lightblue dark:bg-gray-700 dark:border-gray-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap overflow-hidden text-ellipsis" title={complex.name}>{complex.name}</span>
          </label>
        ))}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">선택된 산업단지: {selected.size} / {complexes.length}개</p>
    </div>
  );
};
