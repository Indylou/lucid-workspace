import React, { useState } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@radix-ui/react-dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import { Separator } from "../ui/separator";
import { ChevronDown, LogOut, Settings, User, Pencil, Check, X, Home, FileText } from "lucide-react";
import { cn } from "../../lib/utils";
import { Link } from "react-router-dom";

export function EnhancedHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine which tab should be active based on current path
  const getActiveTab = () => {
    if (location.pathname.includes('tiptap-enhanced')) return 'advanced-editor';
    if (location.pathname.includes('tiptap')) return 'editor';
    if (location.pathname.includes('settings')) return 'settings';
    if (location.pathname.includes('team')) return 'team';
    if (location.pathname.includes('documents')) return 'notes';
    return 'dashboard';
  };

  return (
    <header className="border-b">
      <div className="relative mx-auto max-w-screen-xl flex items-center justify-between space-x-2 p-4">
        <div className="flex items-center space-x-3">
          <Link to="/" className="text-lg font-bold">
            Lucid Team
          </Link>
        </div>
        <div className="flex items-center space-x-2 md:space-x-4">
          <Tabs defaultValue={getActiveTab()} className="hidden md:block">
            <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
              <TabsTrigger 
                value="dashboard"
                className={cn(
                  "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                )}
                onClick={() => navigate("/dashboard")}
              >
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger 
                value="notes"
                className={cn(
                  "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                )}
                onClick={() => navigate("/documents")}
              >
                <FileText className="mr-2 h-4 w-4" />
                Notes
              </TabsTrigger>
              <TabsTrigger 
                value="team"
                className={cn(
                  "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                )}
              >
                Team
              </TabsTrigger>
              <TabsTrigger 
                value="settings"
                className={cn(
                  "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                )}
              >
                Settings
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Separator orientation="vertical" className="hidden md:block h-8" />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                  <AvatarFallback>SC</AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium">John Doe</p>
                  <p className="text-xs text-muted-foreground">john@example.com</p>
                </div>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
              <DropdownMenuLabel className="px-2 py-1.5 text-sm font-semibold">My Account</DropdownMenuLabel>
              <DropdownMenuSeparator className="-mx-1 my-1 h-px bg-muted" />
              <DropdownMenuItem className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="-mx-1 my-1 h-px bg-muted" />
              <DropdownMenuItem className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
} 