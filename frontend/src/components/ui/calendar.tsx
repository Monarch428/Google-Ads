"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react@0.487.0";
import { DayPicker } from "react-day-picker@8.10.1";

import { cn } from "./utils";
import { buttonVariants } from "./button";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "p-3 text-slate-900",
        "[&_caption]:rounded-xl [&_caption]:bg-gradient-to-r [&_caption]:from-purple-100 [&_caption]:to-indigo-100 [&_caption]:px-4 [&_caption]:py-2",
        className,
      )}
      classNames={{
        months: "flex flex-col sm:flex-row gap-3",
        month: "flex flex-col gap-4 rounded-xl border border-slate-100 bg-white/80 p-3 shadow-sm",
        caption:
          "flex justify-center pt-1 relative items-center w-full text-slate-800",
        caption_label: "text-sm font-semibold tracking-wide",
        nav: "flex items-center gap-1 text-slate-600",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 rounded-lg border-slate-200 bg-white p-0 opacity-70 shadow-sm hover:opacity-100",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-x-1",
        head_row: "flex text-slate-500",
        head_cell:
          "rounded-md w-8 font-medium text-[0.8rem] uppercase tracking-wide",
        row: "flex w-full mt-2",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-range-end)]:rounded-r-md",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
            : "[&:has([aria-selected])]:rounded-md",
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "size-8 p-0 font-medium aria-selected:opacity-100 text-slate-700",
        ),
        day_range_start:
          "day-range-start aria-selected:bg-primary aria-selected:text-primary-foreground",
        day_range_end:
          "day-range-end aria-selected:bg-primary aria-selected:text-primary-foreground",
        day_selected:
          "bg-gradient-to-br from-purple-500 to-indigo-500 text-white shadow-sm hover:from-purple-500 hover:to-indigo-500 focus-visible:ring-2 focus-visible:ring-purple-200",
        day_today: "bg-purple-50 text-purple-700 font-semibold",
        day_outside:
          "day-outside text-muted-foreground aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-purple-50 aria-selected:text-purple-700",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("size-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("size-4", className)} {...props} />
        ),
      }}
      {...props}
    />
  );
}

export { Calendar };
