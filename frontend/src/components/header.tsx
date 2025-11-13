'use client';

import React, { useContext } from 'react';
import { Shield } from "lucide-react";
import { Switch } from '@/components/ui/switch';
import { SystemModeContext } from '@/context/SystemModeContext';

export default function Header({ children }: { children?: React.ReactNode }) {
  // 1. Remove `addNotification`
  const { mode, toggleMode } = useContext(SystemModeContext);
  const isStandBy = mode === 'Stand by';

  // 2. Remove `handleModeToggle` function entirely
  //    The notification logic is now inside `setSystemMode`,
  //    which `toggleMode` calls.

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
            // 3. Call `toggleMode` directly
            onCheckedChange={toggleMode}
            aria-label="Toggle between Passive and Stand by mode"
            />
        </div>
        {children}
      </div>
    </header>
  );
}