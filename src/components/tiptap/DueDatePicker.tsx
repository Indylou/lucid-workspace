import * as React from "react"
import { Calendar, Clock } from "lucide-react"
import { format } from "date-fns"
import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover"
import { Calendar as CalendarComponent } from "../ui/calendar"

interface DueDatePickerProps {
  date: Date | undefined
  onSelect: (date: Date | undefined) => void
  triggerClassName?: string
}

export function DueDatePicker({ date, onSelect, triggerClassName }: DueDatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (selectedDate: Date | undefined) => {
    onSelect(selectedDate)
    setOpen(false)
  }

  const handleClear = () => {
    onSelect(undefined)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "flex gap-2 items-center",
            date && "text-blue-500",
            triggerClassName
          )}
        >
          <Calendar className="h-4 w-4" />
          {date ? format(date, "MMM d, yyyy") : "Set due date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarComponent
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
        />
        {date && (
          <div className="p-3 border-t flex justify-between">
            <Button variant="ghost" size="sm" onClick={handleClear}>
              Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
} 