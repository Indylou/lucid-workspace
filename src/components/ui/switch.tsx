import * as React from "react"
import { cn } from "../../lib/utils"

export interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, ...props }, ref) => {
    const id = React.useId()
    
    return (
      <div className="inline-flex items-center">
        <input
          type="checkbox"
          id={id}
          className="peer sr-only"
          ref={ref}
          {...props}
        />
        <label
          htmlFor={id}
          className={cn(
            "h-6 w-11 cursor-pointer rounded-full bg-input peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background relative inline-flex shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
            className
          )}
          data-state={props.checked ? "checked" : "unchecked"}
        >
          <span
            className="pointer-events-none absolute left-1 top-1 h-4 w-4 rounded-full bg-background transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
            data-state={props.checked ? "checked" : "unchecked"}
          />
        </label>
      </div>
    )
  }
)
Switch.displayName = "Switch"

export { Switch } 