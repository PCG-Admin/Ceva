import { useState, useCallback } from "react"

export interface Toast {
  title: string
  description?: string
  variant?: "default" | "destructive"
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((toast: Toast) => {
    // Just log to console, no alert popup
    if (toast.variant === "destructive") {
      console.error(`❌ ${toast.title}`, toast.description)
    } else {
      console.log(`✅ ${toast.title}`, toast.description)
    }
  }, [])

  return { toast, toasts }
}
