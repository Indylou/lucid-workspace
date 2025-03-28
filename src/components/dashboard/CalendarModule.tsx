import React, { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle,
  Clock,
  X,
  AlertCircle,
  Loader2,
  Flag
} from 'lucide-react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, getDay, isToday, isSameDay, parseISO, isAfter, isBefore, endOfDay, formatISO } from 'date-fns'
import { Badge } from '../ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { useAuth } from '../../App'
import { v4 as uuidv4 } from 'uuid'
import { toast } from '../ui/use-toast'
import { TodoItemAttributes, getUserTodos } from '../../features/todos/lib'
import { supabase } from '../../lib/supabase'
import { Textarea } from '../ui/textarea'
import type { Milestone } from '../../lib/supabase'
import { Checkbox } from '../ui/checkbox'

// Calendar item type that can be either a todo or milestone
interface CalendarItem {
  id: string
  title: string
  date: Date
  type: 'todo' | 'milestone' | 'reminder'
  description?: string
  completed?: boolean
  todoId?: string
  projectId?: string
}

export function CalendarModule() {
  const { user } = useAuth()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // Fetch calendar items (todos with due dates and milestones)
  useEffect(() => {
    const fetchCalendarData = async () => {
      setIsLoading(true)
      
      try {
        if (!user) {
          throw new Error('User not authenticated')
        }
        
        // Get the date range for the calendar view (with buffer)
        const monthStart = startOfMonth(currentMonth)
        const monthEnd = endOfMonth(currentMonth)
        const firstDayDisplay = subMonths(monthStart, 1)
        const lastDayDisplay = addMonths(monthEnd, 1)
        
        // Format dates for Supabase query
        const startDateISO = formatISO(firstDayDisplay)
        const endDateISO = formatISO(lastDayDisplay)
        
        // Fetch todos with due dates
        const { data: todos, error: todosError } = await supabase
          .from('todos')
          .select('*')
          .or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`)
          .not('due_date', 'is', null)
          .gte('due_date', startDateISO)
          .lte('due_date', endDateISO)
        
        if (todosError) {
          throw new Error(todosError.message)
        }
        
        // Convert todos to calendar items
        const todoItems: CalendarItem[] = (todos || []).map(todo => ({
          id: `todo-${todo.id}`,
          title: todo.content || 'Untitled Task',
          date: parseISO(todo.due_date),
          type: 'todo',
          completed: todo.completed,
          todoId: todo.id,
          projectId: todo.project_id
        }))
        
        // Fetch milestones
        const { data: milestones, error: milestonesError } = await supabase
          .from('milestones')
          .select('*')
          .eq('created_by', user.id)
          .gte('date', startDateISO)
          .lte('date', endDateISO)
        
        if (milestonesError) {
          throw new Error(milestonesError.message)
        }
        
        // Convert milestones to calendar items
        const milestoneItems: CalendarItem[] = (milestones || []).map(milestone => ({
          id: `milestone-${milestone.id}`,
          title: milestone.title,
          date: parseISO(milestone.date),
          type: milestone.type === 'reminder' ? 'reminder' : 'milestone',
          description: milestone.description,
          todoId: milestone.todo_id,
          projectId: milestone.project_id
        }))
        
        // Combine all items
        setCalendarItems([...todoItems, ...milestoneItems])
        
      } catch (error) {
        console.error('Error fetching calendar data:', error)
        toast({
          variant: "destructive",
          title: 'Error loading calendar',
          description: error instanceof Error ? error.message : 'An unexpected error occurred',
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchCalendarData()
  }, [user, currentMonth])

  // Navigate to next month
  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  // Navigate to previous month
  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  // Go to today
  const handleToday = () => {
    setCurrentMonth(new Date())
  }

  // Create new milestone
  const handleCreateMilestone = async (data: { 
    title: string
    date: string
    time: string
    type: 'milestone' | 'reminder'
    description?: string
    todoId?: string
  }) => {
    try {
      if (!user) {
        throw new Error('User not authenticated')
      }
      
      // Combine date and time
      const dateTime = data.time 
        ? `${data.date}T${data.time}:00` 
        : `${data.date}T00:00:00`
      
      const milestoneDate = new Date(dateTime)
      
      // Create milestone in Supabase
      const { data: milestone, error } = await supabase
        .from('milestones')
        .insert({
          title: data.title,
          date: formatISO(milestoneDate),
          type: data.type,
          description: data.description,
          todo_id: data.todoId,
          created_by: user.id,
          created_at: formatISO(new Date())
        })
        .select()
        .single()
      
      if (error) {
        throw error
      }
      
      // Add new milestone to local state
      const newItem: CalendarItem = {
        id: `milestone-${milestone.id}`,
        title: milestone.title,
        date: parseISO(milestone.date),
        type: milestone.type === 'reminder' ? 'reminder' : 'milestone',
        description: milestone.description,
        todoId: milestone.todo_id
      }
      
      setCalendarItems(prev => [...prev, newItem])
      setCreateDialogOpen(false)
      
      toast({
        title: 'Success!',
        description: `${data.type === 'reminder' ? 'Reminder' : 'Milestone'} has been added to your calendar`
      })
      
    } catch (error) {
      console.error('Error creating milestone:', error)
      toast({
        variant: "destructive",
        title: 'Error creating milestone',
        description: error instanceof Error ? error.message : 'Failed to create milestone'
      })
    }
  }

  // Get days of the current month view
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
  
  // Get first day of the month to determine the offset
  const startingDayIndex = getDay(monthStart)
  
  // Days to display from previous month
  const prevMonthDays = []
  if (startingDayIndex > 0) {
    const prevMonth = subMonths(monthStart, 1)
    const prevMonthEnd = endOfMonth(prevMonth)
    const numDaysFromPrevMonth = startingDayIndex
    
    for (let i = numDaysFromPrevMonth - 1; i >= 0; i--) {
      const date = new Date(prevMonthEnd)
      date.setDate(prevMonthEnd.getDate() - i)
      prevMonthDays.push(date)
    }
  }
  
  // Days to display from next month
  const nextMonthDays = []
  const totalCells = 42 // 6 rows * 7 days
  const numDaysFromNextMonth = totalCells - monthDays.length - prevMonthDays.length
  
  if (numDaysFromNextMonth > 0) {
    const nextMonth = addMonths(monthStart, 1)
    const nextMonthStart = startOfMonth(nextMonth)
    
    for (let i = 0; i < numDaysFromNextMonth; i++) {
      const date = new Date(nextMonthStart)
      date.setDate(nextMonthStart.getDate() + i)
      nextMonthDays.push(date)
    }
  }
  
  // Combine all days
  const calendarDays = [...prevMonthDays, ...monthDays, ...nextMonthDays]
  
  // Get events for a specific day
  const getEventsForDay = (date: Date) => {
    return calendarItems.filter(item => isSameDay(item.date, date))
  }

  // Handle day click
  const handleDayClick = (date: Date) => {
    setSelectedDay(date)
    setCreateDialogOpen(true)
  }

  // Get upcoming events (next 7 days)
  const upcomingEvents = calendarItems
    .filter(item => {
      const today = new Date()
      const oneWeekFromNow = addMonths(today, 1) // Show events up to a month ahead
      return isAfter(item.date, today) && isBefore(item.date, oneWeekFromNow)
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5) // Limit to 5 events

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Milestone
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <CreateMilestoneDialog 
              selectedDate={selectedDay || new Date()}
              onSubmit={handleCreateMilestone}
              onCancel={() => setCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="flex-1 px-6 pb-6 min-h-0">
        <div className="h-full flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
          ) : (
            <div className="flex flex-col h-full space-y-4">
              {/* Main Calendar */}
              <Card className="flex-1 min-h-0">
                <CardContent className="p-0 h-full flex flex-col">
                  {/* Calendar Header */}
                  <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <h2 className="text-lg font-medium">
                        {format(currentMonth, 'MMMM yyyy')}
                      </h2>
                      <Button variant="outline" size="icon" onClick={handleNextMonth}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <div>
                      <Button variant="outline" size="sm" onClick={handleToday}>
                        Today
                      </Button>
                    </div>
                  </div>
                  
                  {/* Calendar Grid */}
                  <div className="flex-1 min-h-0 overflow-auto">
                    {/* Day Names */}
                    <div className="grid grid-cols-7 text-center text-xs text-muted-foreground font-medium py-2 border-b">
                      <div>Sun</div>
                      <div>Mon</div>
                      <div>Tue</div>
                      <div>Wed</div>
                      <div>Thu</div>
                      <div>Fri</div>
                      <div>Sat</div>
                    </div>
                    
                    {/* Calendar Days */}
                    <div className="grid grid-cols-7">
                      {calendarDays.map((day, i) => {
                        const eventsForDay = getEventsForDay(day)
                        const isCurrentMonth = isSameMonth(day, currentMonth)
                        const isToday = isSameDay(day, new Date())
                        
                        return (
                          <div 
                            key={i} 
                            className={`h-24 border-b border-r p-1 ${
                              isCurrentMonth ? '' : 'text-muted-foreground/40 bg-muted/30'
                            } ${
                              isToday ? 'bg-primary/5' : ''
                            }`}
                            onClick={() => handleDayClick(day)}
                          >
                            <div className="flex justify-between items-start">
                              <span className={`text-sm p-1 rounded-full w-7 h-7 flex items-center justify-center ${
                                isToday ? 'bg-primary text-primary-foreground font-medium' : ''
                              }`}>
                                {format(day, 'd')}
                              </span>
                              
                              {eventsForDay.length > 0 && (
                                <span className="text-xs font-medium bg-primary/10 text-primary rounded-full px-2 py-0.5">
                                  {eventsForDay.length}
                                </span>
                              )}
                            </div>
                            
                            {/* Display first two events for the day */}
                            <div className="mt-1 space-y-1 overflow-hidden max-h-[52px]">
                              {eventsForDay.slice(0, 2).map(item => (
                                <div 
                                  key={item.id} 
                                  className={`text-xs truncate rounded-sm px-1.5 py-0.5 ${
                                    item.type === 'milestone' ? 'bg-[#8B5CF6] text-white' :
                                    item.type === 'reminder' ? 'bg-amber-100 text-amber-800' :
                                    item.type === 'todo' && item.completed ? 'bg-muted text-muted-foreground line-through' :
                                    'bg-card hover:bg-muted/50 text-foreground'
                                  }`}>
                                  {item.type === 'milestone' && <Flag className="h-3 w-3 inline mr-1" />}
                                  {item.title}
                                </div>
                              ))}
                              
                              {eventsForDay.length > 2 && (
                                <div className="text-xs text-muted-foreground px-1.5">
                                  +{eventsForDay.length - 2} more
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Upcoming Events */}
              <Card className="h-[200px]">
                <CardContent className="h-full p-4 overflow-auto">
                  <h3 className="text-lg font-medium mb-4">Upcoming...</h3>
                  
                  {upcomingEvents.length === 0 ? (
                    <div className="h-[calc(100%-2rem)] flex flex-col items-center justify-center">
                      <CalendarIcon className="h-10 w-10 text-muted-foreground/40 mb-3" />
                      <p className="text-muted-foreground">nothing yet!</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-4"
                        onClick={() => {
                          setSelectedDay(new Date())
                          setCreateDialogOpen(true)
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        add new
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingEvents.map(item => (
                        <div key={item.id} className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50">
                          <div className={`mt-0.5 rounded-full w-3 h-3 ${
                            item.type === 'milestone' ? 'bg-[#8B5CF6]' :
                            item.type === 'reminder' ? 'bg-amber-500' :
                            item.type === 'todo' && item.completed ? 'bg-muted' :
                            'bg-card'
                          }`} />
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${
                              item.type === 'todo' && item.completed ? 'line-through text-muted-foreground' : ''
                            }`}>
                              {item.title}
                            </p>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Clock className="mr-1 h-3 w-3" />
                              {format(item.date, 'MMM d, yyyy')}
                              {item.type === 'todo' && (
                                <span className="ml-2 bg-card text-foreground rounded-full text-xs px-2">Task</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-2"
                        onClick={() => {
                          setSelectedDay(new Date())
                          setCreateDialogOpen(true)
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        add new
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Dialog for creating a new event
function CreateMilestoneDialog({
  selectedDate,
  onSubmit,
  onCancel
}: {
  selectedDate: Date
  onSubmit: (data: { title: string; date: string; time: string; type: 'milestone' | 'reminder'; description?: string; todoId?: string }) => void
  onCancel: () => void
}) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(format(selectedDate, 'yyyy-MM-dd'))
  const [time, setTime] = useState('')
  const [type, setType] = useState<'milestone' | 'reminder'>('milestone')
  const [description, setDescription] = useState('')
  const [createTodo, setCreateTodo] = useState(false)
  const [error, setError] = useState('')
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    let todoId: string | undefined = undefined
    
    if (createTodo) {
      // Create an associated todo
      const { data: todo, error: todoError } = await supabase
        .from('todos')
        .insert({
          content: title,
          due_date: `${date}T${time || '00:00'}:00`,
          created_by: user?.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (todoError) {
        setError('Failed to create associated todo')
        return
      }
      
      todoId = todo.id
    }
    
    onSubmit({
      title,
      date,
      time,
      type,
      description,
      todoId
    })
  }
  
  return (
    <>
      <DialogHeader className="space-y-2 pb-4">
        <DialogTitle>Create New Milestone</DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          Add a new milestone or reminder to your calendar
        </DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-sm text-red-500 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        
        <div className="space-y-3">
          <div>
            <Input 
              placeholder="Milestone title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full"
              autoFocus
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Input 
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="bg-background"
            />
            <Input 
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              placeholder="Time (optional)"
              className="bg-background [color-scheme:normal]"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant={type === 'milestone' ? 'default' : 'outline'}
              size="sm"
              className={`flex-1 ${type === 'milestone' ? 'bg-[#8B5CF6] hover:bg-[#7C3AED]' : ''}`}
              onClick={() => setType('milestone')}
            >
              Milestone
            </Button>
            <Button
              type="button"
              variant={type === 'reminder' ? 'default' : 'outline'}
              size="sm"
              className={`flex-1 ${type === 'reminder' ? 'bg-[#8B5CF6] hover:bg-[#7C3AED]' : ''}`}
              onClick={() => setType('reminder')}
            >
              Reminder
            </Button>
          </div>
          
          {type === 'milestone' && (
            <div>
              <Textarea
                placeholder="Description (optional)"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full"
              />
            </div>
          )}
          
          {type === 'milestone' && (
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="create-todo"
                checked={createTodo}
                onCheckedChange={(checked) => setCreateTodo(checked as boolean)}
              />
              <Label htmlFor="create-todo" className="text-sm cursor-pointer">
                Create an associated todo item
              </Label>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" size="sm">
            Create
          </Button>
        </DialogFooter>
      </form>
    </>
  )
} 