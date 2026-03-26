import React from 'react';
import { MapPin, ArrowRight } from 'lucide-react';

const VisitorNavigationSteps = ({ gate, block, floor, flat }) => {
  // 1. Generate navigation steps dynamically based on visitor data
  const navigationSteps = [];
  
  if (gate) {
    navigationSteps.push("Enter " + gate);
  }
  if (block) {
    navigationSteps.push("Walk to " + block);
  }
  if (floor) {
    navigationSteps.push("Take Elevator to Floor " + floor);
  }
  if (flat) {
    navigationSteps.push("Reach Flat " + flat);
  }

  // If no navigation data is provided, don't render the component
  if (navigationSteps.length === 0) return null;

  return (
    <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* 4. Display as a card with title */}
      <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-3 flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
        <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Visitor Navigation</h3>
      </div>
      
      <div className="p-4">
        <div className="relative">
          {/* Vertical joining line */}
          <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-blue-100 dark:bg-blue-900/40"></div>
          
          <ul className="space-y-4 relative">
            {navigationSteps.map((step, index) => {
              const isLast = index === navigationSteps.length - 1;
              return (
                <li key={index} className="flex items-start gap-4">
                  {/* 3. Number circle icon */}
                  <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 bg-white dark:bg-gray-800 shrink-0
                    ${isLast 
                      ? 'border-green-500 text-green-600 dark:text-green-400' 
                      : 'border-blue-500 text-blue-600 dark:text-blue-400'}`}
                  >
                    <span className="text-sm font-bold">{index + 1}</span>
                  </div>
                  
                  {/* Step Description */}
                  <div className="pt-1 flex-1">
                    <p className={`text-sm md:text-base font-medium 
                      ${isLast ? 'text-green-700 dark:text-green-400' : 'text-gray-800 dark:text-gray-200'}`}
                    >
                      {step}
                    </p>
                    {!isLast && (
                      <div className="flex items-center text-xs text-blue-500 dark:text-blue-400 mt-1">
                        <span>Next Step</span>
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VisitorNavigationSteps;
