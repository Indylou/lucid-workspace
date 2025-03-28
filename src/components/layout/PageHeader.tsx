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
    <div className="border-b pb-4 mb-4">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {action && (
          <Button onClick={action.onClick} size="default" className="gap-2">
            <PlusCircle className="h-4 w-4" />
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
} 