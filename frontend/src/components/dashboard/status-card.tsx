
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Status = "Normal" | "Stand By" | "Safe" | "Danger" | "Warning";

type StatusCardProps = {
  title: string;
  status: Status;
  icon: React.ReactNode;
  value?: number;
  unit?: string;
  children?: React.ReactNode;
};

const statusStyles: Record<Status, string> = {
  "Normal": "text-green-600",
  "Stand By": "text-muted-foreground",
  "Safe": "text-green-600",
  "Warning": "text-yellow-500",
  "Danger": "text-red-600 animate-pulse",
};

export default function StatusCard({ title, status, icon, value, unit, children }: StatusCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-headline text-base font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", statusStyles[status])}>
          {value !== undefined ? `${value}${unit || ""}` : status}
        </div>
        <p className="text-xs text-muted-foreground">
          {value !== undefined ? `Status: ${status}` : ''}
        </p>
        {children}
      </CardContent>
    </Card>
  );
}
