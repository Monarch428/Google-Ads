"use client";

import { useEffect, useMemo, useState } from "react";
import { format, isValid, parse } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";

import { Button } from "./button";
import { Calendar } from "./calendar";
import { Input } from "./input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "./utils";

function parseInput(value: string) {
  const parsed = parse(value, "yyyy-MM-dd", new Date());
  return isValid(parsed) ? parsed : undefined;
}

function formatDateLabel(date?: Date) {
  return date ? format(date, "MMM d, yyyy") : "Select date";
}

/* =======================
   RANGE PICKER
   ======================= */

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range?: DateRange) => void;
  placeholder?: string;
  className?: string;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Select date range",
  className,
}: DateRangePickerProps) {
  const [range, setRange] = useState<DateRange | undefined>(value);
  const [startInput, setStartInput] = useState<string>(
    value?.from ? format(value.from, "yyyy-MM-dd") : "",
  );
  const [endInput, setEndInput] = useState<string>(
    value?.to ? format(value.to, "yyyy-MM-dd") : "",
  );
  const [open, setOpen] = useState(false); // control popover

  useEffect(() => {
    setRange(value);
    setStartInput(value?.from ? format(value.from, "yyyy-MM-dd") : "");
    setEndInput(value?.to ? format(value.to, "yyyy-MM-dd") : "");
  }, [value]);

  const formattedLabel = useMemo(() => {
    if (range?.from && range.to) {
      return `${formatDateLabel(range.from)} — ${formatDateLabel(range.to)}`;
    }
    if (range?.from) return formatDateLabel(range.from);
    return placeholder;
  }, [placeholder, range]);

  const updateRange = (next?: DateRange) => {
    setRange(next);
    onChange?.(next);
  };

  const handleStartChange = (value: string) => {
    setStartInput(value);
    const parsed = parseInput(value);
    if (!parsed) return;
    const newRange: DateRange = {
      from: parsed,
      to: range?.to && range?.to >= parsed ? range.to : parsed,
    };
    updateRange(newRange);
    setStartInput(format(parsed, "yyyy-MM-dd"));
    setEndInput(newRange.to ? format(newRange.to, "yyyy-MM-dd") : "");
  };

  const handleEndChange = (value: string) => {
    setEndInput(value);
    const parsed = parseInput(value);
    if (!parsed) return;
    const from = range?.from ?? parsed;
    const newRange: DateRange =
      from && parsed < from
        ? { from: parsed, to: from }
        : { from, to: parsed };
    updateRange(newRange);
    setStartInput(newRange.from ? format(newRange.from, "yyyy-MM-dd") : "");
    setEndInput(format(parsed, "yyyy-MM-dd"));
  };

  const applyPreset = (days: number) => {
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - days + 1);
    const preset: DateRange = { from: start, to: today };
    setStartInput(format(start, "yyyy-MM-dd"));
    setEndInput(format(today, "yyyy-MM-dd"));
    updateRange(preset);
  };

  const clearRange = () => {
    setRange(undefined);
    setStartInput("");
    setEndInput("");
    onChange?.(undefined);
  };

  const handleConfirm = () => {
    // use either current range or try to parse raw inputs
    const from =
      range?.from || (startInput ? parseInput(startInput) : undefined);
    const to = range?.to || (endInput ? parseInput(endInput) : undefined);

    if (!from || !to) {
      // simple popup for missing data – you can swap this to your toast if needed
      window.alert("Please select both a start date and an end date.");
      return;
    }

    let finalFrom = from;
    let finalTo = to;
    if (finalTo < finalFrom) {
      [finalFrom, finalTo] = [finalTo, finalFrom];
    }

    const finalRange: DateRange = { from: finalFrom, to: finalTo };
    setRange(finalRange);
    setStartInput(format(finalFrom, "yyyy-MM-dd"));
    setEndInput(format(finalTo, "yyyy-MM-dd"));
    onChange?.(finalRange);
    setOpen(false); // close popover
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "inline-flex h-10 min-w-[260px] items-center justify-start gap-2 rounded-lg border-slate-200 bg-white px-3 text-left text-sm font-normal shadow-sm hover:border-slate-300 hover:bg-slate-50",
            !range && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 text-slate-500" />
          <span className="truncate">{formattedLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(100vw-2rem,720px)] rounded-xl border border-slate-100 bg-white p-4 shadow-xl"
        align="start"
      >
        <div className="flex flex-col gap-4">
          {/* Header + Presets */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Pick a period</p>
              <p className="text-xs text-slate-500">
                Choose your start and end dates or type them directly.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => applyPreset(7)}>
                Last 7 days
              </Button>
              <Button size="sm" variant="outline" onClick={() => applyPreset(30)}>
                Last 30 days
              </Button>
              <Button size="sm" variant="ghost" onClick={clearRange}>
                Clear
              </Button>
            </div>
          </div>

          {/* Inputs + Calendar */}
          <div className="flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.9fr)]">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Start date
                </p>
                <Input
                  value={startInput}
                  onChange={(e) => handleStartChange(e.target.value)}
                  placeholder="YYYY-MM-DD"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  End date
                </p>
                <Input
                  value={endInput}
                  onChange={(e) => handleEndChange(e.target.value)}
                  placeholder="YYYY-MM-DD"
                  className="h-9 text-sm"
                />
              </div>
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-600">
                Pro tip: type your dates and the calendar will jump to the right month.
              </div>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <Calendar
                mode="range"
                selected={range}
                defaultMonth={range?.from ?? new Date()}
                onSelect={(next) => {
                  setStartInput(next?.from ? format(next.from, "yyyy-MM-dd") : "");
                  setEndInput(next?.to ? format(next.to, "yyyy-MM-dd") : "");
                  updateRange(next);
                }}
                numberOfMonths={2}
                className="w-full bg-transparent p-0"
              />
            </div>
          </div>

          {/* ✅ Set button under the calendars */}
          <div className="flex justify-end">
            <Button size="sm" onClick={handleConfirm}>
              Set dates
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* =======================
   SINGLE DATE PICKER
   ======================= */

interface DatePickerProps {
  value?: Date;
  onChange?: (date?: Date) => void;
  placeholder?: string;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select a date",
  className,
}: DatePickerProps) {
  const [selected, setSelected] = useState<Date | undefined>(value);
  const [inputValue, setInputValue] = useState<string>(
    value ? format(value, "yyyy-MM-dd") : "",
  );

  useEffect(() => {
    setSelected(value);
    setInputValue(value ? format(value, "yyyy-MM-dd") : "");
  }, [value]);

  const label = selected ? formatDateLabel(selected) : placeholder;

  const handleInput = (value: string) => {
    setInputValue(value);
    const parsed = parseInput(value);
    if (!parsed) return;
    setSelected(parsed);
    onChange?.(parsed);
    setInputValue(format(parsed, "yyyy-MM-dd"));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "flex h-10 w-full items-center justify-start gap-2 rounded-lg border-slate-200 bg-white px-3 text-left text-sm font-normal shadow-sm hover:border-slate-300 hover:bg-slate-50",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 text-slate-500" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(100vw-2rem,360px)] rounded-xl border border-slate-100 bg-white p-4 shadow-xl"
        align="start"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900">Pick a date</p>
            <p className="text-xs text-slate-500">
              Type a date or select one from the calendar below.
            </p>
          </div>
          <Input
            value={inputValue}
            onChange={(e) => handleInput(e.target.value)}
            placeholder="YYYY-MM-DD"
            className="h-9 text-sm"
          />
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <Calendar
              mode="single"
              selected={selected}
              defaultMonth={selected ?? new Date()}
              onSelect={(date) => {
                setSelected(date);
                setInputValue(date ? format(date, "yyyy-MM-dd") : "");
                onChange?.(date);
              }}
              className="w-full bg-transparent p-0"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
