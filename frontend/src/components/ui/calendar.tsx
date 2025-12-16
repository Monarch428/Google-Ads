"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

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
      className={cn("w-full p-3 text-slate-900", className)}
      classNames={{
        /* layout: make both months stretch */
        months:
          "flex w-full flex-col gap-4 sm:flex-row sm:gap-8 sm:justify-between",
        month:
          "flex-1 flex flex-col gap-3 rounded-xl border border-slate-100 bg-white/90 p-4 shadow-sm",

        caption:
          "relative flex w-full items-center justify-center pt-1 text-slate-800 [&>div]:w-full",
        caption_label:
          "w-full rounded-lg bg-gradient-to-r from-purple-100 to-indigo-100 px-4 py-2 text-sm font-semibold tracking-wide text-slate-900 text-center",
        nav: "absolute inset-y-0 right-3 flex items-center gap-1 text-slate-600",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 rounded-lg border-slate-200 bg-white p-0 opacity-80 shadow-sm hover:opacity-100"
        ),
        nav_button_previous: "absolute left-3 inset-y-0 my-auto",
        nav_button_next: "absolute right-3 inset-y-0 my-auto",

        /* table grid – 7 equal columns, with gaps */
        table: "w-full border-collapse border-spacing-0",
        head_row: "grid grid-cols-7 gap-x-2 mb-1",
        head_cell:
          "flex h-8 items-center justify-center text-center text-[0.7rem] font-medium uppercase tracking-wide text-slate-500",
        row: "mt-1 grid grid-cols-7 gap-x-2 gap-y-2",
        cell: cn(
          "relative flex items-center justify-center h-10 p-0 text-center text-sm focus-within:relative focus-within:z-20",
          props.mode === "range"
            ? "[&:has([aria-selected])]:bg-purple-50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
            : "[&:has([aria-selected])]:rounded-md [&:has([aria-selected])]:bg-purple-100"
        ),

        /* day buttons */
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-10 p-0 font-medium text-slate-700 transition-transform duration-150 hover:scale-110"
        ),

        day_selected:
  "bg-green-500 text-black shadow-sm hover:bg-green-500 focus-visible:ring-2 focus-visible:ring-green-200",



        day_range_start:
  "day-range-start aria-selected:rounded-l-md aria-selected:bg-green-500 aria-selected:text-black",

        day_range_end:
  "day-range-end aria-selected:rounded-r-md aria-selected:bg-green-500 aria-selected:text-black",

  day_range_middle:
  "aria-selected:bg-green-100 aria-selected:text-black",
  
        day_today:
          "border border-purple-400 text-purple-900 font-semibold bg-purple-100",
        day_outside:
          "day-outside text-slate-300 aria-selected:text-slate-300 aria-selected:bg-purple-100/40",
        day_disabled: "text-slate-300 opacity-50",

        /* 👉 range colors – make middle & edges very visible */
        day_range_start:
          "day-range-start aria-selected:rounded-l-md aria-selected:bg-gradient-to-br aria-selected:from-purple-500 aria-selected:to-indigo-500 aria-selected:text-white",
        day_range_end:
          "day-range-end aria-selected:rounded-r-md aria-selected:bg-gradient-to-br aria-selected:from-purple-500 aria-selected:to-indigo-500 aria-selected:text-white",
        day_range_middle:
          "aria-selected:bg-purple-200 aria-selected:text-purple-900",

        day_hidden: "invisible",

        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...iconProps }) => (
          <ChevronLeft className={cn("size-4", className)} {...iconProps} />
        ),
        IconRight: ({ className, ...iconProps }) => (
          <ChevronRight className={cn("size-4", className)} {...iconProps} />
        ),
      }}
      {...props}
    />
  );
}

export { Calendar };
