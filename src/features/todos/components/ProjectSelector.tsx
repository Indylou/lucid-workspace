import React, { useState } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../components/ui/popover"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Folder, Plus } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { toast } from '../../../components/ui/use-toast'

interface Project {
  id: string
  name: string
}

interface ProjectSelectorProps {
  onSelect: (projectId: string) => void
  currentProjectId?: string
}

export function ProjectSelector({ onSelect, currentProjectId }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [newProjectName, setNewProjectName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  // Fetch projects when popover opens
  React.useEffect(() => {
    if (isOpen) {
      fetchProjects()
    }
  }, [isOpen])

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name')

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
      toast({
        title: 'Error',
        description: 'Failed to load projects',
        variant: 'destructive',
      })
    }
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([{ name: newProjectName.trim() }])
        .select()
        .single()

      if (error) throw error

      setProjects([...projects, data])
      setNewProjectName('')
      toast({
        title: 'Success',
        description: 'Project created successfully',
      })

      // Select the newly created project
      onSelect(data.id)
      setIsOpen(false)
    } catch (error) {
      console.error('Error creating project:', error)
      toast({
        title: 'Error',
        description: 'Failed to create project',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[200px] justify-start">
          <Folder className="mr-2 h-4 w-4" />
          {currentProjectId ? 
            projects.find(p => p.id === currentProjectId)?.name || 'Select Project' 
            : 'Select Project'
          }
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <div className="p-2 border-b">
          <div className="flex gap-2">
            <Input
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="New project name"
              className="h-8"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateProject()
                }
              }}
            />
            <Button
              size="sm"
              disabled={isLoading || !newProjectName.trim()}
              onClick={handleCreateProject}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="max-h-[200px] overflow-y-auto">
          {projects.map((project) => (
            <Button
              key={project.id}
              variant="ghost"
              className="w-full justify-start font-normal"
              onClick={() => {
                onSelect(project.id)
                setIsOpen(false)
              }}
            >
              {project.name}
            </Button>
          ))}
          {projects.length === 0 && (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              No projects yet
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
} 