import { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Bell, Search, Settings } from "lucide-react";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

interface AppLayoutProps {
  children: ReactNode;
  className?: string;
  hideHeader?: boolean;
}

export default function AppLayout({ children, className, hideHeader }: AppLayoutProps) {
  return (
    <div className="min-h-screen max-h-screen flex flex-col bg-background">
      {/* Header - fixed height */}
      {!hideHeader && (
        <header className="h-16 shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container h-full flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold">Lucid</h1>
              <div className="relative w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search anything..."
                  className="h-9 w-full rounded-full bg-muted/50 px-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium flex items-center justify-center text-primary-foreground">
                  3
                </span>
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
              <Avatar>
                <AvatarImage src="/placeholder-avatar.jpg" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>
      )}

      {/* Main content - scrollable */}
      <main className={cn(
        "flex-1 overflow-auto",
        !hideHeader && "container py-4",
        className
      )}>
        {children}
      </main>
    </div>
  );
} 