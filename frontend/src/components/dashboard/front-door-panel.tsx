"use client";

import React, { useState, useContext } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DoorClosed, DoorOpen, Home, Megaphone, Siren, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import CameraFeed from "./camera-feed";
// import { PlaceHolderImages } from "@/lib/placeholder-images"; // No longer needed
import ActivityLog from "./activity-log";
import type { Notification } from "@/context/SystemStateContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { SystemModeContext } from "@/context/SystemModeContext";


export default function FrontDoorPanel() {
  const { 
    doorStatus,
    activities,
    isAlarmActive,
    toggleAlarm,
    addNotification,
    recognizePerson,
  } = useContext(SystemModeContext);
  
  const [selectedActivity, setSelectedActivity] = useState<Notification | null>(null);

  /* No longer needed
  const frontDoorCameraImage = PlaceHolderImages.find(
    (img) => img.id === "front-door-camera"
  );
  */
  
  const handleSelectActivity = (activity: Notification) => {
    setSelectedActivity(activity);
  };

  const handleToggleAlarm = () => {
    const newStatus = !isAlarmActive;
    addNotification({
        type: 'alarm',
        title: newStatus ? 'Alarm Activated' : 'Alarm Deactivated',
        description: newStatus ? 'The security alarm has been manually triggered.' : 'The security alarm has been turned off.',
    });
    toggleAlarm();
  };

  const handleRecognizePerson = () => {
    if (selectedActivity) {
      recognizePerson(selectedActivity.id);
      addNotification({
        type: 'system',
        title: 'Person Recognized',
        description: `Added "${selectedActivity.title}" to the database as a known person.`,
      });
      setSelectedActivity(null); // Close the dialog after action
    }
  };


  return (
    <>
      <div className="flex flex-col gap-6">
        <h2 className="font-headline text-xl font-semibold text-foreground sm:text-2xl">
          Front Door Section
        </h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            {/* Updated CameraFeed props */}
            <CameraFeed
              title="Front Door Camera"
              imageUrl="http://localhost:5000/cctv_video_feed"
              imageHint="front door"
            />
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Button variant="outline" onClick={() => addNotification({ type: 'system', title: "Audio Message Played", description: "A recorded message was played: 'I'm not at home'." })}>
                <Home className="mr-2 h-4 w-4"/> Not at Home
              </Button>
              <Button variant="outline" onClick={() => addNotification({ type: 'system', title: "Audio Warning Played", description: "A message was played at the front door." })}>
                <Megaphone className="mr-2 h-4 w-4"/> Ask to Leave
              </Button>
              <Button variant={isAlarmActive ? "destructive" : "outline"} onClick={handleToggleAlarm}>
                <Siren className="mr-2 h-4 w-4"/> {isAlarmActive ? "Turn Off Alarm" : "Ring Alarm"}
              </Button>
            </div>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="font-headline text-lg font-medium">Door Status</CardTitle>
                {doorStatus === "Closed" ? <DoorClosed className="h-6 w-6 text-muted-foreground" /> : <DoorOpen className="h-6 w-6 text-muted-foreground" />}
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "text-2xl font-bold",
                  doorStatus === "Closed" ? "text-green-600" : "text-destructive"
                )}>
                  {doorStatus}
                </div>
                <p className="text-xs text-muted-foreground">
                  MC38 Door Sensor
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1">
            <ActivityLog activities={activities} onSelectActivity={handleSelectActivity} />
          </div>
        </div>
      </div>

      <Dialog open={!!selectedActivity} onOpenChange={(isOpen) => !isOpen && setSelectedActivity(null)}>
        {selectedActivity && (
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>{selectedActivity.title}</DialogTitle>
                  <DialogDescription>
                      {format(selectedActivity.timestamp, "PPPp")}
                  </DialogDescription>
              </DialogHeader>
              <div className="flex justify-center items-center p-4">
                  <Image
                      src={selectedActivity.imageUrl?.replace("100/100", "400/400") || ''}
                      alt={`Capture of ${selectedActivity.title}`}
                      width={400}
                      height={400}
                      className="rounded-lg object-cover"
                      data-ai-hint={selectedActivity.imageHint || 'face'}
                  />
              </div>
              {selectedActivity.status === 'Unknown' && (
                <DialogFooter>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="secondary">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add to Database
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action will mark this person as "Known" and add them to your system's database. You can manage recognized individuals later in the settings.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRecognizePerson}>
                          Continue
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DialogFooter>
              )}
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}