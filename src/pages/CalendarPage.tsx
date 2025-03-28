import AppLayout from "../components/layout/AppLayout";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Video, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";
import { useState } from "react";
import { Badge } from "../components/ui/badge";

interface Task {
  id: string;
  title: string;
  start: string;
  end: string;
  category: 'design' | 'development' | 'planning';
  priority: 'low' | 'medium' | 'high';
  progress: number;
}

const HOURS = Array.from({ length: 24 }, (_, i) => 
  `${i.toString().padStart(2, '0')}:00`
);

const SAMPLE_TASKS: Task[] = [
  {
    id: '1',
    title: 'Design System Updates',
    start: '09:00',
    end: '12:00',
    category: 'design',
    priority: 'high',
    progress: 75
  },
  {
    id: '2',
    title: 'API Integration',
    start: '13:00',
    end: '17:00',
    category: 'development',
    priority: 'medium',
    progress: 30
  }
];

const getCategoryColor = (category: Task['category']) => {
  switch (category) {
    case 'design':
      return 'bg-purple-500/10 text-purple-500';
    case 'development':
      return 'bg-blue-500/10 text-blue-500';
    case 'planning':
      return 'bg-green-500/10 text-green-500';
    default:
      return 'bg-gray-500/10 text-gray-500';
  }
};

const getPriorityColor = (priority: Task['priority']) => {
  switch (priority) {
    case 'high':
      return 'bg-red-500/10 text-red-500';
    case 'medium':
      return 'bg-yellow-500/10 text-yellow-500';
    case 'low':
      return 'bg-green-500/10 text-green-500';
    default:
      return 'bg-gray-500/10 text-gray-500';
  }
};

export default function CalendarPage() {
  const [view, setView] = useState<'day' | 'week'>('day');
  const [currentDate, setCurrentDate] = useState(new Date());

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  return (
    <AppLayout>
      <div className="h-full flex flex-col p-6 gap-4 overflow-hidden">
        {/* Page header */}
        <div className="shrink-0">
          <h2 className="text-2xl font-semibold tracking-tight">Calendar</h2>
          <p className="text-sm text-muted-foreground">
            Schedule and manage your meetings and events
          </p>
        </div>

        {/* Calendar controls */}
        <div className="shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{formatDate(currentDate)}</h1>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const newDate = new Date(currentDate);
                  newDate.setDate(currentDate.getDate() - 1);
                  setCurrentDate(newDate);
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const newDate = new Date(currentDate);
                  newDate.setDate(currentDate.getDate() + 1);
                  setCurrentDate(newDate);
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8",
                view === 'day' && "bg-muted"
              )}
              onClick={() => setView('day')}
            >
              Day
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8",
                view === 'week' && "bg-muted"
              )}
              onClick={() => setView('week')}
            >
              Week
            </Button>
            <Button size="sm" className="h-8">
              <Plus className="h-4 w-4 mr-1" />
              New Meeting
            </Button>
          </div>
        </div>

        {/* Calendar content - scrollable */}
        <Card className="flex-1 min-h-0 p-4">
          <div className="h-full relative">
            {/* Time markers */}
            <div className="absolute left-0 top-0 bottom-0 w-16 border-r">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="h-20 flex items-start justify-end pr-2 text-xs text-muted-foreground"
                >
                  {hour}
                </div>
              ))}
            </div>

            {/* Events */}
            <div className="ml-16 relative h-full overflow-y-auto">
              {/* Current time indicator */}
              <div
                className="absolute left-0 right-0 border-t border-primary"
                style={{
                  top: `${(new Date().getHours() * 60 + new Date().getMinutes()) * (80 / 60)}px`
                }}
              >
                <div className="absolute -left-2 -top-1 h-2 w-2 rounded-full bg-primary" />
              </div>

              {/* Meetings */}
              {SAMPLE_TASKS.map((task) => {
                const [startHour, startMinute] = task.start.split(':').map(Number);
                const [endHour, endMinute] = task.end.split(':').map(Number);
                const top = (startHour * 60 + startMinute) * (80 / 60);
                const height = ((endHour * 60 + endMinute) - (startHour * 60 + startMinute)) * (80 / 60);

                return (
                  <Card
                    key={task.id}
                    className="absolute left-2 right-2 rounded-lg border-border/50 hover:border-border transition-colors cursor-pointer overflow-hidden group"
                    style={{
                      top: `${top}px`,
                      height: `${height}px`
                    }}
                  >
                    <div className="h-full bg-gradient-to-br from-card to-card/50 p-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-sm">{task.title}</h4>
                          <p className="text-xs text-muted-foreground">
                            {task.start} - {task.end}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Badge variant="secondary" className={cn("h-5", getCategoryColor(task.category))}>
                            {task.category}
                          </Badge>
                          <Badge variant="secondary" className={cn("h-5", getPriorityColor(task.priority))}>
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="h-1 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
} 