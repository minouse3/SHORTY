"use client";

import React, { useState, useEffect } from "react";
import CameraFeed from "./camera-feed";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserCheck, UserX, Loader2, ShieldAlert, MessageSquare, AlertTriangle } from "lucide-react";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ConfirmationStatus = "unanswered" | "known" | "unknown";

export default function FrontDoorPanel() {
  const [isDetecting, setIsDetecting] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [confirmationStatus, setConfirmationStatus] = useState<ConfirmationStatus>("unanswered");
  const [instruction, setInstruction] = useState<string | null>(null);
  const [isAlarming, setIsAlarming] = useState(false);
  const [timer, setTimer] = useState<number | null>(null);
  
  const { toast } = useToast();

  // This part is no longer needed, as we'll use the live URL
  // const frontDoorCameraImage = PlaceHolderImages.find(
  //   (img) => img.id === "front-door-camera"
  // );

  const resetState = () => {
    setIsDetecting(false);
    setFaceDetected(false);
    setConfirmationStatus("unanswered");
    setInstruction(null);
    setIsAlarming(false);
    setTimer(null);
  };
  
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timer !== null && timer > 0) {
      interval = setInterval(() => {
        setTimer((prevTimer) => (prevTimer ? prevTimer - 1 : null));
      }, 1000);
    } else if (timer === 0) {
      handleEscalation();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer]);

  const handleDetectFaces = async () => {
    resetState();
    setIsDetecting(true);
    // Mock face detection
    setTimeout(() => {
      const detected = Math.random() > 0.3; // 70% chance of detecting a face
      setFaceDetected(detected);
      setIsDetecting(false);
      toast({
        title: "Scan Complete",
        description: detected ? "A person was detected at the door." : "No person detected.",
      });
      if (!detected) {
         setConfirmationStatus("known"); // No face, nothing to confirm
      }
    }, 2000);
  };

  const handleUserConfirmation = (known: boolean) => {
    setConfirmationStatus(known ? "known" : "unknown");
    if (known) {
      setInstruction("Inform the person that the user is not at home.");
      toast({ title: "Action Initiated", description: "Visitor will be informed you are not home." });
    } else {
      setInstruction("Inform the person to leave immediately.");
      toast({ title: "Action Initiated", description: "Unknown person has been asked to leave." });
      setTimer(60); // Start 1-minute timer for unknown person
    }
  };

  const handleEscalation = () => {
    setInstruction("Trigger the alarm.");
    setIsAlarming(true);
    toast({
      variant: "destructive",
      title: "ALARM TRIGGERED",
      description: "Unknown person did not leave. Alarm has been triggered.",
    });
  };

  return (
    <div className={cn("flex flex-col gap-6 transition-all duration-500", isAlarming && "rounded-lg ring-4 ring-destructive ring-offset-4 ring-offset-background")}>
      <h2 className="font-headline text-xl font-semibold text-foreground sm:text-2xl">
        Front Door Section
      </h2>
      <CameraFeed
        title="Front Door Camera"
        // Point to the live CCTV feed from app.py
        imageUrl={"http://localhost:5000/cctv_video_feed"}
        imageHint={"live front door camera feed"}
      />

      <Card className={cn(isAlarming && "border-destructive bg-destructive/10")}>
        <CardHeader>
          <CardTitle className="font-headline text-lg font-medium">Visitor Management (Mock-up)</CardTitle>
          <CardDescription>
            Scan for visitors at the front door and respond.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isDetecting && !faceDetected && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground"><Loader2 className="animate-spin" /> Scanning for faces...</div>
          )}
          
          {faceDetected && confirmationStatus === 'unanswered' && (
             <div className="rounded-lg border bg-accent/30 p-4">
                <p className="mb-4 text-center font-medium">A person was detected at the door. Do you know them?</p>
                <div className="flex justify-center gap-4">
                  <Button variant="outline" onClick={() => handleUserConfirmation(true)}><UserCheck className="mr-2"/> Yes, I know them</Button>
                  <Button variant="destructive" onClick={() => handleUserConfirmation(false)}><UserX className="mr-2"/> No, stranger</Button>
                </div>
              </div>
          )}
          
          {instruction && (
             <div className={cn("rounded-lg border p-4", isAlarming ? 'bg-destructive/20 text-destructive-foreground' : 'bg-background')}>
                <div className="flex items-start gap-3">
                    {isAlarming ? <ShieldAlert className="h-6 w-6 flex-shrink-0 text-destructive"/> : <MessageSquare className="h-5 w-5 flex-shrink-0 text-primary"/>}
                    <div>
                      <h4 className="font-semibold">System Instruction:</h4>
                      <p className="text-sm">{instruction}</p>
                    </div>
                </div>
            </div>
          )}

          {timer !== null && timer > 0 && (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 text-yellow-600">
                <AlertTriangle className="h-5 w-5"/>
                <p className="font-medium">Unknown person has been asked to leave. Time remaining: {timer}s</p>
            </div>
          )}

          <Button onClick={handleDetectFaces} disabled={isDetecting}>
            {isDetecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              "Scan for Visitors"
            )}
          </Button>

           {(faceDetected || instruction) && (
            <Button onClick={resetState} variant="ghost" size="sm" className="w-fit self-center">
              Reset
            </Button>
          )}

        </CardContent>
      </Card>
    </div>
  );
}