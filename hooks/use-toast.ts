"use client"

import { toast as sonnerToast } from "sonner"

export function useToast() {
  return {
    toast: ({ title, description, ...props }: { title?: string; description?: string; [key: string]: any }) => {
      if (title && description) {
        sonnerToast(title, { description, ...props })
      } else if (title) {
        sonnerToast(title, props)
      } else if (description) {
        sonnerToast(description, props)
      }
    }
  }
}