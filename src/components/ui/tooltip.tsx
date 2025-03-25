import * as React from "react"
import { cn } from "../../lib/utils"

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  delayDuration?: number
}

export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  delayDuration = 300,
}: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const [position, setPosition] = React.useState({ top: 0, left: 0 })
  const triggerRef = React.useRef<HTMLDivElement>(null)
  const tooltipRef = React.useRef<HTMLDivElement>(null)
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    
    let top = 0
    let left = 0

    switch (side) {
      case "top":
        top = triggerRect.top - tooltipRect.height - 8
        break
      case "right":
        left = triggerRect.right + 8
        break
      case "bottom":
        top = triggerRect.bottom + 8
        break
      case "left":
        left = triggerRect.left - tooltipRect.width - 8
        break
    }

    switch (side) {
      case "top":
      case "bottom":
        switch (align) {
          case "start":
            left = triggerRect.left
            break
          case "center":
            left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2)
            break
          case "end":
            left = triggerRect.right - tooltipRect.width
            break
        }
        break
      case "left":
      case "right":
        switch (align) {
          case "start":
            top = triggerRect.top
            break
          case "center":
            top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2)
            break
          case "end":
            top = triggerRect.bottom - tooltipRect.height
            break
        }
        break
    }

    setPosition({ top, left })
  }

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
      setTimeout(calculatePosition, 0)
    }, delayDuration)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false)
    }, 100)
  }

  return (
    <div 
      ref={triggerRef}
      className="inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={cn(
            "absolute z-50 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-50 data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1",
          )}
          style={{
            position: 'fixed',
            top: `${position.top}px`,
            left: `${position.left}px`,
            pointerEvents: 'none'
          }}
          data-side={side}
        >
          {content}
        </div>
      )}
    </div>
  )
}

export const TooltipProvider = ({ children }: { children: React.ReactNode }) => children
export const TooltipTrigger = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const TooltipContent = ({ children }: { children: React.ReactNode }) => <>{children}</> 