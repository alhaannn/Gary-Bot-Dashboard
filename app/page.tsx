"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { RefreshCcw, TrendingUp, TrendingDown, Clock, Activity, Target } from "lucide-react";
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from "recharts";

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
  created_at: string;
};

export default function Dashboard() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

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
    // Notify Telegram App it's ready
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
    fetchTrades();
  }, []);

  const totalPnL = trades.reduce((acc, t) => acc + (t.pnl || 0), 0);
  const winRate = trades.length ? (trades.filter(t => t.pnl > 0).length / trades.filter(t => t.pnl !== 0).length) * 100 : 0;
  
  // Format for chart
  let cumulative = 0;
  const chartData = [...trades].reverse().filter(t => t.pnl !== 0).map((t, i) => {
    cumulative += t.pnl;
    return { name: `T${i+1}`, pnl: cumulative };
  });

  return (
    <div className="min-h-screen bg-[#0E1117] text-slate-200 p-4 font-sans selection:bg-blue-500/30">
      <header className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">GaryBot OS</h1>
          <p className="text-sm font-medium text-slate-500 tracking-wide mt-1">Live Trading Analytics</p>
        </div>
        <button 
          onClick={fetchTrades} 
          className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
        >
          <RefreshCcw size={18} className={loading ? "animate-spin text-blue-400" : "text-slate-400"} />
        </button>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity size={48} />
          </div>
          <p className="text-sm text-slate-400 font-medium tracking-wide mb-1">Total PnL</p>
          <div className="flex items-baseline gap-2">
            <h2 className={`text-4xl font-bold tracking-tight ${totalPnL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}
            </h2>
          </div>
        </div>
        <div className="p-5 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Target size={48} />
          </div>
          <p className="text-sm text-slate-400 font-medium tracking-wide mb-1">Win Rate</p>
          <h2 className="text-4xl font-bold tracking-tight text-blue-400">
            {winRate ? winRate.toFixed(1) : 0}%
          </h2>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="mb-8 p-5 rounded-2xl bg-black/20 border border-white/5 relative h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="name" stroke="#334155" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                itemStyle={{ color: '#38bdf8' }}
              />
              <Line type="monotone" dataKey="pnl" stroke="#38bdf8" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: "#38bdf8", strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Trades */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-slate-300 flex items-center gap-2">
          <Clock size={18} /> Recent Activity
        </h3>
        <div className="space-y-3">
          {loading && trades.length === 0 ? (
            <div className="text-center p-8 text-slate-500 animate-pulse">Syncing data...</div>
          ) : trades.length === 0 ? (
            <div className="text-center p-8 border border-white/5 rounded-2xl text-slate-500">No trades recorded yet</div>
          ) : (
            trades.map((trade) => (
              <div key={trade.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between hover:bg-white/[0.04] transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${trade.action === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {trade.action}
                    </span>
                    <span className="font-semibold text-slate-200">{trade.pair}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Entry: {trade.entry_price || 'N/A'} • Status: {trade.status}
                  </div>
                </div>
                <div className="text-right">
                  {trade.pnl !== 0 ? (
                    <div className={`font-bold flex items-center justify-end gap-1 ${trade.pnl > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {trade.pnl > 0 ? <TrendingUp size={16}/> : <TrendingDown size={16}/>}
                      {trade.pnl > 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                    </div>
                  ) : (
                    <div className="text-slate-400 text-sm font-medium flex items-center justify-end gap-1">Open <span>⏳</span></div>
                  )}
                  <div className="text-xs text-slate-600 mt-1">
                    {new Date(trade.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
