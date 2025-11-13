
"use client";

import React, { createContext, useState, ReactNode, useContext, useEffect, useRef } from 'react';
import { SystemStateContext, SystemStateContextType } from './SystemStateContext';

type SystemMode = 'Passive' | 'Stand by';

interface SystemModeContextType extends SystemStateContextType {
  mode: SystemMode;
  toggleMode: () => void;
}

export const SystemModeContext = createContext<SystemModeContextType>({
  mode: 'Passive',
  toggleMode: () => {},
  // Default values from SystemStateContext
  doorStatus: "Closed",
  activities: [],
  notifications: [],
  addNotification: () => {},
  fireStatus: "Normal",
  smokeDetectionStatus: "Normal",
  smokeStatus: "Safe",
  lpgStatus: "Safe",
  lpgPpm: 0,
  smokePpm: 0,
  isAlarmActive: false,
  toggleAlarm: () => {},
  resetKitchenAlerts: () => {},
});

export const SystemModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<SystemMode>('Passive');
  const systemState = useContext(SystemStateContext);

  if (!systemState) {
    throw new Error("SystemModeProvider must be used within a SystemStateProvider");
  }

  const toggleMode = () => {
    setMode(prevMode => prevMode === 'Passive' ? 'Stand by' : 'Passive');
  };
  
  const value = {
    mode,
    toggleMode,
    ...systemState
  }

  return (
    <SystemModeContext.Provider value={value}>
      {children}
    </SystemModeContext.Provider>
  );
};
