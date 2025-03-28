import AppLayout from "../components/layout/AppLayout";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Play, Pause, Clock, Users, CheckCircle2, BarChart2, Plus, Bell, Search, Brain, MessageSquare, Zap, ArrowUpRight, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "../lib/utils";
import TaskBoard from "../components/TaskBoard";

interface TimeTracking {
  isRunning: boolean;
  currentTime: number;
  todayTotal: number;
}

export default function DashboardPage() {
  const [timeTracking, setTimeTracking] = useState<TimeTracking>({
    isRunning: false,
    currentTime: 0,
    todayTotal: 0,
  });

  // Update timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timeTracking.isRunning) {
      interval = setInterval(() => {
        setTimeTracking(prev => ({
          ...prev,
          currentTime: prev.currentTime + 1,
          todayTotal: prev.todayTotal + 1
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timeTracking.isRunning]);

  // Format time as HH:MM:SS
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <AppLayout>
      <div className="h-full flex flex-col p-6 gap-4 overflow-hidden">
        {/* Page header */}
        <div className="shrink-0">
          <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Your team's overview and insights
          </p>
        </div>

        {/* Dashboard content - scrollable */}
        <div className="flex-1 min-h-0 space-y-4 overflow-y-auto">
          {/* Search and notifications */}
          <div className="flex items-center justify-between">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                className="h-9 w-64 rounded-full bg-muted/50 px-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium flex items-center justify-center text-primary-foreground">3</span>
            </Button>
          </div>

          {/* Top Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Time Tracking */}
            <Card className="p-6 backdrop-blur-sm bg-card/50 border-border/50 hover:bg-card/60 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">Time Tracking</h3>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="relative w-32 h-32 mb-4">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="60"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-muted/20"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="60"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-primary"
                      strokeDasharray={`${(timeTracking.currentTime / (8 * 3600)) * 377} 377`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-2xl font-bold font-mono">
                      {formatTime(timeTracking.currentTime)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      of 8h
                    </div>
                  </div>
                </div>
                <Button
                  variant={timeTracking.isRunning ? "destructive" : "default"}
                  size="sm"
                  className="w-20"
                  onClick={() => setTimeTracking(prev => ({ ...prev, isRunning: !prev.isRunning }))}
                >
                  {timeTracking.isRunning ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </Card>

            {/* Quick Stats */}
            <Card className="p-6 backdrop-blur-sm bg-card/50 border-border/50 hover:bg-card/60 transition-colors">
              <h3 className="text-sm font-medium mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Tasks Completed</span>
                  </div>
                  <span className="text-sm font-medium">12/15</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Team Members</span>
                  </div>
                  <span className="text-sm font-medium">8</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Project Progress</span>
                  </div>
                  <span className="text-sm font-medium">75%</span>
                </div>
              </div>
            </Card>

            {/* Activity */}
            <Card className="p-6 backdrop-blur-sm bg-card/50 border-border/50 hover:bg-card/60 transition-colors">
              <h3 className="text-sm font-medium mb-4">Recent Activity</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm">New comment on Project X</p>
                    <p className="text-xs text-muted-foreground">2 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm">Task completed by Sarah</p>
                    <p className="text-xs text-muted-foreground">15 minutes ago</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Team & AI Insights Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Team Collaboration */}
            <Card className="p-6 backdrop-blur-sm bg-card/50 border-border/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">Team Collaboration</h3>
                <Button variant="ghost" size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-4">
                <div className="flex -space-x-2">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-8 w-8 rounded-full border-2 border-background",
                        i === 0 && "bg-red-500",
                        i === 1 && "bg-blue-500",
                        i === 2 && "bg-green-500",
                        i === 3 && "bg-yellow-500",
                        i === 4 && "bg-purple-500"
                      )}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 rounded-full bg-muted">
                    <div className="h-full w-3/4 rounded-full bg-primary" />
                  </div>
                  <span className="text-sm font-medium">75%</span>
                </div>
              </div>
            </Card>

            {/* AI Insights */}
            <Card className="p-6 backdrop-blur-sm bg-card/50 border-border/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">AI Insights</h3>
                <Brain className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm">Productivity peak detected</p>
                    <p className="text-xs text-muted-foreground">Team performance is optimal between 10 AM - 2 PM</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm">Resource optimization</p>
                    <p className="text-xs text-muted-foreground">Consider redistributing tasks for better efficiency</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Recent Projects */}
          <Card className="p-6 backdrop-blur-sm bg-card/50 border-border/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Recent Projects</h3>
              <Button variant="ghost" size="sm">
                View All
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              {[
                { name: "Project X", progress: 75, color: "bg-blue-500" },
                { name: "Project Y", progress: 45, color: "bg-green-500" },
                { name: "Project Z", progress: 90, color: "bg-purple-500" }
              ].map((project, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className={cn("h-2 w-2 rounded-full", project.color)} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{project.name}</span>
                      <span className="text-sm text-muted-foreground">{project.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", project.color)}
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Task Board */}
          <Card className="flex-1 min-h-[500px] p-6 backdrop-blur-sm bg-card/50 border-border/50">
            <TaskBoard />
          </Card>
        </div>
      </div>
    </AppLayout>
  );
} 