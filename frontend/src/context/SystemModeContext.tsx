"use client";

import React, { createContext, ReactNode, useContext } from 'react';
// 1. Remove useState
import { SystemStateContext, SystemStateContextType } from './SystemStateContext';

// 2. This interface now just adds `toggleMode`
interface SystemModeContextType extends SystemStateContextType {
  toggleMode: () => void;
}

// 3. Update the default context value
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
  addNewPersonToDatabase: () => {}, // Updated default
  setSystemMode: () => {}, // Add this placeholder
});

export const SystemModeProvider = ({ children }: { children: ReactNode }) => {
  // 4. Get EVERYTHING from the parent SystemStateContext
  const systemState = useContext(SystemStateContext);

  if (!systemState) {
    throw new Error("SystemModeProvider must be used within a SystemStateProvider");
  }

  // 5. Refactor toggleMode to use the parent's setter
  const toggleMode = () => {
      const newMode = systemState.mode === 'Passive' ? 'Stand by' : 'Passive';
      // Call the setter function from SystemStateContext
      systemState.setSystemMode(newMode); 
  };
  
  const value = {
    ...systemState, // Pass through all state (doorStatus, isAlarmActive, mode, etc.)
    toggleMode,     // Add our simplified toggleMode function
  }

  return (
    <SystemModeContext.Provider value={value}>
      {children}
    </SystemModeContext.Provider>
  );
};