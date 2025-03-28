import { cn } from "../../lib/utils";

interface AuthLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export default function AuthLayout({ children, className }: AuthLayoutProps) {
  return (
    <div className={cn(
      "min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 flex items-center justify-center p-4",
      className
    )}>
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
} 