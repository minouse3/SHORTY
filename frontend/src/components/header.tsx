import { Shield } from "lucide-react";

export default function Header() {
  return (
    <header className="flex items-center gap-4 border-b bg-card p-4 sm:p-6">
      <Shield className="h-8 w-8 text-primary" />
      <h1 className="font-headline text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        SHORTY
      </h1>
    </header>
  );
}
