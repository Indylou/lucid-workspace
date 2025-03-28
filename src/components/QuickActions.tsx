import { Button } from "./ui/button";
import { Sparkles, Clock, Calendar, AlertCircle, Plus, Brain } from "lucide-react";
import { cn } from "../lib/utils";
import { useEffect, useState } from "react";

interface QuickActionsProps {
  onQuickAdd: () => void;
  onFilterChange: (filter: string) => void;
  activeFilter: string;
}

export function QuickActions({ onQuickAdd, onFilterChange, activeFilter }: QuickActionsProps) {
  const [mounted, setMounted] = useState(false);
  
  // Handle keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onQuickAdd();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onQuickAdd]);

  // Animation on mount
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={cn(
      "flex items-center gap-2 px-6 py-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      "opacity-0 translate-y-1 transition-all duration-200",
      mounted && "opacity-100 translate-y-0"
    )}>
      <div className="flex items-center gap-1.5">
        <Button
          variant={activeFilter === 'today' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onFilterChange('today')}
          className="h-7 text-xs gap-1.5"
        >
          <Clock className="h-3.5 w-3.5" />
          Today
        </Button>
        <Button
          variant={activeFilter === 'week' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onFilterChange('week')}
          className="h-7 text-xs gap-1.5"
        >
          <Calendar className="h-3.5 w-3.5" />
          This Week
        </Button>
        <Button
          variant={activeFilter === 'priority' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onFilterChange('priority')}
          className="h-7 text-xs gap-1.5"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          Priority
        </Button>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5 text-purple-500 dark:text-purple-400 hover:text-purple-600 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors"
          onClick={() => console.log('AI Assistant - Coming soon!')}
        >
          <Brain className="h-3.5 w-3.5" />
          <Sparkles className="h-3 w-3" />
          Ask AI
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={onQuickAdd}
          className="h-7 text-xs gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Quick Add
          <kbd className="ml-1 text-[10px] text-muted-foreground">⌘K</kbd>
        </Button>
      </div>
    </div>
  );
} 