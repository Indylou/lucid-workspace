import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { EnhancedHeader } from "./EnhancedHeader";
import { Separator } from "../ui/separator";
import { FileText, Home, Settings, Users, Edit, FileEdit } from "lucide-react";

export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      
      <div className="flex">
        <aside className="w-64 border-r p-4">
          <nav className="flex flex-col space-y-1">
            <Link to="/dashboard">
              <Button variant="ghost" className="w-full justify-start">
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Button variant="ghost" className="justify-start">
              <FileText className="mr-2 h-4 w-4" />
              Documents
            </Button>
            <Button variant="ghost" className="justify-start">
              <Users className="mr-2 h-4 w-4" />
              Team
            </Button>
            <Link to="/tiptap">
              <Button variant="ghost" className="w-full justify-start">
                <Edit className="mr-2 h-4 w-4" />
                Basic Editor
              </Button>
            </Link>
            <Link to="/tiptap-enhanced">
              <Button variant="ghost" className="w-full justify-start">
                <FileEdit className="mr-2 h-4 w-4" />
                Advanced Editor
              </Button>
            </Link>
            <Separator className="my-2" />
            <Button variant="ghost" className="justify-start">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </nav>
        </aside>
        <main className="flex-1 p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">128</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Recent Edits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">24</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Shared With Me</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Favorites</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
} 