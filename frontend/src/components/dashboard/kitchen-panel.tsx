"use client";

import React, { useState, useEffect } from "react";
import io, { Socket } from "socket.io-client"; // Import socket.io-client
import CameraFeed from "./camera-feed";
import StatusCard from "./status-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Cloud, Gauge, RefreshCw } from "lucide-react"; // Import RefreshCw
import { useToast } from "@/hooks/use-toast";

// Define the backend server URL
const SOCKET_SERVER_URL = "http://localhost:5000";

type Status = "Normal" | "Danger";
type LpgStatus = "Safe" | "Warning" | "Danger";

// Define the shape of the alert data we expect from Python
interface HazardAlertData {
  sensor: string; // e.g., "Fire Sensor" or "Smoke Sensor"
  status: "DANGER";
  description: string;
}

export default function KitchenPanel() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [fireStatus, setFireStatus] = useState<Status>("Normal");
  const [smokeStatus, setSmokeStatus] = useState<Status>("Normal");
  const [lpgStatus, setLpgStatus] = useState<LpgStatus>("Safe");
  const [lpgValue, setLpgValue] = useState(0);
  const { toast } = useToast();

  // This useEffect connects to the Socket.IO server
  useEffect(() => {
    // Create the socket connection
    const newSocket = io(SOCKET_SERVER_URL);
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to Socket.IO server");
    });

    // Listen for the 'hazard_alert' from app.py
    newSocket.on("hazard_alert", (data: HazardAlertData) => {
      if (data.sensor.includes("Fire")) {
        setFireStatus("Danger");
        toast({
          variant: "destructive",
          title: "🔥 Fire Detected!",
          description: data.description,
        });
      } else if (data.sensor.includes("Smoke")) {
        setSmokeStatus("Danger");
        toast({
          variant: "destructive",
          title: "💨 Smoke Detected!",
          description: data.description,
        });
      }
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from Socket.IO server");
    });

    // Cleanup on component unmount
    return () => {
      newSocket.disconnect();
    };
  }, [toast]);

  // This useEffect for MOCK LPG data can remain
  useEffect(() => {
    const interval = setInterval(() => {
      const randomValue = Math.random() * 100; // 0 to 100
      setLpgValue(Math.round(randomValue));

      if (randomValue > 80) {
        setLpgStatus("Danger");
      } else if (randomValue > 60) {
        setLpgStatus("Warning");
      } else {
        setLpgStatus("Safe");
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // This function resets the frontend state AND tells the backend
  const handleResetAlerts = () => {
    // 1. Reset frontend state
    setFireStatus("Normal");
    setSmokeStatus("Normal");

    // 2. Emit the 'user_reset_alert' event to the Python server
    if (socket) {
      socket.emit("user_reset_alert", { room: "kitchen" });
    }
    
    toast({
      title: "System Reset",
      description: "Alerts have been acknowledged and reset.",
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-headline text-xl font-semibold text-foreground sm:text-2xl">
        Kitchen Section
      </h2>
      <CameraFeed
        title="Kitchen Camera"
        // Use the live feed URL from your Python server
        imageUrl={"http://localhost:5000/fire_video_feed"}
        imageHint={"live kitchen camera feed"}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatusCard title="Fire Status" status={fireStatus} icon={<Flame className="h-5 w-5" />} />
        <StatusCard title="Smoke Status" status={smokeStatus} icon={<Cloud className="h-5 w-5" />} />
        <StatusCard title="LPG Gas Level (Mock)" status={lpgStatus} value={lpgValue} unit="%" icon={<Gauge className="h-5 w-5" />} />
      </div>
       
       {/* This card is REPLACED */}
       <Card>
        <CardHeader>
          <CardTitle className="font-headline text-lg font-medium">System Control</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            If a hazard is detected, the status will turn to 'Danger'. Press this button
            to acknowledge the alert and reset the system.
          </p>
          <Button onClick={handleResetAlerts} className="w-full sm:w-auto">
            <RefreshCw className="mr-2 h-4 w-4" />
            Acknowledge & Reset Alerts
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}