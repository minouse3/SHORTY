
'use client';

import React, { useContext } from "react";
import Header from "@/components/header";
import KitchenPanel from "@/components/dashboard/kitchen-panel";
import FrontDoorPanel from "@/components/dashboard/front-door-panel";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { SystemModeContext } from "@/context/SystemModeContext";
import NotificationLogPanel from "@/components/dashboard/notification-log";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  const { notifications, toggleAlarm, isAlarmActive } = useContext(SystemModeContext);

  return (
    <Sheet>
      <div className="flex flex-col min-h-screen">
        <Header>
            <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                    <Bell className="h-4 w-4" />
                    <span className="sr-only">Open notifications</span>
                </Button>
            </SheetTrigger>
        </Header>
        <main className="flex-1 p-4 sm:p-6 md:p-8">
            <Tabs defaultValue="front-door" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="front-door">Front Door</TabsTrigger>
                    <TabsTrigger value="kitchen">Kitchen</TabsTrigger>
                </TabsList>
                <TabsContent value="front-door">
                    <div className="mt-6">
                        <FrontDoorPanel />
                    </div>
                </TabsContent>
                <TabsContent value="kitchen">
                    <div className="mt-6">
                        <KitchenPanel />
                    </div>
                </TabsContent>
            </Tabs>
        </main>
      </div>

      <SheetContent className="w-[400px] sm:w-[540px] p-0 flex flex-col">
        <SheetHeader className="p-6">
          <SheetTitle>Notification Log</SheetTitle>
        </SheetHeader>
        <NotificationLogPanel
          notifications={notifications}
          toggleAlarm={toggleAlarm}
          isAlarmActive={isAlarmActive}
        />
      </SheetContent>
    </Sheet>
  );
}
