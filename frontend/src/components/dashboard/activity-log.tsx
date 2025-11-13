
"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { User, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import type { Notification } from "@/context/SystemStateContext";


type ActivityLogProps = {
  activities: Notification[];
  onSelectActivity: (activity: Notification) => void;
};

const ActivityItem = ({ activity, onSelect }: { activity: Notification, onSelect: (activity: Notification) => void }) => {
    const [formattedTimestamp, setFormattedTimestamp] = useState("");

    useEffect(() => {
        setFormattedTimestamp(format(activity.timestamp, "MMM d, yyyy 'at' h:mm a"));
    }, [activity.timestamp]);

    return (
        <div 
            key={activity.id} 
            onClick={() => onSelect(activity)}
            className="flex items-center gap-4 hover:bg-accent p-2 rounded-lg cursor-pointer transition-colors"
        >
            <Avatar className="h-12 w-12">
            <AvatarImage src={activity.imageUrl} alt={activity.title} data-ai-hint={activity.imageHint} />
            <AvatarFallback>{activity.title.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
            <div className="flex items-center justify-between">
                <p className="font-semibold">{activity.title}</p>
                <Badge
                variant={activity.status === "Known" ? "secondary" : "destructive"}
                className={cn(
                    "text-xs",
                    activity.status === "Known" && "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700",
                )}
                >
                {activity.status}
                </Badge>
            </div>
            <p className="text-xs text-muted-foreground h-4">
                {formattedTimestamp}
            </p>
            </div>
        </div>
    );
};


export default function ActivityLog({ activities, onSelectActivity }: ActivityLogProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const visibleActivities = activities.slice(0, 3);
  const hiddenActivities = activities.slice(3);

  return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="font-headline text-lg font-medium">Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col gap-4">
              {activities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center py-10">
                      <User className="h-10 w-10 mb-2"/>
                      <p className="text-sm">No activity detected yet.</p>
                  </div>
              ) : (
                <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                    <div className="flex flex-col gap-4">
                        {visibleActivities.map((activity) => (
                            <ActivityItem key={activity.id} activity={activity} onSelect={onSelectActivity} />
                        ))}
                    </div>
                    {hiddenActivities.length > 0 && (
                        <>
                            <CollapsibleContent className="flex flex-col gap-4 mt-4 animate-in fade-in-0 zoom-in-95">
                                {hiddenActivities.map((activity) => (
                                    <ActivityItem key={activity.id} activity={activity} onSelect={onSelectActivity} />
                                ))}
                            </CollapsibleContent>
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" className="w-full mt-4">
                                    {isExpanded ? "Show Less" : `Show ${hiddenActivities.length} More`}
                                    <ChevronDown className={cn("h-4 w-4 ml-2 transition-transform", isExpanded && "rotate-180")} />
                                </Button>
                            </CollapsibleTrigger>
                        </>
                    )}
                </Collapsible>
              )}
            </div>
        </CardContent>
      </Card>
  );
}
