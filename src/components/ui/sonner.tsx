"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background/95 group-[.toaster]:backdrop-blur-md group-[.toaster]:text-foreground group-[.toaster]:border-border/60 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-xl group-[.toaster]:p-4 group-[.toaster]:font-sans",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-xs group-[.toast]:mt-1",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:font-medium group-[.toast]:rounded-lg",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg",
          
          // 🌟 প্রতিটি টোস্টের টাইপ অনুযায়ী স্পেশাল কালার স্টাইল (সবচেয়ে সুন্দর অংশ)
          success:
            "group-[.toaster]:border-emerald-500/30 group-[.toaster]:bg-emerald-500/10 group-[.toaster]:text-emerald-600 dark:group-[.toaster]:text-emerald-400",
          error:
            "group-[.toaster]:border-rose-500/30 group-[.toaster]:bg-rose-500/10 group-[.toaster]:text-rose-600 dark:group-[.toaster]:text-rose-400",
          info:
            "group-[.toaster]:border-sky-500/30 group-[.toaster]:bg-sky-500/10 group-[.toaster]:text-sky-600 dark:group-[.toaster]:text-sky-400",
          warning:
            "group-[.toaster]:border-amber-500/30 group-[.toaster]:bg-amber-500/10 group-[.toaster]:text-amber-600 dark:group-[.toaster]:text-amber-400",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }