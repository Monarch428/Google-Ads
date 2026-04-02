import { useState, useRef, useEffect } from "react";
import { Search, Bell, CheckCircle, AlertTriangle, FileText, X, Check } from "lucide-react";

type Notification = {
    id: number;
    type: "success" | "warning" | "info";
    title: string;
    subtitle: string;
    time: string;
    read: boolean;
};

const INITIAL_NOTIFICATIONS: Notification[] = [
    {
        id: 1,
        type: "success",
        title: "Scan Complete: Homepage Redesign",
        subtitle: "All 47 checks passed successfully",
        time: "2 minutes ago",
        read: false,
    },
    {
        id: 2,
        type: "warning",
        title: "Missing Files: E-commerce Project",
        subtitle: "3 assets could not be located",
        time: "1 hour ago",
        read: false,
    },
    {
        id: 3,
        type: "info",
        title: "Weekly Report Generated",
        subtitle: "Your summary is ready to download",
        time: "3 hours ago",
        read: false,
    },
];

const iconMap = {
    success: <CheckCircle className="w-4 h-4 text-emerald-500" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
    info: <FileText className="w-4 h-4 text-pink-500" />,
};

const bgMap = {
    success: "bg-emerald-50",
    warning: "bg-amber-50",
    info: "bg-pink-50",
};

export default function DashboardHeader() {
    const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
    const [open, setOpen] = useState(false);
    const [dismissingId, setDismissingId] = useState<number | null>(null);
    const [markingAll, setMarkingAll] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    const unread = notifications.filter((n) => !n.read).length;

    // Close on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        if (open) document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [open]);

    const dismissOne = (id: number) => {
        setDismissingId(id);
        setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== id));
            setDismissingId(null);
        }, 300);
    };

    const markAllRead = () => {
        setMarkingAll(true);
        setTimeout(() => {
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            setMarkingAll(false);
        }, 400);
    };

    const clearAll = () => {
        setMarkingAll(true);
        setTimeout(() => {
            setNotifications([]);
            setMarkingAll(false);
            setOpen(false);
        }, 400);
    };

    return (
        <div className="w-full flex items-center justify-between bg-white border-b border-gray-200 px-6 py-5.25">

            {/* Search Bar */}
            <div className="flex items-center bg-gray-100 border border-gray-200 rounded-lg px-4 py-2 w-[420px] focus-within:border-pink-400 focus-within:ring-2 focus-within:ring-pink-100 transition-all duration-200">
                <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                <input
                    type="text"
                    placeholder="Search projects, issues, or pages..."
                    className="bg-transparent outline-none text-sm w-full placeholder:text-gray-400"
                />
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-4" ref={panelRef}>

                {/* Notification Bell */}
                <div className="relative">
                    <button
                        onClick={() => setOpen((v) => !v)}
                        className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors duration-150 cursor-pointer group"
                        aria-label="Notifications"
                    >
                        <Bell
                            className={`w-5 h-5 transition-colors duration-200 ${open ? "text-pink-500" : "text-gray-500 group-hover:text-gray-700"}`}
                            style={open ? {} : undefined}
                        />

                        {/* Badge */}
                        {unread > 0 && (
                            <span
                                className="absolute -top-0.5 -right-0.5 bg-[#E8315B] text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1 shadow-sm"
                                style={{
                                    animation: "badgePop 0.3s cubic-bezier(0.34,1.56,0.64,1) both",
                                }}
                            >
                                {unread}
                            </span>
                        )}
                    </button>

                    {/* Dropdown Panel */}
                    {open && (
                        <div
                            className="absolute right-0 top-full mt-2 w-[340px] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
                            style={{
                                animation: "panelSlide 0.22s cubic-bezier(0.16,1,0.3,1) both",
                                transformOrigin: "top right",
                            }}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm text-gray-800">Notifications</span>
                                    {unread > 0 && (
                                        <span className="bg-[#E8315B] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                            {unread} new
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {unread > 0 && (
                                        <button
                                            onClick={markAllRead}
                                            className="text-xs text-pink-500 hover:text-pink-700 font-medium flex items-center gap-1 transition-colors"
                                            disabled={markingAll}
                                        >
                                            <Check className="w-3 h-3" />
                                            Mark all read
                                        </button>
                                    )}
                                    {notifications.length > 0 && (
                                        <button
                                            onClick={clearAll}
                                            className="text-xs text-gray-400 hover:text-gray-600 font-medium transition-colors"
                                            disabled={markingAll}
                                        >
                                            Clear all
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Notification List */}
                            <div className="max-h-[320px] overflow-y-auto divide-y divide-gray-50">
                                {notifications.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
                                        <Bell className="w-8 h-8 opacity-30" />
                                        <span className="text-sm font-medium">All caught up!</span>
                                        <span className="text-xs">No new notifications</span>
                                    </div>
                                ) : (
                                    notifications.map((n) => (
                                        <div
                                            key={n.id}
                                            className={`
                                                flex items-start gap-3 px-4 py-3 transition-all duration-300 group/item relative
                                                ${n.read ? "opacity-60" : ""}
                                                ${dismissingId === n.id ? "opacity-0 scale-95 -translate-x-2" : ""}
                                                ${markingAll && !n.read ? "opacity-50" : ""}
                                                hover:bg-gray-50
                                            `}
                                            style={{ transition: "opacity 0.3s, transform 0.3s" }}
                                        >
                                            {/* Icon */}
                                            <div className={`shrink-0 mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center ${bgMap[n.type]}`}>
                                                {iconMap[n.type]}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-medium text-gray-800 leading-tight truncate ${!n.read ? "font-semibold" : ""}`}>
                                                    {n.title}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5 truncate">{n.subtitle}</p>
                                                <p className="text-[11px] text-gray-400 mt-1">{n.time}</p>
                                            </div>

                                            {/* Unread dot + dismiss */}
                                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                {!n.read && (
                                                    <span className="w-2 h-2 bg-[#E8315B] rounded-full mt-1" />
                                                )}
                                                <button
                                                    onClick={() => dismissOne(n.id)}
                                                    className="opacity-0 group-hover/item:opacity-100 text-gray-300 hover:text-gray-500 transition-all duration-150 mt-auto"
                                                    aria-label="Dismiss"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Footer */}
                            {notifications.length > 0 && (
                                <div className="border-t border-gray-100 px-4 py-2.5">
                                    <button className="w-full text-center text-xs text-pink-500 hover:text-pink-700 font-semibold transition-colors py-0.5">
                                        View all notifications →
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </div>

            {/* Keyframe Animations */}
            <style>{`
                @keyframes badgePop {
                    from { transform: scale(0); opacity: 0; }
                    to   { transform: scale(1); opacity: 1; }
                }
                @keyframes panelSlide {
                    from { opacity: 0; transform: scale(0.94) translateY(-6px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
}
