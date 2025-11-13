"use client";

// 1. Import Input, Label, and useState
import React, { useState, useContext } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DoorClosed, DoorOpen, Home, Megaphone, Siren, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import CameraFeed from "./camera-feed";
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
// 2. Import Input and Label
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


export default function FrontDoorPanel() {
  const { 
    doorStatus,
    activities,
    isAlarmActive,
    toggleAlarm,
    addNotification,
    // 3. Get the new function (this will replace `recognizePerson`)
    addNewPersonToDatabase,
  } = useContext(SystemModeContext);
  
  const [selectedActivity, setSelectedActivity] = useState<Notification | null>(null);
  // 4. Add state to hold the name from the input field
  const [personName, setPersonName] = useState("");

  const handleSelectActivity = (activity: Notification) => {
    setSelectedActivity(activity);
    // 5. Reset name field every time the dialog is opened
    setPersonName(""); 
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

  // 6. This function now sends data to the backend
  const handleRecognizePerson = () => {
    if (selectedActivity && selectedActivity.imageUrl && personName.trim() !== "") {
      
      // 7. Call the new context function with the name and image URL
      addNewPersonToDatabase(personName, selectedActivity.imageUrl);
      
      addNotification({
        type: 'system',
        title: 'Database Update Sent',
        description: `Request to add "${personName}" to the database has been sent.`,
      });
      setSelectedActivity(null); // Close the dialog
      setPersonName(""); // Reset name
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
                        <AlertDialogTitle>Add New Person</AlertDialogTitle>
                        {/* 8. Add the input field here */}
                        <AlertDialogDescription>
                          Please enter the name for this person. This will save their picture
                          to the database for future recognition.
                        </AlertDialogDescription>
                        <div className="grid gap-2 pt-4">
                          <Label htmlFor="person-name" className="text-left">
                            Name
                          </Label>
                          <Input
                            id="person-name"
                            value={personName}
                            onChange={(e) => setPersonName(e.target.value)}
                            placeholder="e.g., Jane Doe"
                          />
                        </div>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        {/* 9. Disable the button if the name is empty */}
                        <AlertDialogAction 
                          onClick={handleRecognizePerson}
                          disabled={personName.trim() === ""}
                        >
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