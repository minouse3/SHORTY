
"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { User, BellRing, Siren, Shield, DoorOpen, Flame, Cloud, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Notification, NotificationType } from "@/context/SystemStateContext";

type NotificationLogPanelProps = {
  notifications: Notification[];
  isAlarmActive: boolean;
  toggleAlarm: () => void;
};

const iconMap: Record<NotificationType, React.ReactNode> = {
    activity: <User className="h-5 w-5" />,
    door: <DoorOpen className="h-5 w-5" />,
    alarm: <Siren className="h-5 w-5" />,
    kitchen_fire: <Flame className="h-5 w-5" />,
    kitchen_smoke: <Cloud className="h-5 w-5" />,
    kitchen_gas: <Gauge className="h-5 w-5" />,
    system: <Shield className="h-5 w-5" />,
};

const statusVariantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    'Known': 'secondary',
    'Unknown': 'destructive',
    'Open': 'destructive',
    'Closed': 'secondary',
    'Danger': 'destructive',
    'Warning': 'destructive',
    'Safe': 'secondary',
    'Normal': 'secondary',
};

const NotificationItem = ({ notification, onSelect }: { notification: Notification, onSelect: (notification: Notification) => void }) => {
    const [formattedTimestamp, setFormattedTimestamp] = useState("");

    React.useEffect(() => {
        setFormattedTimestamp(format(notification.timestamp, "MMM d, h:mm a"));
    }, [notification.timestamp]);

    const icon = useMemo(() => iconMap[notification.type] || <BellRing className="h-5 w-5" />, [notification.type]);
    
    return (
        <div 
            onClick={() => onSelect(notification)}
            className="flex items-start gap-4 p-4 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors border-b"
        >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                {notification.imageUrl ? (
                    <Avatar className="h-10 w-10 border">
                        <AvatarImage src={notification.imageUrl} alt={notification.title} data-ai-hint={notification.imageHint} />
                        <AvatarFallback>{notification.title.charAt(0)}</AvatarFallback>
                    </Avatar>
                ) : (
                    <span className="text-muted-foreground">{icon}</span>
                )}
            </div>
            
            <div className="flex-1">
                <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{notification.title}</p>
                    <p className="text-xs text-muted-foreground">{formattedTimestamp}</p>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                    {notification.description}
                </p>
            </div>
            {notification.status && (
                <Badge
                    variant={statusVariantMap[notification.status] || 'default'}
                    className="text-xs mt-1"
                >
                    {notification.status}
                </Badge>
            )}
        </div>
    );
};

export default function NotificationLogPanel({ notifications, isAlarmActive, toggleAlarm }: NotificationLogPanelProps) {
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  return (
    <>
        <ScrollArea className="flex-1">
            <div className="flex flex-col">
              {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center p-10">
                      <BellRing className="h-12 w-12 mb-4"/>
                      <h3 className="font-semibold text-lg">No Notifications</h3>
                      <p className="text-sm">All system events will appear here.</p>
                  </div>
              ) : (
                notifications.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} onSelect={setSelectedNotification} />
                ))
              )}
            </div>
        </ScrollArea>
      
        <Dialog open={!!selectedNotification} onOpenChange={(isOpen) => !isOpen && setSelectedNotification(null)}>
            {selectedNotification && (
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{selectedNotification.title}</DialogTitle>
                    <DialogDescription>
                        {format(selectedNotification.timestamp, "PPPPp")}
                    </DialogDescription>
                </DialogHeader>
                {selectedNotification.imageUrl && (
                    <div className="flex justify-center items-center p-4">
                        <Image
                            src={selectedNotification.imageUrl.replace("100/100", "400/400")}
                            alt={`Capture of ${selectedNotification.title}`}
                            width={400}
                            height={400}
                            className="rounded-lg object-cover shadow-lg"
                            data-ai-hint={selectedNotification.imageHint}
                        />
                    </div>
                )}
                <DialogFooter className="pt-4">
                  <p className="text-sm text-muted-foreground w-full text-left">{selectedNotification.description}</p>
                  {(selectedNotification.status === "Unknown" || selectedNotification.type === 'alarm') && (
                      <Button variant={isAlarmActive ? "default" : "destructive"} onClick={toggleAlarm}>
                          <Siren className="mr-2 h-4 w-4"/>
                          {isAlarmActive ? "Turn Off Alarm" : "Ring Alarm"}
                      </Button>
                  )}
                </DialogFooter>
            </DialogContent>
            )}
        </Dialog>
    </>
  );
}
