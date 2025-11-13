"use client";

// import Image from "next/image"; // <-- REMOVED
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video } from "lucide-react";
import { cn } from "@/lib/utils";


type CameraFeedProps = {
  title: string;
  imageUrl: string;
  imageHint: string;
  isAlerting?: boolean;
};

export default function CameraFeed({ title, imageUrl, imageHint, isAlerting }: CameraFeedProps) {
  return (
    <Card className={cn(isAlerting && "ring-4 ring-destructive")}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-headline text-lg font-medium">{title}</CardTitle>
        <Video className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="aspect-video w-full overflow-hidden rounded-lg border">
          {/* This is the fix: 
            Replaced the next/image <Image ... /> component 
            with a standard HTML <img> tag.
          */}
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover"
          />
        </div>
      </CardContent>
    </Card>
  );
}