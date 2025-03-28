import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Plus, MoreVertical, AlertCircle, Clock, MessageCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/utils";

interface Task {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  dueDate: string;
  comments: number;
  assignee: {
    name: string;
    avatar: string;
  };
  tags: string[];
}

interface Column {
  id: string;
  title: string;
  tasks: Task[];
  color: string;
}

export default function TaskBoard() {
  const [columns, setColumns] = useState<Column[]>([
    {
      id: "todo",
      title: "To Do",
      color: "from-blue-500/20 to-blue-500/30",
      tasks: [
        {
          id: "task-1",
          title: "Update user dashboard",
          description: "Implement new analytics charts",
          priority: "high",
          dueDate: "2024-03-25",
          comments: 3,
          assignee: { name: "Alex K.", avatar: "🧑‍💻" },
          tags: ["frontend", "analytics"]
        },
        {
          id: "task-2",
          title: "API Documentation",
          description: "Write docs for new endpoints",
          priority: "medium",
          dueDate: "2024-03-26",
          comments: 1,
          assignee: { name: "Maria S.", avatar: "👩‍💼" },
          tags: ["documentation"]
        }
      ]
    },
    {
      id: "in-progress",
      title: "In Progress",
      color: "from-yellow-500/20 to-yellow-500/30",
      tasks: [
        {
          id: "task-3",
          title: "User authentication",
          description: "Implement OAuth flow",
          priority: "high",
          dueDate: "2024-03-24",
          comments: 5,
          assignee: { name: "John D.", avatar: "👨‍💻" },
          tags: ["backend", "security"]
        }
      ]
    },
    {
      id: "review",
      title: "Review",
      color: "from-purple-500/20 to-purple-500/30",
      tasks: [
        {
          id: "task-4",
          title: "Mobile responsiveness",
          description: "Fix layout issues on small screens",
          priority: "medium",
          dueDate: "2024-03-23",
          comments: 2,
          assignee: { name: "Sarah L.", avatar: "👩‍💻" },
          tags: ["frontend", "mobile"]
        }
      ]
    },
    {
      id: "done",
      title: "Done",
      color: "from-green-500/20 to-green-500/30",
      tasks: [
        {
          id: "task-5",
          title: "Search functionality",
          description: "Implement elastic search",
          priority: "high",
          dueDate: "2024-03-22",
          comments: 4,
          assignee: { name: "Mike R.", avatar: "👨‍💼" },
          tags: ["backend", "search"]
        }
      ]
    }
  ]);

  const handleDragStart = (e: React.DragEvent, taskId: string, sourceColumnId: string) => {
    e.dataTransfer.setData("taskId", taskId);
    e.dataTransfer.setData("sourceColumnId", sourceColumnId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    const sourceColumnId = e.dataTransfer.getData("sourceColumnId");

    if (sourceColumnId === targetColumnId) return;

    setColumns(prevColumns => {
      const newColumns = [...prevColumns];
      const sourceColumn = newColumns.find(col => col.id === sourceColumnId);
      const targetColumn = newColumns.find(col => col.id === targetColumnId);
      const taskToMove = sourceColumn?.tasks.find(task => task.id === taskId);

      if (sourceColumn && targetColumn && taskToMove) {
        sourceColumn.tasks = sourceColumn.tasks.filter(task => task.id !== taskId);
        targetColumn.tasks = [...targetColumn.tasks, taskToMove];
      }

      return newColumns;
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Task Board</h2>
          <p className="text-sm text-muted-foreground">Drag and drop tasks to update their status</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-1" />
          Add Task
        </Button>
      </div>

      <div className="flex-1 grid grid-cols-4 gap-4 min-h-0">
        {columns.map(column => (
          <div
            key={column.id}
            className="flex flex-col min-h-0"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  column.id === "todo" ? "bg-blue-500" :
                  column.id === "in-progress" ? "bg-yellow-500" :
                  column.id === "review" ? "bg-purple-500" :
                  "bg-green-500"
                )} />
                <h3 className="text-sm font-medium">{column.title}</h3>
                <span className="text-xs text-muted-foreground">
                  ({column.tasks.length})
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 space-y-3 min-h-0 overflow-y-auto">
              {column.tasks.map(task => (
                <Card
                  key={task.id}
                  className={cn(
                    "p-3 shadow-sm hover:shadow-md transition-all cursor-move",
                    "bg-gradient-to-br backdrop-blur-sm",
                    column.color
                  )}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id, column.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-medium">{task.title}</h4>
                    <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    {task.description}
                  </p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {task.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-background/50"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-background/50 flex items-center justify-center text-sm">
                        {task.assignee.avatar}
                      </div>
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        task.priority === "high" ? "bg-red-500" :
                        task.priority === "medium" ? "bg-yellow-500" :
                        "bg-green-500"
                      )} />
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        <span className="text-xs">{task.comments}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span className="text-xs">
                          {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 