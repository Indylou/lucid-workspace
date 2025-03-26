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
  Loader2
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

// Event type for calendar
interface CalendarEvent {
  id: string
  title: string
  date: Date
  type: 'task' | 'event' | 'reminder'
  completed?: boolean
  taskId?: string
}

export function CalendarModule() {
  const { user } = useAuth()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // Fetch events and tasks for the calendar
  useEffect(() => {
    const fetchCalendarData = async () => {
      setIsLoading(true)
      
      try {
        if (!user) {
          throw new Error('User not authenticated')
        }
        
        // Get the first and last day of the current month view
        // Add buffer dates to include tasks from adjacent months that might be displayed
        const monthStart = startOfMonth(currentMonth)
        const monthEnd = endOfMonth(currentMonth)
        const firstDayDisplay = subMonths(monthStart, 1) // Get from previous month
        const lastDayDisplay = addMonths(monthEnd, 1) // Get through next month
        
        // Format dates for Supabase query
        const startDateISO = formatISO(firstDayDisplay)
        const endDateISO = formatISO(lastDayDisplay)
        
        // Fetch tasks with due dates from Supabase 
        const { data: tasks, error: tasksError } = await supabase
          .from('todos')
          .select('*')
          .eq('user_id', user.id)
          .not('due_date', 'is', null);
        
        if (tasksError) {
          throw new Error(tasksError.message)
        }
        
        // Convert tasks with due dates to calendar events
        const taskEvents: CalendarEvent[] = tasks
          .map(task => ({
            id: `task-${task.id}`,
            title: task.content || 'Untitled Task',
            date: parseISO(task.due_date),
            type: 'task',
            completed: task.completed,
            taskId: task.id
          }))
        
        // Fetch calendar events from Supabase 'calendar_events' table
        const { data: calendarEvents, error: eventsError } = await supabase
          .from('calendar_events')
          .select('*')
          .eq('creator_id', user.id)
          .gte('date', startDateISO)
          .lte('date', endDateISO)
        
        if (eventsError) {
          console.error('Error fetching calendar events:', eventsError)
          // Don't throw here - we can still show task events even if event fetch fails
        }
        
        // Convert calendar events to our format
        const regularEvents: CalendarEvent[] = (calendarEvents || []).map(event => ({
          id: event.id,
          title: event.title,
          date: parseISO(event.date),
          type: event.type || 'event'
        }))
        
        // Combine both types of events
        setEvents([...taskEvents, ...regularEvents])
        
      } catch (error) {
        console.error('Error fetching calendar data:', error)
        toast({
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

  // Handle creating a new event
  const handleCreateEvent = async (eventData: { title: string; date: string; time: string; type: 'event' | 'reminder' }) => {
    try {
      if (!user) {
        throw new Error('User not authenticated')
      }
      
      // Combine date and time
      const dateTime = `${eventData.date}T${eventData.time || '00:00'}:00`
      const eventDate = new Date(dateTime)
      
      // Create event in Supabase
      const { data, error } = await supabase
        .from('calendar_events')
        .insert([
          {
            title: eventData.title,
            date: formatISO(eventDate),
            type: eventData.type,
            creator_id: user.id,
            created_at: formatISO(new Date())
          }
        ])
        .select()
        .single()
      
      if (error) {
        throw new Error(error.message)
      }
      
      // Add new event to local state
      const newEvent: CalendarEvent = {
        id: data.id,
        title: data.title,
        date: parseISO(data.date),
        type: data.type
      }
      
      setEvents(prevEvents => [...prevEvents, newEvent])
      setCreateDialogOpen(false)
      
      toast({
        title: 'Event created',
        description: 'Your event has been added to the calendar'
      })
      
    } catch (error) {
      console.error('Error creating event:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create event'
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
    return events.filter(event => isSameDay(event.date, date))
  }

  // Handle day click
  const handleDayClick = (date: Date) => {
    setSelectedDay(date)
    setCreateDialogOpen(true)
  }

  // Get upcoming events (next 7 days)
  const upcomingEvents = events
    .filter(event => {
      const today = new Date()
      const oneWeekFromNow = addMonths(today, 1) // Show events up to a month ahead
      return isAfter(event.date, today) && isBefore(event.date, oneWeekFromNow)
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5) // Limit to 5 events

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">Manage your schedule and view upcoming tasks</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <CreateEventDialog 
              selectedDate={selectedDay || new Date()}
              onSubmit={handleCreateEvent}
              onCancel={() => setCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
      
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-semibold">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" onClick={handleToday}>
              Today
            </Button>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center h-[500px]">
              <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Main Calendar */}
              <Card className="lg:col-span-3">
                <CardContent className="p-0">
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
                  <div>
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
                    <div className="grid grid-cols-7 auto-rows-fr">
                      {calendarDays.map((day, i) => {
                        const eventsForDay = getEventsForDay(day)
                        const isCurrentMonth = isSameMonth(day, currentMonth)
                        const isToday = isSameDay(day, new Date())
                        
                        return (
                          <div 
                            key={i} 
                            className={`min-h-[80px] border-b border-r p-1 ${
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
                              {eventsForDay.slice(0, 2).map(event => (
                                <div 
                                  key={event.id} 
                                  className={`text-xs truncate rounded-sm px-1.5 py-0.5 ${
                                    event.type === 'event' ? 'bg-blue-100 text-blue-800' :
                                    event.type === 'reminder' ? 'bg-amber-100 text-amber-800' :
                                    event.type === 'task' && event.completed ? 'bg-green-100 text-green-800 line-through' :
                                    'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {event.title}
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
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-lg font-medium mb-4">Upcoming Events</h3>
                  
                  {upcomingEvents.length === 0 ? (
                    <div className="py-8 text-center">
                      <CalendarIcon className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-muted-foreground">No upcoming events</p>
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
                        Create Event
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingEvents.map(event => (
                        <div key={event.id} className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50">
                          <div className={`mt-0.5 rounded-full w-3 h-3 ${
                            event.type === 'event' ? 'bg-blue-500' :
                            event.type === 'reminder' ? 'bg-amber-500' :
                            event.type === 'task' && event.completed ? 'bg-green-500' :
                            'bg-red-500'
                          }`} />
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${
                              event.type === 'task' && event.completed ? 'line-through text-muted-foreground' : ''
                            }`}>
                              {event.title}
                            </p>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Clock className="mr-1 h-3 w-3" />
                              {format(event.date, 'MMM d, yyyy')}
                              {event.type === 'task' && (
                                <span className="ml-2 bg-red-100 text-red-800 rounded-full text-xs px-2">Task</span>
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
                        Create Event
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Dialog for creating a new event
function CreateEventDialog({
  selectedDate,
  onSubmit,
  onCancel
}: {
  selectedDate: Date
  onSubmit: (data: { title: string; date: string; time: string; type: 'event' | 'reminder' }) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(format(selectedDate, 'yyyy-MM-dd'))
  const [time, setTime] = useState('')
  const [type, setType] = useState<'event' | 'reminder'>('event')
  const [error, setError] = useState('')
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    
    onSubmit({
      title,
      date,
      time,
      type
    })
  }
  
  return (
    <>
      <DialogHeader>
        <DialogTitle>Create New Event</DialogTitle>
        <DialogDescription>
          Add a new event or reminder to your calendar
        </DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-md p-3 mb-4 flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            {error}
          </div>
        )}
        
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input 
              id="title" 
              placeholder="Event title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input 
                id="date" 
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time (optional)</Label>
              <Input 
                id="time" 
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Event Type</Label>
            <div className="flex gap-4">
              <div className="flex items-center">
                <input 
                  id="type-event" 
                  type="radio" 
                  name="event-type" 
                  value="event"
                  checked={type === 'event'}
                  onChange={() => setType('event')}
                  className="mr-2"
                />
                <Label htmlFor="type-event" className="cursor-pointer">Event</Label>
              </div>
              <div className="flex items-center">
                <input 
                  id="type-reminder" 
                  type="radio" 
                  name="event-type" 
                  value="reminder"
                  checked={type === 'reminder'}
                  onChange={() => setType('reminder')}
                  className="mr-2"
                />
                <Label htmlFor="type-reminder" className="cursor-pointer">Reminder</Label>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="mt-6">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Create Event</Button>
        </DialogFooter>
      </form>
    </>
  )
} 