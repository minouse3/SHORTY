"use client"; // We must make this a client component to use state

import React, { useState } from "react"; // Import useState
import Header from "@/components/header";
import KitchenPanel from "@/components/dashboard/kitchen-panel";
import FrontDoorPanel from "@/components/dashboard/front-door-panel";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  // Add state to track the active tab
  const [activeTab, setActiveTab] = useState("kitchen");

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <Tabs
          defaultValue="kitchen"
          className="w-full"
          // Use onValueChange to update our state
          onValueChange={(value) => setActiveTab(value)}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="kitchen">Kitchen</TabsTrigger>
            <TabsTrigger value="front-door">Front Door</TabsTrigger>
          </TabsList>

          {/* We remove TabsContent.
              Instead, we render both panels and use our state
              to conditionally hide the inactive one.
              This keeps them both mounted and their streams alive.
          */}
        </Tabs>
        
        <div className="mt-6">
          {/* Kitchen Panel Wrapper */}
          <div style={{ display: activeTab === "kitchen" ? "block" : "none" }}>
            <KitchenPanel />
          </div>

          {/* Front Door Panel Wrapper */}
          <div style={{ display: activeTab === "front-door" ? "block" : "none" }}>
            <FrontDoorPanel />
          </div>
        </div>
      </main>
    </div>
  );
}