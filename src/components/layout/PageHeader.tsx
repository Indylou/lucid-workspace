import React from 'react';
import { Button } from '../ui/button';
import { PlusCircle } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>
      {action && (
        <Button onClick={action.onClick} size="lg" className="gap-2">
          <PlusCircle className="h-4 w-4" />
          {action.label}
        </Button>
      )}
    </div>
  );
} 