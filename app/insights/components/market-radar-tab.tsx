"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  X,
  Zap,
  Calendar,
  AlertTriangle,
  History,
} from "lucide-react";
import type { MarketRadarData, MarketPlayerSummary } from "@/lib/insights-utils";

function getPositionBadgeClass(pos: string): string {
  switch (pos) {
    case "GKP":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "DEF":
      return "bg-sky-500/15 text-sky-400 border-sky-500/30";
    case "MID":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "FWD":
      return "bg-rose-500/15 text-rose-400 border-rose-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

interface MarketRadarTabProps {
  data: MarketRadarData;
}

type Timeframe = "today" | "gameweek";
type MarketSubView =
  | "dailyRisers"
  | "dailyFallers"
  | "allMovers"
  | "predictedRisers"
  | "predictedFallers"
  | "risers"
  | "fallers"
  | "netIn"
  | "netOut";

function parseDateParts(dateStr: string) {
  const parts = dateStr.split("-").map(Number);
  return {
    year: parts[0] ?? 2026,
    month: (parts[1] ?? 1) - 1,
    day: parts[2] ?? 1,
  };
}

function formatDatePill(dateStr: string, todayStr: string, yesterdayStr: string): string {
  if (dateStr === todayStr) return "Today";
  if (dateStr === yesterdayStr) return "Yesterday";
  const { year, month, day } = parseDateParts(dateStr);
  const d = new Date(year, month, day);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function formatDateLabel(dateStr: string, todayStr: string, yesterdayStr: string): string {
  if (dateStr === todayStr) return "Today";
  if (dateStr === yesterdayStr) return "Yesterday";
  const { year, month, day } = parseDateParts(dateStr);
  const d = new Date(year, month, day);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatDateFull(dateStr: string): string {
  const { year, month, day } = parseDateParts(dateStr);
  const d = new Date(year, month, day);
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function MarketRadarTab({ data }: MarketRadarTabProps) {
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const [timeframe, setTimeframe] = useState<Timeframe>("today");
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return data.availableDates[0] || new Date().toISOString().slice(0, 10);
  });
  const [activeView, setActiveView] = useState<MarketSubView>("dailyRisers");
  const [search, setSearch] = useState("");

  const isToday = selectedDate === todayStr;

  const handleTimeframeChange = (next: Timeframe) => {
    setTimeframe(next);
    if (next === "today") {
      if (isToday) {
        setActiveView(data.totalDailyRisersCount > 0 ? "dailyRisers" : "predictedRisers");
      } else {
        setActiveView("dailyRisers");
      }
    } else {
      setActiveView("risers");
    }
  };

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    if (newDate !== todayStr && (activeView === "predictedRisers" || activeView === "predictedFallers")) {
      setActiveView("dailyRisers");
    }
  };

  const dateChangesMap = useMemo(() => {
    if (!data.dailyPriceHistory) return {};
    return data.dailyPriceHistory[selectedDate] || {};
  }, [data.dailyPriceHistory, selectedDate]);

  const { selectedDateRisers, selectedDateFallers } = useMemo(() => {
    if (isToday) {
      return {
        selectedDateRisers: data.dailyRisers,
        selectedDateFallers: data.dailyFallers,
      };
    }

    const risers: MarketPlayerSummary[] = [];
    const fallers: MarketPlayerSummary[] = [];

    for (const s of data.summaries) {
      const change = dateChangesMap[s.player.id.toString()];
      if (change !== undefined && change !== 0) {
        const adaptedSummary: MarketPlayerSummary = {
          ...s,
          costChangeDay: change,
        };
        if (change > 0) {
          risers.push(adaptedSummary);
        } else {
          fallers.push(adaptedSummary);
        }
      }
    }

    risers.sort((a, b) => b.costChangeDay - a.costChangeDay || b.netTransfersEvent - a.netTransfersEvent);
    fallers.sort((a, b) => a.costChangeDay - b.costChangeDay || a.netTransfersEvent - b.netTransfersEvent);

    return { selectedDateRisers: risers, selectedDateFallers: fallers };
  }, [isToday, data.dailyRisers, data.dailyFallers, data.summaries, dateChangesMap]);

  const getDayMoversCount = (dStr: string) => {
    if (dStr === todayStr) {
      return data.totalDailyRisersCount + data.totalDailyFallersCount;
    }
    const hist = data.dailyPriceHistory?.[dStr];
    return hist ? Object.keys(hist).length : 0;
  };

  const pillDates = useMemo(() => {
    const dates = data.availableDates.slice(0, 6);
    if (selectedDate && !dates.includes(selectedDate)) {
      return [selectedDate, ...dates].slice(0, 7);
    }
    return dates;
  }, [data.availableDates, selectedDate]);

  const currentList: MarketPlayerSummary[] = useMemo(() => {
    let list: MarketPlayerSummary[] = [];
    switch (activeView) {
      case "dailyRisers":
        list = selectedDateRisers;
        break;
      case "dailyFallers":
        list = selectedDateFallers;
        break;
      case "allMovers":
        list = [...selectedDateRisers, ...selectedDateFallers];
        break;
      case "predictedRisers":
        list = data.predictedRisersTonight;
        break;
      case "predictedFallers":
        list = data.predictedFallersTonight;
        break;
      case "risers":
        list = data.risers;
        break;
      case "fallers":
        list = data.fallers;
        break;
      case "netIn":
        list = data.topNetTransfersIn;
        break;
      case "netOut":
        list = data.topNetTransfersOut;
        break;
    }

    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (s) =>
        s.player.web_name.toLowerCase().includes(q) ||
        s.player.full_name.toLowerCase().includes(q) ||
        s.player.team_name.toLowerCase().includes(q) ||
        s.player.team_short.toLowerCase().includes(q),
    );
  }, [activeView, data, search, selectedDateRisers, selectedDateFallers]);

  const selectedDateLabel = formatDateLabel(selectedDate, todayStr, yesterdayStr);

  return (
    <div className="space-y-4">
      {/* Timeframe Scope Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-2.5 rounded-xl border border-border">
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/80 border border-border/80">
          <button
            type="button"
            onClick={() => handleTimeframeChange("today")}
            className={`flex items-center gap-2 min-h-[36px] px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              timeframe === "today"
                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isToday ? "Daily & Predictions" : `Daily (${selectedDateLabel})`}</span>
            {selectedDateRisers.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-primary-foreground/20 text-primary-foreground">
                +{selectedDateRisers.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTimeframeChange("gameweek")}
            className={`flex items-center gap-2 min-h-[36px] px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              timeframe === "gameweek"
                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Gameweek Overview</span>
            {data.totalRisersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-primary-foreground/20 text-primary-foreground">
                +{data.totalRisersCount}
              </span>
            )}
          </button>
        </div>

        <div className="text-[11px] text-muted-foreground px-2 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>FPL price updates run once daily at 00:00 - 01:30 UK time</span>
        </div>
      </div>

      {/* Date Selector Strip (shown in Daily mode) */}
      {timeframe === "today" && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-card p-2 rounded-xl border border-border">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full scrollbar-none">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 shrink-0">
              Date:
            </span>
            {pillDates.map((dStr) => {
              const isSelected = selectedDate === dStr;
              const pillLabel = formatDatePill(dStr, todayStr, yesterdayStr);
              const dayMovers = getDayMoversCount(dStr);
              return (
                <button
                  key={dStr}
                  type="button"
                  onClick={() => handleDateChange(dStr)}
                  className={`flex items-center gap-1.5 min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${
                    isSelected
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "bg-muted text-muted-foreground hover:text-foreground border border-border/70 hover:border-border"
                  }`}
                >
                  <span>{pillLabel}</span>
                  {dayMovers > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isSelected
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-primary/15 text-primary"
                      }`}
                    >
                      {dayMovers}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Inline Date Picker */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-muted border border-border text-xs shrink-0 self-start sm:self-auto">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">Pick date:</span>
            <input
              type="date"
              value={selectedDate}
              max={todayStr}
              min="2026-08-01"
              onChange={(e) => {
                if (e.target.value) {
                  handleDateChange(e.target.value);
                }
              }}
              className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
        </div>
      )}

      {/* Top summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {timeframe === "today" ? (
          isToday ? (
            <>
              <button
                type="button"
                onClick={() => setActiveView("dailyRisers")}
                className={`text-left p-3.5 rounded-xl border transition-all ${
                  activeView === "dailyRisers"
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "border-border bg-card hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Risen Today
                  </span>
                  <TrendingUp className="w-4 h-4 text-emerald-700 dark:text-primary" />
                </div>
                <div className="mt-2 text-2xl font-black text-emerald-700 dark:text-primary">
                  {selectedDateRisers.length}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Price rise today (+£0.1m)</p>
              </button>

              <button
                type="button"
                onClick={() => setActiveView("dailyFallers")}
                className={`text-left p-3.5 rounded-xl border transition-all ${
                  activeView === "dailyFallers"
                    ? "border-rose-400 bg-rose-500/10 ring-1 ring-rose-400"
                    : "border-border bg-card hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Fallen Today
                  </span>
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                </div>
                <div className="mt-2 text-2xl font-black text-rose-400">
                  {selectedDateFallers.length}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Price drop today (-£0.1m)</p>
              </button>

              <button
                type="button"
                onClick={() => setActiveView("predictedRisers")}
                className={`text-left p-3.5 rounded-xl border transition-all ${
                  activeView === "predictedRisers"
                    ? "border-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-400"
                    : "border-border bg-card hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Imminent Rise
                  </span>
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <div className="mt-2 text-2xl font-black text-foreground">
                  {data.predictedRisersTonight.length}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Target progress ≥ 60%</p>
              </button>

              <button
                type="button"
                onClick={() => setActiveView("predictedFallers")}
                className={`text-left p-3.5 rounded-xl border transition-all ${
                  activeView === "predictedFallers"
                    ? "border-amber-400 bg-amber-500/10 ring-1 ring-amber-400"
                    : "border-border bg-card hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Imminent Fall
                  </span>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <div className="mt-2 text-2xl font-black text-foreground">
                  {data.predictedFallersTonight.length}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Target progress ≤ -60%</p>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setActiveView("dailyRisers")}
                className={`text-left p-3.5 rounded-xl border transition-all ${
                  activeView === "dailyRisers"
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "border-border bg-card hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Risen ({selectedDateLabel})
                  </span>
                  <TrendingUp className="w-4 h-4 text-emerald-700 dark:text-primary" />
                </div>
                <div className="mt-2 text-2xl font-black text-emerald-700 dark:text-primary">
                  {selectedDateRisers.length}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Price rise on date (+£0.1m)</p>
              </button>

              <button
                type="button"
                onClick={() => setActiveView("dailyFallers")}
                className={`text-left p-3.5 rounded-xl border transition-all ${
                  activeView === "dailyFallers"
                    ? "border-rose-500 bg-rose-500/10 ring-1 ring-rose-500"
                    : "border-border bg-card hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Fallen ({selectedDateLabel})
                  </span>
                  <TrendingDown className="w-4 h-4 text-rose-700 dark:text-rose-400" />
                </div>
                <div className="mt-2 text-2xl font-black text-rose-700 dark:text-rose-400">
                  {selectedDateFallers.length}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Price drop on date (-£0.1m)</p>
              </button>

              <button
                type="button"
                onClick={() => setActiveView("allMovers")}
                className={`text-left p-3.5 rounded-xl border transition-all ${
                  activeView === "allMovers"
                    ? "border-sky-500 bg-sky-500/10 ring-1 ring-sky-500"
                    : "border-border bg-card hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    All Movers ({selectedDateLabel})
                  </span>
                  <History className="w-4 h-4 text-sky-700 dark:text-sky-400" />
                </div>
                <div className="mt-2 text-2xl font-black text-foreground">
                  {selectedDateRisers.length + selectedDateFallers.length}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Total price changes</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedDate(todayStr);
                  setActiveView("predictedRisers");
                }}
                className="text-left p-3.5 rounded-xl border border-border bg-card hover:bg-muted transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground">
                    Predictions Tonight
                  </span>
                  <Zap className="w-4 h-4 text-emerald-700 dark:text-primary" />
                </div>
                <div className="mt-2 text-2xl font-black text-foreground flex items-center gap-2">
                  <span>{data.predictedRisersTonight.length + data.predictedFallersTonight.length}</span>
                  <span className="text-xs font-normal text-emerald-700 dark:text-primary bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    Live Today
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Switch to Today&apos;s radar</p>
              </button>
            </>
          )
        ) : (
          <>
            <button
              type="button"
              onClick={() => setActiveView("risers")}
              className={`text-left p-3.5 rounded-xl border transition-all ${
                activeView === "risers"
                  ? "border-primary bg-primary/10 ring-1 ring-primary"
                  : "border-border bg-card hover:bg-muted"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Price Risers (GW)
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-700 dark:text-primary" />
              </div>
              <div className="mt-2 text-2xl font-black text-emerald-700 dark:text-primary">
                {data.totalRisersCount}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Risen this Gameweek</p>
            </button>

            <button
              type="button"
              onClick={() => setActiveView("fallers")}
              className={`text-left p-3.5 rounded-xl border transition-all ${
                activeView === "fallers"
                  ? "border-rose-500 bg-rose-500/10 ring-1 ring-rose-500"
                  : "border-border bg-card hover:bg-muted"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Price Fallers (GW)
                </span>
                <TrendingDown className="w-4 h-4 text-rose-700 dark:text-rose-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-rose-700 dark:text-rose-400">
                {data.totalFallersCount}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Fallen this Gameweek</p>
            </button>

            <button
              type="button"
              onClick={() => setActiveView("netIn")}
              className={`text-left p-3.5 rounded-xl border transition-all ${
                activeView === "netIn"
                  ? "border-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-400"
                  : "border-border bg-card hover:bg-muted"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  High Net In
                </span>
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-foreground">
                {data.topNetTransfersIn.length}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Top buy velocity</p>
            </button>

            <button
              type="button"
              onClick={() => setActiveView("netOut")}
              className={`text-left p-3.5 rounded-xl border transition-all ${
                activeView === "netOut"
                  ? "border-amber-400 bg-amber-500/10 ring-1 ring-amber-400"
                  : "border-border bg-card hover:bg-muted"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  High Net Out
                </span>
                <ArrowDownRight className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-foreground">
                {data.topNetTransfersOut.length}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Top sell velocity</p>
            </button>
          </>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by player or team..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 bg-muted border border-border rounded-lg text-xs sm:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground rounded transition-colors"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="text-xs text-muted-foreground self-center sm:self-auto">
          Showing {currentList.length} player{currentList.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {currentList.length === 0 ? (
          timeframe === "today" && !isToday && selectedDateRisers.length === 0 && selectedDateFallers.length === 0 && !search.trim() ? (
            <div className="p-8 text-center space-y-3">
              <div className="inline-flex p-3 rounded-full bg-background border border-border text-muted-foreground">
                <Calendar className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="text-sm font-semibold text-foreground">
                No price changes recorded on {formatDateFull(selectedDate)}
              </div>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                FPL price changes only occur overnight (00:00 - 01:30 UK time) when player net transfer velocity reaches the required threshold.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(todayStr);
                  setActiveView(data.totalDailyRisersCount > 0 ? "dailyRisers" : "predictedRisers");
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Zap className="w-3.5 h-3.5" />
                View Today&apos;s Price Changes
              </button>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {search.trim() ? `No players found matching "${search}".` : "No players found matching your criteria."}
            </div>
          )
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted text-muted-foreground text-xs uppercase border-b border-border">
                  {timeframe === "today" ? (
                    <tr>
                      <th className="py-3 px-4">Player</th>
                      <th className="py-3 px-3">Position</th>
                      <th className="py-3 px-3">Price</th>
                      <th className="py-3 px-3">
                        {isToday ? "Today Change" : `Change (${selectedDateLabel})`}
                      </th>
                      <th className="py-3 px-3">Target Progress Tonight</th>
                      <th className="py-3 px-3">GW Delta</th>
                      <th className="py-3 px-4 text-right">Net Velocity</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="py-3 px-4">Player</th>
                      <th className="py-3 px-3">Position</th>
                      <th className="py-3 px-3">Price</th>
                      <th className="py-3 px-3">GW Change</th>
                      <th className="py-3 px-3">Season Delta</th>
                      <th className="py-3 px-3">Transfers In</th>
                      <th className="py-3 px-3">Transfers Out</th>
                      <th className="py-3 px-4 text-right">Net Velocity</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-border/40">
                  {currentList.map(
                    ({
                      player,
                      netTransfersEvent,
                      costChangeEvent,
                      costChangeStart,
                      costChangeDay,
                      targetProgressPercent,
                      ownershipPercent,
                    }) => (
                      <tr
                        key={player.id}
                        className="hover:bg-muted/80 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="relative w-8 h-8 rounded-full overflow-hidden bg-muted border border-border shrink-0">
                              {player.image_url ? (
                                <Image
                                  src={player.image_url}
                                  alt={player.web_name}
                                  fill
                                  sizes="32px"
                                  className="object-cover object-top"
                                />
                              ) : null}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">
                                {player.web_name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {player.team_name} · {ownershipPercent}% owned
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getPositionBadgeClass(player.position)}`}>
                            {player.position}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-foreground">
                          £{player.price.toFixed(1)}m
                        </td>
                        {timeframe === "today" ? (
                          <>
                            <td className="py-3 px-3">
                              {costChangeDay > 0 ? (
                                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-primary bg-emerald-500/10 px-2 py-0.5 rounded text-xs border border-emerald-500/30">
                                  <TrendingUp className="w-3 h-3" />
                                  +£{(costChangeDay / 10).toFixed(1)}m
                                </span>
                              ) : costChangeDay < 0 ? (
                                <span className="inline-flex items-center gap-1 font-bold text-rose-700 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded text-xs border border-rose-500/30">
                                  <TrendingDown className="w-3 h-3" />
                                  -£{Math.abs(costChangeDay / 10).toFixed(1)}m
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">£0.0m</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-col gap-1 min-w-[140px] max-w-[180px]">
                                <div className="flex items-center justify-between text-xs">
                                  <span
                                    className={`font-mono font-semibold ${
                                      targetProgressPercent > 0
                                        ? "text-emerald-700 dark:text-primary"
                                        : targetProgressPercent < 0
                                          ? "text-rose-700 dark:text-rose-400"
                                          : "text-muted-foreground"
                                    }`}
                                  >
                                    {targetProgressPercent > 0
                                      ? `+${targetProgressPercent.toFixed(1)}%`
                                      : `${targetProgressPercent.toFixed(1)}%`}
                                  </span>
                                  {targetProgressPercent >= 90 ? (
                                    <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-primary bg-emerald-500/15 px-1.5 py-0.2 rounded border border-emerald-500/30 animate-pulse">
                                      Imminent
                                    </span>
                                  ) : targetProgressPercent <= -90 ? (
                                    <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 bg-rose-500/15 px-1.5 py-0.2 rounded border border-rose-500/30 animate-pulse">
                                      Imminent
                                    </span>
                                  ) : null}
                                </div>
                                <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden border border-border/60">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      targetProgressPercent >= 0 ? "bg-emerald-600 dark:bg-primary" : "bg-rose-500"
                                    }`}
                                    style={{
                                      width: `${Math.min(100, Math.max(0, Math.abs(targetProgressPercent)))}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              {costChangeEvent > 0 ? (
                                <span className="text-xs font-semibold text-emerald-700 dark:text-primary">
                                  +£{(costChangeEvent / 10).toFixed(1)}m
                                </span>
                              ) : costChangeEvent < 0 ? (
                                <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                                  -£{Math.abs(costChangeEvent / 10).toFixed(1)}m
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">£0.0m</span>
                              )}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3 px-3">
                              {costChangeEvent > 0 ? (
                                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-primary bg-emerald-500/10 px-2 py-0.5 rounded text-xs">
                                  <TrendingUp className="w-3 h-3" />
                                  +£{(costChangeEvent / 10).toFixed(1)}m
                                </span>
                              ) : costChangeEvent < 0 ? (
                                <span className="inline-flex items-center gap-1 font-bold text-rose-700 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded text-xs">
                                  <TrendingDown className="w-3 h-3" />
                                  -£{Math.abs(costChangeEvent / 10).toFixed(1)}m
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">£0.0m</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {costChangeStart > 0 ? (
                                <span className="text-xs font-semibold text-emerald-700 dark:text-primary">
                                  +£{(costChangeStart / 10).toFixed(1)}m
                                </span>
                              ) : costChangeStart < 0 ? (
                                <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                                  -£{Math.abs(costChangeStart / 10).toFixed(1)}m
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">£0.0m</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-xs text-emerald-700 dark:text-primary font-medium">
                              +{(player.transfers_in_event || 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-xs text-rose-700 dark:text-rose-400 font-medium">
                              -{(player.transfers_out_event || 0).toLocaleString()}
                            </td>
                          </>
                        )}
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`inline-block font-mono font-bold text-xs px-2.5 py-1 rounded-md ${
                              netTransfersEvent > 0
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-primary border border-emerald-500/30"
                                : netTransfersEvent < 0
                                  ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30"
                                  : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {netTransfersEvent > 0
                              ? `+${netTransfersEvent.toLocaleString()}`
                              : netTransfersEvent.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-border/40">
              {currentList.map(
                ({
                  player,
                  netTransfersEvent,
                  costChangeEvent,
                  costChangeStart,
                  costChangeDay,
                  targetProgressPercent,
                  ownershipPercent,
                }) => (
                  <div key={player.id} className="p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="relative w-8 h-8 rounded-full overflow-hidden bg-muted border border-border shrink-0">
                          {player.image_url ? (
                            <Image
                              src={player.image_url}
                              alt={player.web_name}
                              fill
                              sizes="32px"
                              className="object-cover object-top"
                            />
                          ) : null}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-foreground">
                            {player.web_name}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <span>{player.team_short}</span>
                            <span>·</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getPositionBadgeClass(player.position)}`}>
                              {player.position}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-sm text-foreground">
                          £{player.price.toFixed(1)}m
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {ownershipPercent}% owned
                        </div>
                      </div>
                    </div>

                    {timeframe === "today" ? (
                      <div className="pt-1.5 space-y-2 border-t border-border/30">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{selectedDateLabel}:</span>
                            {costChangeDay > 0 ? (
                              <span className="font-bold text-emerald-700 dark:text-primary">
                                +£{(costChangeDay / 10).toFixed(1)}m
                              </span>
                            ) : costChangeDay < 0 ? (
                              <span className="font-bold text-rose-700 dark:text-rose-400">
                                -£{Math.abs(costChangeDay / 10).toFixed(1)}m
                              </span>
                            ) : (
                              <span className="text-muted-foreground">£0.0m</span>
                            )}
                            <span className="text-muted-foreground ml-1">GW:</span>
                            <span className={costChangeEvent >= 0 ? "text-emerald-700 dark:text-primary" : "text-rose-700 dark:text-rose-400"}>
                              {costChangeEvent >= 0
                                ? `+£${(costChangeEvent / 10).toFixed(1)}m`
                                : `-£${Math.abs(costChangeEvent / 10).toFixed(1)}m`}
                            </span>
                          </div>
                          <span
                            className={`font-mono text-xs px-2 py-0.5 rounded font-medium ${
                              netTransfersEvent > 0
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-primary"
                                : "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                            }`}
                          >
                            {netTransfersEvent > 0
                              ? `+${netTransfersEvent.toLocaleString()}`
                              : netTransfersEvent.toLocaleString()}
                          </span>
                        </div>

                        {/* Target Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">Target Tonight</span>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`font-mono font-semibold ${
                                  targetProgressPercent > 0
                                    ? "text-emerald-700 dark:text-primary"
                                    : targetProgressPercent < 0
                                      ? "text-rose-700 dark:text-rose-400"
                                      : "text-muted-foreground"
                                }`}
                              >
                                {targetProgressPercent > 0
                                  ? `+${targetProgressPercent.toFixed(1)}%`
                                  : `${targetProgressPercent.toFixed(1)}%`}
                              </span>
                              {targetProgressPercent >= 90 ? (
                                <span className="text-[9px] uppercase font-bold text-emerald-700 dark:text-primary bg-emerald-500/15 px-1 py-0.2 rounded border border-emerald-500/30">
                                  Imminent
                                </span>
                              ) : targetProgressPercent <= -90 ? (
                                <span className="text-[9px] uppercase font-bold text-rose-700 dark:text-rose-400 bg-rose-500/15 px-1 py-0.2 rounded border border-rose-500/30">
                                  Imminent
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden border border-border/60">
                            <div
                              className={`h-full rounded-full transition-all ${
                                targetProgressPercent >= 0 ? "bg-emerald-600 dark:bg-primary" : "bg-rose-500"
                              }`}
                              style={{
                                width: `${Math.min(100, Math.max(0, Math.abs(targetProgressPercent)))}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between pt-1 text-xs border-t border-border/30">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">GW:</span>
                          {costChangeEvent > 0 ? (
                            <span className="font-bold text-emerald-700 dark:text-primary">
                              +£{(costChangeEvent / 10).toFixed(1)}m
                            </span>
                          ) : costChangeEvent < 0 ? (
                            <span className="font-bold text-rose-700 dark:text-rose-400">
                              -£{Math.abs(costChangeEvent / 10).toFixed(1)}m
                            </span>
                          ) : (
                            <span className="text-muted-foreground">£0.0m</span>
                          )}
                          <span className="text-muted-foreground ml-1">Season:</span>
                          <span className={costChangeStart >= 0 ? "text-emerald-700 dark:text-primary" : "text-rose-700 dark:text-rose-400"}>
                            {costChangeStart >= 0
                              ? `+£${(costChangeStart / 10).toFixed(1)}m`
                              : `-£${Math.abs(costChangeStart / 10).toFixed(1)}m`}
                          </span>
                        </div>

                        <div>
                          <span
                            className={`font-mono text-xs px-2 py-0.5 rounded font-medium ${
                              netTransfersEvent > 0
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-primary"
                                : "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                            }`}
                          >
                            Net: {netTransfersEvent > 0 ? `+${netTransfersEvent.toLocaleString()}` : netTransfersEvent.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
