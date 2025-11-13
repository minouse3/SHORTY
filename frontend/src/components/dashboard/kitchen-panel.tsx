"use client";

import React, { useContext } from "react";
import CameraFeed from "./camera-feed";
import StatusCard from "./status-card";
import { Button } from "@/components/ui/button";
import { Flame, Cloud, Gauge, CloudFog, ShieldCheck } from "lucide-react";
// import { PlaceHolderImages } from "@/lib/placeholder-images"; // No longer needed
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SystemModeContext } from "@/context/SystemModeContext";

export default function KitchenPanel() {
  const { 
      fireStatus, 
      smokeDetectionStatus, 
      smokeStatus, 
      lpgStatus, 
      lpgPpm, 
      smokePpm,
      resetKitchenAlerts
  } = useContext(SystemModeContext);
  
  const { toast } = useToast();

  /* No longer needed
  const kitchenCameraImage = PlaceHolderImages.find(
    (img) => img.id === "kitchen-camera"
  );
  */
  
  const isAlertState = fireStatus === "Danger" || smokeDetectionStatus === "Danger" || lpgStatus !== "Safe" || smokeStatus !== "Safe";

  const handleMarkAsSafe = () => {
    resetKitchenAlerts();
    toast({
        title: "System Reset",
        description: "All kitchen statuses have been marked as safe.",
    });
  }


  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-headline text-xl font-semibold text-foreground sm:text-2xl">
        Kitchen Section
      </h2>
      <div className={cn("rounded-lg", isAlertState && "ring-4 ring-destructive ring-offset-4 ring-offset-background transition-all duration-300")}>
        {/* Updated CameraFeed props */}
        <CameraFeed
            title="Kitchen Camera"
            imageUrl="http://localhost:5000/fire_video_feed"
            imageHint="kitchen"
        />
      </div>

      {isAlertState && (
        <Alert variant="destructive" className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
            <div>
                <AlertTitle className="text-lg font-bold">Alert! Unsafe Conditions Detected</AlertTitle>
                <AlertDescription>
                    One or more sensors are reporting 'Warning' or 'Danger' levels. Please verify the situation in the kitchen is resolved.
                </AlertDescription>
            </div>
            <Button onClick={handleMarkAsSafe} className="w-full sm:w-auto sm:ml-auto">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Acknowledge & Mark as Safe
            </Button>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatusCard title="Fire Status" status={fireStatus} icon={<Flame className="h-5 w-5" />} />
        <StatusCard title="Smoke Detection" status={smokeDetectionStatus} icon={<CloudFog className="h-5 w-5" />} />
        <StatusCard title="Smoke Level" status={smokeStatus} value={smokePpm} unit="ppm" icon={<Cloud className="h-5 w-5" />} />
        <StatusCard title="LPG Gas Level" status={lpgStatus} value={lpgPpm} unit="ppm" icon={<Gauge className="h-5 w-5" />} />
      </div>
    </div>
  );
}