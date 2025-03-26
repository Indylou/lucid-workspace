import * as React from "react"

export type ToastProps = {
  title?: string
  description?: string
  action?: React.ReactNode
  duration?: number
}

type ToastContextType = {
  toast: (props: ToastProps) => void
  dismiss: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<(ToastProps & { id: string })[]>([])

  const toast = React.useCallback((props: ToastProps) => {
    const id = Math.random().toString(36).slice(2, 11)
    setToasts((prev) => [...prev, { ...props, id }])
    
    // Auto-dismiss after duration
    if (props.duration !== 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, props.duration || 5000)
    }
    
    return id
  }, [])

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  React.useEffect(() => {
    // Clean up toasts when component unmounts
    return () => {
      setToasts([])
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-0 right-0 p-4 space-y-4 z-50 max-w-xs w-full">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="bg-background border rounded-md shadow-lg p-4 animate-in slide-in-from-bottom-5 duration-300 flex flex-col"
            >
              {t.title && (
                <div className="font-medium">{t.title}</div>
              )}
              {t.description && (
                <div className="text-sm text-muted-foreground mt-1">{t.description}</div>
              )}
              {t.action && (
                <div className="mt-2">{t.action}</div>
              )}
              <button
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                onClick={() => dismiss(t.id)}
                aria-label="Close toast"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

export const toast = (props: ToastProps) => {
  // For non-component usage, we'll create a temporary element to render the toast
  // In a real app, this would be handled more properly, but this is a simpler approach for demo purposes
  try {
    console.log('Toast notification:', props.title, props.description)
    
    // Show a simple browser notification if available
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(props.title || 'Notification', {
          body: props.description
        })
      } catch (notificationError) {
        console.error('Notification API error:', notificationError)
      }
    }
    
    // Create a temporary toast element that auto-removes itself
    const toast = document.createElement('div')
    toast.className = 'fixed bottom-4 right-4 bg-white dark:bg-gray-800 border rounded-md shadow-lg p-4 z-50 max-w-xs animate-in fade-in'
    
    const title = props.title ? `<div class="font-medium">${props.title}</div>` : ''
    const description = props.description ? `<div class="text-sm text-gray-500 dark:text-gray-400 mt-1">${props.description || ''}</div>` : ''
    
    toast.innerHTML = `
      ${title}
      ${description}
      <button class="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300" aria-label="Close toast">×</button>
    `
    
    document.body.appendChild(toast)
    
    // Remove after duration
    setTimeout(() => {
      toast.classList.add('animate-out', 'fade-out')
      setTimeout(() => {
        if (toast.parentNode) {
          document.body.removeChild(toast)
        }
      }, 300)
    }, props.duration || 5000)
    
    // Add click handler to close button
    const closeButton = toast.querySelector('button')
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        if (toast.parentNode) {
          document.body.removeChild(toast)
        }
      })
    }
  } catch (error) {
    // Fallback to console log if there's an error showing the toast
    console.error('Error showing toast notification:', error)
    console.log('Toast message:', props.title, props.description)
  }
} 