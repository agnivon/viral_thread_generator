"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, toast, type ToasterProps as SonnerProps } from "sonner"
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

type ToasterProps = SonnerProps

const Toaster = ({
  className,
  toastOptions,
  icons,
  ...props
}: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className={cn("toaster group", className)}
      icons={{
        success: (
          <CheckCircle2 className="size-4 text-emerald-500 dark:text-emerald-400" />
        ),
        error: (
          <AlertCircle className="size-4 text-rose-500 dark:text-rose-400" />
        ),
        warning: (
          <AlertTriangle className="size-4 text-amber-500 dark:text-amber-400" />
        ),
        info: (
          <Info className="size-4 text-violet-500 dark:text-violet-400" />
        ),
        loading: (
          <Loader2 className="size-4 animate-spin text-violet-500 dark:text-violet-400" />
        ),
        close: <X className="size-3.5 text-muted-foreground" />,
        ...icons,
      }}
      toastOptions={{
        ...toastOptions,
        classNames: {
          toast: cn(
            "group toast group-[.toaster]:bg-card/95 group-[.toaster]:backdrop-blur-md group-[.toaster]:text-card-foreground group-[.toaster]:border group-[.toaster]:border-border/80 group-[.toaster]:border-l-[3px] group-[.toaster]:border-l-violet-600 dark:group-[.toaster]:border-l-violet-400 group-[.toaster]:shadow-xl group-[.toaster]:shadow-black/5 dark:group-[.toaster]:shadow-black/30 group-[.toaster]:rounded-2xl group-[.toaster]:p-4 group-[.toaster]:gap-3 group-[.toaster]:font-sans",
            toastOptions?.classNames?.toast
          ),
          title: cn(
            "group-[.toast]:text-sm group-[.toast]:font-semibold group-[.toast]:tracking-tight group-[.toast]:text-foreground group-[.toast]:leading-snug",
            toastOptions?.classNames?.title
          ),
          description: cn(
            "group-[.toast]:text-xs group-[.toast]:text-muted-foreground group-[.toast]:leading-relaxed group-[.toast]:font-normal group-[.toast]:mt-0.5",
            toastOptions?.classNames?.description
          ),
          content: cn(
            "group-[.toast]:flex group-[.toast]:flex-col group-[.toast]:gap-0.5",
            toastOptions?.classNames?.content
          ),
          icon: cn(
            "group-[.toast]:shrink-0 group-[.toast]:mt-0.5",
            toastOptions?.classNames?.icon
          ),
          loader: cn(
            "group-[.toast]:shrink-0 group-[.toast]:mt-0.5",
            toastOptions?.classNames?.loader
          ),
          actionButton: cn(
            "group-[.toast]:rounded-xl group-[.toast]:bg-linear-to-r group-[.toast]:from-violet-600 group-[.toast]:to-indigo-600 hover:group-[.toast]:from-violet-700 hover:group-[.toast]:to-indigo-700 group-[.toast]:text-white group-[.toast]:font-semibold group-[.toast]:text-xs group-[.toast]:py-1.5 group-[.toast]:px-3 group-[.toast]:shadow-xs group-[.toast]:cursor-pointer group-[.toast]:transition-all active:group-[.toast]:scale-95",
            toastOptions?.classNames?.actionButton
          ),
          cancelButton: cn(
            "group-[.toast]:rounded-xl group-[.toast]:border group-[.toast]:border-border/80 group-[.toast]:bg-muted/60 hover:group-[.toast]:bg-muted group-[.toast]:text-muted-foreground hover:group-[.toast]:text-foreground group-[.toast]:text-xs group-[.toast]:font-semibold group-[.toast]:py-1.5 group-[.toast]:px-3 group-[.toast]:cursor-pointer group-[.toast]:transition-all active:group-[.toast]:scale-95",
            toastOptions?.classNames?.cancelButton
          ),
          closeButton: cn(
            "group-[.toast]:border group-[.toast]:border-border/80 group-[.toast]:bg-card group-[.toast]:text-muted-foreground hover:group-[.toast]:text-foreground hover:group-[.toast]:bg-muted group-[.toast]:rounded-lg group-[.toast]:transition-colors group-[.toast]:p-1 group-[.toast]:cursor-pointer group-[.toast]:shadow-xs",
            toastOptions?.classNames?.closeButton
          ),
          success: cn(
            "group-[.toaster]:border-emerald-500/30 group-[.toaster]:border-l-[3px] group-[.toaster]:border-l-emerald-500 dark:group-[.toaster]:border-l-emerald-400",
            toastOptions?.classNames?.success
          ),
          error: cn(
            "group-[.toaster]:border-rose-500/30 group-[.toaster]:border-l-[3px] group-[.toaster]:border-l-rose-500 dark:group-[.toaster]:border-l-rose-400",
            toastOptions?.classNames?.error
          ),
          warning: cn(
            "group-[.toaster]:border-amber-500/30 group-[.toaster]:border-l-[3px] group-[.toaster]:border-l-amber-500 dark:group-[.toaster]:border-l-amber-400",
            toastOptions?.classNames?.warning
          ),
          info: cn(
            "group-[.toaster]:border-violet-500/30 group-[.toaster]:border-l-[3px] group-[.toaster]:border-l-violet-500 dark:group-[.toaster]:border-l-violet-400",
            toastOptions?.classNames?.info
          ),
          ...toastOptions?.classNames,
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
