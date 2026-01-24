import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  onClick?: () => void;
}

export function StatCard({ title, value, icon, onClick }: StatCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 ${
        onClick ? 'cursor-pointer hover:border-[#9E89FF] dark:hover:border-[#9E89FF] hover:shadow-md transition-all' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-600 dark:text-gray-400">{title}</span>
        {icon}
      </div>
      <p className="text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}