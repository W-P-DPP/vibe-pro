import * as React from "react"
import { ScrollArea as ScrollAreaPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

const scrollAreaScrollbarClassName =
  "group/scrollbar flex touch-none select-none rounded-full bg-[var(--scrollbar-track)] p-[2px] opacity-85 transition-[background-color,opacity] duration-150 hover:bg-[var(--scrollbar-track-hover)] hover:opacity-100 data-horizontal:m-1 data-horizontal:h-[var(--scrollbar-size)] data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:m-1 data-vertical:h-[calc(100%-0.5rem)] data-vertical:w-[var(--scrollbar-size)] data-vertical:border-l data-vertical:border-l-transparent"

const scrollAreaThumbClassName =
  "relative flex-1 rounded-full bg-[var(--scrollbar-thumb)] transition-colors duration-150 group-hover/scrollbar:bg-[var(--scrollbar-thumb-hover)] group-active/scrollbar:bg-[var(--scrollbar-thumb-active)]"

function ScrollArea({
  className,
  viewportClassName,
  children,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
  viewportClassName?: string
}) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className={cn(
          "size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1",
          viewportClassName
        )}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        scrollAreaScrollbarClassName,
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className={scrollAreaThumbClassName}
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export {
  ScrollArea,
  ScrollBar,
  scrollAreaScrollbarClassName,
  scrollAreaThumbClassName,
}
