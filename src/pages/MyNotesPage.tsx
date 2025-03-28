import React from 'react';
import AppLayout from '../components/layout/AppLayout';
import { PageHeader } from '../components/layout/PageHeader';
import { NotesList } from '../components/NotesList';

export default function MyNotesPage() {
  const handleAddNote = () => {
    // Add note functionality
  };

  return (
    <AppLayout>
      <div className="h-full flex flex-col p-6 gap-4 overflow-hidden">
        <PageHeader
          title="My Notes"
          description="Manage your personal and team notes"
          action={{
            label: "New Note",
            onClick: handleAddNote
          }}
        />

        <div className="flex-1 overflow-hidden">
          <NotesList />
        </div>
      </div>
    </AppLayout>
  );
} 