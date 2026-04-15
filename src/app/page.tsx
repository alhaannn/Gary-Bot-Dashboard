"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { RefreshCcw, Activity, Target, Award, ArrowUpRight, ArrowDownRight, Clock, Filter, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { motion, AnimatePresence } from "framer-motion";

declare global {
  interface Window {
    Telegram?: any;
  }
}

type Trade = {
  id: string;
  pair: string;
  action: string;
  entry_price: number | null;
  sl: number | null;
  tp: number | null;
  status: string;
  pnl: number;
  channel: string;
  created_at: string;
  updated_at: string;
};

// --- Time Utilities specifically for IST ---
const formatIST = (isoString: string) => {
  return new Date(isoString).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });
};

const getISTDateParams = (isoString: string) => {
  const d = new Date(isoString);
  // Get date strictly in IST for exact daily grouping
  const formatter = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'numeric', day: 'numeric'});
  const parts = formatter.formatToParts(d);
  const day = parts.find(p => p.type === 'day')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const year = parts.find(p => p.type === 'year')?.value;
  return { year: Number(year), month: Number(month) - 1, day: Number(day) }; // month is 0-indexed for JS Date logic
};

export default function Dashboard() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChannel, setActiveChannel] = useState<string>("All");
  const [calendarDate, setCalendarDate] = useState(() => getISTDateParams(new Date().toISOString()));

  const prevMonth = () => {
    setCalendarDate(prev => {
      const newMonth = prev.month - 1;
      return newMonth < 0 ? { year: prev.year - 1, month: 11, day: prev.day } : { year: prev.year, month: newMonth, day: prev.day };
    });
  };

  const nextMonth = () => {
    setCalendarDate(prev => {
      const newMonth = prev.month + 1;
      return newMonth > 11 ? { year: prev.year + 1, month: 0, day: prev.day } : { year: prev.year, month: newMonth, day: prev.day };
    });
  };

  const fetchTrades = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTrades(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
    fetchTrades();
  }, []);

  // Compute stats
  const channels = ["All", ...Array.from(new Set(trades.map(t => t.channel || "Unknown"))).filter(Boolean)];
  
  const filteredTrades = useMemo(() => {
    return activeChannel === "All" ? trades : trades.filter(t => (t.channel || "Unknown") === activeChannel);
  }, [trades, activeChannel]);

  const stats = useMemo(() => {
    // Isolate stats logic entirely to the currently viewed calendar month
    const monthlyTrades = filteredTrades.filter(t => {
      const { year, month } = getISTDateParams(t.updated_at || t.created_at);
      return year === calendarDate.year && month === calendarDate.month;
    });

    const totalPnL = monthlyTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
    const closedTrades = monthlyTrades.filter(t => t.pnl !== 0);
    const winTrades = closedTrades.filter(t => t.pnl > 0);
    const winRate = closedTrades.length ? (winTrades.length / closedTrades.length) * 100 : 0;
    
    // For chart
    const startingBalance = process.env.NEXT_PUBLIC_STARTING_BALANCE ? Number(process.env.NEXT_PUBLIC_STARTING_BALANCE) : 2500;
    let currentBalance = startingBalance;
    const chartData = [...closedTrades].reverse().map((t, i) => {
      currentBalance += t.pnl;
      const dateStr = t.updated_at || t.created_at;
      const dateName = new Date(dateStr).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric' });
      return { name: dateName, balance: currentBalance, actual: t.pnl };
    });

    return { totalPnL, winRate, totalTrades: monthlyTrades.length, chartData };
  }, [filteredTrades, calendarDate]);

  // --- Calendar Logic ---
  const todayIST = getISTDateParams(new Date().toISOString());
  
  // Aggregate PnL per day in IST
  const dailyPnLMap = useMemo(() => {
    const map = new Map<string, number>();
    // We base daily performance on 'updated_at' (when it closed)
    filteredTrades.filter(t => t.pnl !== 0).forEach(t => {
      const { year, month, day } = getISTDateParams(t.updated_at || t.created_at);
      const key = `${year}-${month}-${day}`;
      map.set(key, (map.get(key) || 0) + t.pnl);
    });
    return map;
  }, [filteredTrades]);

  const renderCalendar = () => {
    const year = calendarDate.year;
    const month = calendarDate.month;
    const todayDay = todayIST.year === year && todayIST.month === month ? todayIST.day : null;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday

    const days = [];
    // Padding for first week
    for(let i=0; i<firstDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-8"/>);
    }
    
    // Actual days
    for(let d=1; d<=daysInMonth; d++) {
      const key = `${year}-${month}-${d}`;
      const pnl = dailyPnLMap.get(key) || 0;
      
      const isToday = d === todayDay;
      const hasTrade = dailyPnLMap.has(key);
      const isWin = pnl > 0;
      const isLoss = pnl < 0;
      const isBE = hasTrade && pnl === 0;

      days.push(
        <div 
          key={d} 
          className={`h-11 rounded-lg border flex flex-col items-center justify-center relative transition-colors ${
            isToday ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/5 bg-white/[0.02]'
          } ${hasTrade ? 'hover:bg-white/10' : ''}`}
        >
          <span className={`text-[10px] font-bold z-10 ${isToday ? 'text-blue-400' : 'text-slate-400'}`}>{d}</span>
          {hasTrade && (
            <div className={`text-[9px] font-extrabold mt-0.5 px-1 rounded z-10 ${isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-yellow-400'}`}>
              {isWin ? '+' : ''}{pnl > 0 || pnl < 0 ? Math.round(pnl) : 'B/E'}
            </div>
          )}
          {/* Subtle background color indicating result */}
          {hasTrade && (
             <div className={`absolute inset-0 rounded-lg opacity-20 ${isWin ? 'bg-emerald-500' : isLoss ? 'bg-rose-500' : 'bg-yellow-500'}`} />
          )}
        </div>
      );
    }

    return (
      <div className="w-full">
        <div className="grid grid-cols-7 gap-1.5 mb-2 text-center text-[10px] font-bold text-slate-500 tracking-widest uppercase">
          <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {days}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0E1117] text-slate-200 font-sans selection:bg-blue-500/30 overflow-x-hidden pb-12">
      {/* Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 bg-[#0e1117]/80 backdrop-blur-md border-b border-white/5 p-5 flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">GaryBot OS</h1>
          <p className="text-xs font-medium text-slate-500 tracking-wide uppercase mt-0.5">Advanced Analytics</p>
        </div>
        <button 
          onClick={fetchTrades} 
          className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10 active:scale-95"
        >
          <RefreshCcw size={18} className={loading ? "animate-spin text-blue-400" : "text-slate-400"} />
        </button>
      </motion.header>

      <div className="p-4 space-y-6">
        
        {/* Channel Filter (Pills) */}
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="flex overflow-x-auto pb-2 -mx-4 px-4 gap-2 no-scrollbar"
        >
          {channels.map(channel => (
            <button
              key={channel}
              onClick={() => setActiveChannel(channel)}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-300 border ${
                activeChannel === channel 
                  ? "bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]" 
                  : "bg-white/5 text-slate-400 border-transparent hover:bg-white/10"
              }`}
            >
              {channel}
            </button>
          ))}
        </motion.div>

        {/* Global / Specific Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15 }}
            className="p-4 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/5 shadow-xl relative overflow-hidden"
          >
            <div className="absolute -right-4 -bottom-4 opacity-5">
              <Activity size={80} />
            </div>
            <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase mb-1">Total PnL</p>
            <h2 className={`text-3xl font-bold tracking-tight ${stats.totalPnL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {stats.totalPnL >= 0 ? "+" : ""}${stats.totalPnL.toFixed(2)}
            </h2>
          </motion.div>

          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}
            className="p-4 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/5 shadow-xl relative overflow-hidden"
          >
            <div className="absolute -right-4 -bottom-4 opacity-5">
              <Target size={80} />
            </div>
            <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase mb-1">Win Rate</p>
            <h2 className="text-3xl font-bold tracking-tight text-blue-400">
              {stats.winRate ? stats.winRate.toFixed(1) : 0}%
            </h2>
          </motion.div>
        </div>

        {/* Performance Calendar */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}
          className="p-5 rounded-2xl bg-black/20 border border-white/5 relative"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-blue-400" />
              <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                {new Date(calendarDate.year, calendarDate.month).toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="p-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-400 active:scale-95 transition-all"><ChevronLeft size={16}/></button>
              <button 
                onClick={() => setCalendarDate(todayIST)} 
                className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-white/5 hover:bg-blue-500/20 hover:text-blue-400 rounded-md text-slate-400 active:scale-95 transition-all"
              >
                Today
              </button>
              <button onClick={nextMonth} className="p-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-400 active:scale-95 transition-all"><ChevronRight size={16}/></button>
            </div>
          </div>
          {renderCalendar()}
        </motion.div>

        {/* Equity Curve Chart */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
          className="p-4 rounded-2xl bg-black/20 border border-white/5 relative h-64"
        >
          <div className="absolute top-4 left-5 z-10 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Equity Curve</span>
          </div>
          {stats.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.chartData} margin={{ top: 30, left: 0, right: 10, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#334155" fontSize={10} tickLine={false} axisLine={false} padding={{ left: 10, right: 10 }} />
                <YAxis domain={['auto', 'auto']} stroke="#334155" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }}
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(8px)' }}
                  itemStyle={{ color: '#38bdf8', fontWeight: 'bold' }}
                  formatter={(val: any) => [`$${Number(val).toFixed(2)}`, "Account Balance"]}
                />
                <Line 
                  type="monotone" 
                  dataKey="balance" 
                  name="Account Balance"
                  stroke="url(#colorUv)" 
                  strokeWidth={3} 
                  dot={false} 
                  activeDot={{ r: 6, fill: "#38bdf8", strokeWidth: 2, stroke: "#0f172a" }} 
                />
                <defs>
                  <linearGradient id="colorUv" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#34d399" />
                  </linearGradient>
                </defs>
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-slate-500">No closed trades yet</div>
          )}
        </motion.div>

        {/* Trades Feed */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
          <h3 className="text-sm uppercase font-bold tracking-wider mb-4 text-slate-400 flex items-center gap-2 px-1">
            <Clock size={16} /> Recent Activity (IST)
          </h3>
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {loading && trades.length === 0 ? (
                <motion.div key="loading" exit={{ opacity: 0 }} className="text-center p-8 text-slate-500 animate-pulse text-sm">Syncing encrypted ledger...</motion.div>
              ) : filteredTrades.length === 0 ? (
                <motion.div key="empty" exit={{ opacity: 0 }} className="text-center p-8 border border-white/5 rounded-2xl text-slate-500 text-sm">No trades map to {activeChannel}</motion.div>
              ) : (
                filteredTrades.map((trade, i) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2, delay: i * 0.05 }}
                    key={trade.id} 
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-col justify-between hover:bg-white/[0.04] transition-colors relative overflow-hidden"
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${trade.action.includes('BUY') ? 'bg-emerald-500/50' : trade.action.includes('SELL') ? 'bg-rose-500/50' : 'bg-slate-500/50'}`} />
                    
                    <div className="w-full pl-2 flex items-start justify-between">
                      <div>
                        {/* Upper Details */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${trade.action.includes('BUY') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : trade.action.includes('SELL') ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-slate-500/10 text-slate-400'}`}>
                            {trade.action}
                          </span>
                          <span className="font-bold text-slate-200 tracking-wide text-sm">{trade.pair}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 font-medium tracking-wide mb-3">
                          <span className="flex items-center gap-1 text-blue-400"><Filter size={12}/>{trade.channel || 'Unknown'}</span>
                          <span>Entry: {trade.entry_price || 'N/A'}</span>
                        </div>

                        {/* Timestamps in IST */}
                        <div className="space-y-1">
                          <div className="text-[10px] text-slate-500 font-medium">OPEN: {formatIST(trade.created_at)}</div>
                          {trade.status !== "OPEN" && (
                            <div className="text-[10px] text-slate-400 font-medium">
                              {trade.status === "CLOSED_PARTIAL" ? "PARTIALED" : "CLOSED"}: {formatIST(trade.updated_at || trade.created_at)}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Right Panel PnL */}
                      <div className="text-right">
                        {trade.pnl !== 0 ? (
                          <div className={`font-bold text-lg flex items-center justify-end gap-1 ${trade.pnl > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {trade.pnl > 0 ? <ArrowUpRight size={20} strokeWidth={3}/> : <ArrowDownRight size={20} strokeWidth={3}/>}
                            ${Math.abs(trade.pnl).toFixed(2)}
                          </div>
                        ) : (
                          <div className="px-2 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-md text-xs font-bold uppercase tracking-wider inline-block">
                            Active
                          </div>
                        )}
                        <div className="text-[10px] font-semibold text-slate-500 mt-1.5 uppercase tracking-wider">
                          {trade.status}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
