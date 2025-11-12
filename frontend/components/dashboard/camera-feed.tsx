import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video } from "lucide-react";

type CameraFeedProps = {
  title: string;
  imageUrl: string; // This will now be the URL to the stream
  imageHint: string;
};

export default function CameraFeed({ title, imageUrl, imageHint }: CameraFeedProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-headline text-lg font-medium">{title}</CardTitle>
        <Video className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="aspect-video w-full overflow-hidden rounded-lg border">
          {/* We replace 'next/image' with a standard 'img' tag.
            The 'src' prop will now point directly to your Flask server's
            video feed route (e.g., http://localhost:5000/fire_video_feed).
          */}
          <img
            src={imageUrl}
            alt={title}
            data-ai-hint={imageHint}
            className="h-full w-full object-cover"
          />
        </div>
      </CardContent>
    </Card>
  );
}