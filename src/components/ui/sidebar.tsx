import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const sidebarVariants = cva(
  "flex flex-col overflow-hidden transition-all",
  {
    variants: {
      variant: {
        default: "bg-background",
        floating: "rounded-xl shadow-lg",
        minimal: "",
      },
      size: {
        default: "w-64",
        sm: "w-48",
        md: "w-64",
        lg: "w-80",
        collapsed: "w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface SidebarProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof sidebarVariants> {
  collapsed?: boolean;
  collapsible?: boolean;
  onToggleCollapse?: () => void;
}

interface SidebarNavProps extends React.HTMLAttributes<HTMLDivElement> {}
interface SidebarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
}
interface SidebarFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const Sidebar = React.forwardRef<
  HTMLDivElement,
  SidebarProps
>(({
  className,
  children,
  variant,
  size,
  collapsed = false,
  collapsible = false,
  onToggleCollapse,
  ...props
}, ref) => {
  const sizeToUse = collapsed ? "collapsed" : size;

  return (
    <div
      ref={ref}
      className={cn(sidebarVariants({ variant, size: sizeToUse }), className)}
      {...props}
    >
      {children}
    </div>
  );
});
Sidebar.displayName = "Sidebar";

const SidebarNav = React.forwardRef<HTMLDivElement, SidebarNavProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex-none flex flex-col space-y-1", className)}
      {...props}
    >
      {children}
    </div>
  )
);
SidebarNav.displayName = "SidebarNav";

const SidebarGroup = React.forwardRef<HTMLDivElement, SidebarGroupProps>(
  ({ className, title, children, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col", className)} {...props}>
      {title && (
        <h3 className="px-3 py-2 text-xs font-medium text-muted-foreground">
          {title}
        </h3>
      )}
      <div className="space-y-0.5">{children}</div>
    </div>
  )
);
SidebarGroup.displayName = "SidebarGroup";

const SidebarFooter = React.forwardRef<HTMLDivElement, SidebarFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("mt-auto p-4", className)}
      {...props}
    >
      {children}
    </div>
  )
);
SidebarFooter.displayName = "SidebarFooter";

export {
  Sidebar,
  SidebarNav,
  SidebarGroup,
  SidebarFooter,
}; 