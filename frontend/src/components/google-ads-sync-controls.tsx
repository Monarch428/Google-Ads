import { useEffect, useState } from "react";
import { CalendarIcon, Loader2, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { DateRangePicker } from "./ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { cn } from "./ui/utils";
import { useData } from "../lib/data-context";
import { toast } from "sonner";
import { defaultDateRange, useGoogleAdsSync } from "../lib/google-ads-sync-context";

function formatForApi(date: Date) {
  return date.toISOString().slice(0, 10);
}

export type GoogleAdsSyncControlsProps = {
  size?: "default" | "compact";
  className?: string;
  contextLabel?: string;
};

export function GoogleAdsSyncControls({
  size = "default",
  className,
  contextLabel = "Google Ads data",
}: GoogleAdsSyncControlsProps) {
  const {
    clients,
    clientsLoading,
    syncGoogleAdsDaily,
    syncGoogleAdsRange,
    authToken,
  } = useData();
  const { dateRange, setDateRange } = useGoogleAdsSync();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [isRangeLoading, setIsRangeLoading] = useState(false);
  const [isDailyLoading, setIsDailyLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const selectedClient = clients.find((client) => client.id === selectedClientId);
  const availableCustomerIds = selectedClient?.customerIds ?? [];
  const effectiveDateRange = dateRange ?? defaultDateRange;

  useEffect(() => {
    if (!dateRange) {
      setDateRange(defaultDateRange);
    }
  }, [dateRange, setDateRange]);

  useEffect(() => {
    if (!clients.length) {
      setSelectedClientId("");
      return;
    }
    if (!selectedClientId || !clients.some((client) => client.id === selectedClientId)) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  useEffect(() => {
    const client = clients.find((entry) => entry.id === selectedClientId);
    const ids = client?.customerIds ?? [];

    if (!ids.length) {
      setSelectedCustomerId("");
      return;
    }

    if (!ids.includes(selectedCustomerId)) {
      setSelectedCustomerId(ids[0]);
    }
  }, [clients, selectedClientId, selectedCustomerId]);

  const buttonSize = size === "compact" ? "sm" : "default";
  const disabled = !selectedClientId || !selectedCustomerId || clientsLoading || !authToken;

  const handleRangeSync = async () => {
    if (!selectedClientId) {
      toast.error("Select a client", { description: "Choose a Google Ads account to sync." });
      return;
    }
    if (!selectedCustomerId) {
      toast.error("Select a customer ID", { description: "Choose which customer ID to sync." });
      return;
    }
    if (!effectiveDateRange?.from || !effectiveDateRange?.to) {
      toast.error("Select a valid range", { description: "Pick both a start and end date." });
      return;
    }
    setIsRangeLoading(true);
    setStatusMessage(null);
    try {
      const response = await syncGoogleAdsRange(
        selectedClientId,
        selectedCustomerId,
        formatForApi(effectiveDateRange.from),
        formatForApi(effectiveDateRange.to),
      );
      const message = response.message || `Synced ${contextLabel} for selected range.`;
      setStatusMessage({ type: "success", text: message });
      toast.success("Google Ads sync completed", { description: message });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sync Google Ads data";
      setStatusMessage({ type: "error", text: message });
      toast.error("Sync failed", { description: message });
    } finally {
      setIsRangeLoading(false);
    }
  };

  const handleDailySync = async () => {
    if (!selectedClientId) {
      toast.error("Select a client", { description: "Choose a Google Ads account to sync." });
      return;
    }
    if (!selectedCustomerId) {
      toast.error("Select a customer ID", { description: "Choose which customer ID to sync." });
      return;
    }
    setIsDailyLoading(true);
    setStatusMessage(null);
    try {
      const response = await syncGoogleAdsDaily(selectedClientId, selectedCustomerId);
      const message = response.message || `Fetched today's ${contextLabel}.`;
      setStatusMessage({ type: "success", text: message });
      toast.success("Daily Google Ads sync started", { description: message });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sync Google Ads data";
      setStatusMessage({ type: "error", text: message });
      toast.error("Sync failed", { description: message });
    } finally {
      setIsDailyLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-3 rounded-xl border border-dashed border-slate-200 bg-white/80 px-4 py-3 shadow-sm",
        size === "compact" ? "text-xs" : "text-sm",
        className,
      )}
    >
      <div className="grid grid-cols-2 items-center gap-3">
        <Select
          value={selectedClientId}
          onValueChange={setSelectedClientId}
          disabled={clientsLoading || !clients.length}
        >
          <SelectTrigger className={cn("min-w-[200px]", size === "compact" && "h-9 text-xs")}> 
            <SelectValue placeholder={clientsLoading ? "Loading clients..." : "Select client"} />
          </SelectTrigger>
          <SelectContent>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={selectedCustomerId}
          onValueChange={setSelectedCustomerId}
          disabled={clientsLoading || !availableCustomerIds.length}
        >
          <SelectTrigger className={cn("min-w-[200px]", size === "compact" && "h-9 text-xs")}>
            <SelectValue placeholder={clientsLoading ? "Loading customer IDs..." : "Select customer ID"} />
          </SelectTrigger>
          <SelectContent>
            {availableCustomerIds.map((id) => (
              <SelectItem key={id} value={id}>
                {id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DateRangePicker
          value={effectiveDateRange}
          onChange={setDateRange}
          placeholder="Pick a custom range"
          className={cn(size === "compact" && "h-10 min-w-[240px] text-xs")}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          onClick={handleDailySync}
          disabled={disabled || isDailyLoading}
          size={buttonSize}
        >
          {isDailyLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Fetch Today
        </Button>
                <Button
          onClick={handleRangeSync}
          disabled={disabled || isRangeLoading}
          size={buttonSize}
        >
          {isRangeLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CalendarIcon className="mr-2 h-4 w-4" />
          )}
          Fetch Custom Range
        </Button>
        {statusMessage && (
          <p
            className={cn(
              "text-xs font-medium",
              statusMessage.type === "success" ? "text-green-600" : "text-red-600",
            )}
          >
            {statusMessage.text}
          </p>
        )}
        {!authToken && (
          <p className="text-xs text-slate-500">
            Sign in with your backend account to trigger Google Ads syncs.
          </p>
        )}
      </div>
    </div>
  );
}
