import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from '@/shared/utils/cn'

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-11 w-full items-center justify-between rounded-lg border-2 border-slate-300 dark:border-slate-600",
      "bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-medium",
      "text-slate-900 dark:text-white",
      "shadow-sm hover:shadow-md transition-all duration-200",
      "hover:border-blue-500 dark:hover:border-blue-400",
      "focus:outline-none focus:ring-3 focus:ring-blue-500/30 focus:border-blue-600",
      "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-800",
      "[&>span]:line-clamp-1",
      className
    )}
    aria-label={props['aria-label'] || 'Selecione uma opção'}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-5 w-5 text-slate-500 dark:text-slate-400 transition-transform" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 min-w-[12rem] overflow-hidden",
        "rounded-xl border-2 border-blue-200 dark:border-blue-800",
        "bg-white dark:bg-slate-900",
        "text-slate-900 dark:text-white",
        "shadow-xl shadow-blue-500/10 dark:shadow-blue-900/30",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
        "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton className="bg-gradient-to-b from-white to-transparent dark:from-slate-900 dark:to-transparent" />
      <SelectPrimitive.Viewport
        className={cn(
          "p-2",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton className="bg-gradient-to-t from-white to-transparent dark:from-slate-900 dark:to-transparent" />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-3 py-2 text-sm font-bold text-gray-700 dark:text-gray-300", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-pointer select-none items-center",
      "rounded-lg py-3 pl-10 pr-3 text-sm",
      "outline-none transition-all duration-150",
      "hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 hover:text-blue-900",
      "focus:bg-gradient-to-r focus:from-blue-50 focus:to-cyan-50 focus:text-blue-900",
      "dark:hover:from-blue-950/30 dark:hover:to-cyan-950/30 dark:hover:text-blue-100",
      "dark:focus:from-blue-950/30 dark:focus:to-cyan-950/30 dark:focus:text-blue-100",
      "dark:text-white",
      "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-100 data-[state=checked]:to-cyan-100",
      "data-[state=checked]:text-blue-900 data-[state=checked]:font-semibold",
      "dark:data-[state=checked]:from-blue-900/50 dark:data-[state=checked]:to-cyan-900/50",
      "dark:data-[state=checked]:text-blue-100",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-3 flex h-5 w-5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-5 w-5 text-blue-600 dark:text-blue-400 font-bold" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText className="font-medium">{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("mx-2 my-1 h-px bg-gray-200 dark:bg-gray-700", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
