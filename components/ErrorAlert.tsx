
import React from 'react';
import { WarningIcon } from './icons';

interface ErrorAlertProps {
  message: string;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ message }) => (
  <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-danger text-red-700 dark:text-red-300 p-4 my-6 rounded-r-lg" role="alert">
    <div className="flex">
        <div className="py-1">
            <WarningIcon className="h-6 w-6 text-danger dark:text-red-400 mr-4"/>
        </div>
        <div>
            <p className="font-bold">분석 오류</p>
            <p className="text-sm">{message}</p>
        </div>
    </div>
  </div>
);
