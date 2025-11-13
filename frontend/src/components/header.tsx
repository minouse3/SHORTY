
'use client';

import React, { useContext } from 'react';
import { Shield } from "lucide-react";
import { Switch } from '@/components/ui/switch';
import { SystemModeContext } from '@/context/SystemModeContext';

export default function Header({ children }: { children?: React.ReactNode }) {
  const { mode, toggleMode, addNotification } = useContext(SystemModeContext);
  const isStandBy = mode === 'Stand by';

  const handleModeToggle = () => {
    const newMode = mode === 'Passive' ? 'Stand by' : 'Passive';
    addNotification({
        type: 'system',
        title: `System Mode: ${newMode}`,
        description: newMode === 'Stand by' 
            ? "Automatic alarm is now enabled." 
            : "Automatic alarm is now disabled.",
    });
    toggleMode();
  };

  return (
    <header className="flex items-center justify-between gap-4 border-b bg-card p-4 sm:p-6">
      <div className="flex items-center gap-4">
        <Shield className="h-8 w-8 text-primary" />
        <h1 className="font-headline text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          SHORTY
        </h1>
      </div>
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
            <Switch 
            id="mode-switch"
            checked={isStandBy}
            onCheckedChange={handleModeToggle}
            aria-label="Toggle between Passive and Stand by mode"
            />
        </div>
        {children}
      </div>
    </header>
  );
}
