import React from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { inr } from "./api";

export const NAVY = "#002970";
export const CYAN = "#00BAF2";

export const Btn = ({ kind = "primary", className = "", ...p }: any) => {
  const base = "rounded-xl px-4 py-3 text-sm font-semibold transition active:scale-[.98] disabled:opacity-40";
  const kinds: any = {
    primary: "bg-[#002970] text-white hover:bg-[#00337f]",
    accent: "bg-[#00BAF2] text-[#002970] hover:brightness-105",
    ghost: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    dark: "bg-slate-800 text-slate-100 hover:bg-slate-700",
  };
  return <button {...p} className={`${base} ${kinds[kind]} ${className}`} />;
};

export const Pill = ({ tone = "slate", children }: any) => {
  const tones: any = {
    slate: "bg-slate-100 text-slate-600", green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-800", cyan: "bg-cyan-100 text-cyan-800",
    red: "bg-rose-100 text-rose-700",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
};

/** A number the merchant can tap to see the payments behind it. */
export const Traceable = ({ label, value, onTap }: any) => (
  <button onClick={onTap} disabled={!onTap}
    className={`w-full rounded-xl border p-3 text-left ${onTap ? "border-cyan-300 bg-cyan-50/60 hover:bg-cyan-50" : "border-slate-200 bg-slate-50"}`}>
    <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
    <div className="mt-0.5 text-lg font-bold text-slate-900">{value}</div>
    {onTap && <div className="mt-1 text-[10px] font-semibold text-cyan-700">tap to see the payments &rarr;</div>}
  </button>
);

const axis = { stroke: "#94a3b8", fontSize: 10, tickLine: false, axisLine: false } as any;

export const Spark = ({ data }: any) => (
  <ResponsiveContainer width="100%" height={56}>
    <LineChart data={data}>
      <Line type="monotone" dataKey="gmv" stroke={CYAN} strokeWidth={2} dot={false} />
      <Tooltip formatter={(v: any) => inr(v)} labelFormatter={(l: any, p: any) => p?.[0]?.payload?.date ?? ""}
        contentStyle={{ fontSize: 11, borderRadius: 8 }} />
    </LineChart>
  </ResponsiveContainer>
);

export const WeeklyCustomers = ({ data }: any) => (
  <ResponsiveContainer width="100%" height={130}>
    <LineChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
      <XAxis dataKey="week" {...axis} interval={2} />
      <YAxis {...axis} width={44} />
      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
      <Line type="monotone" dataKey="these_customers" stroke={NAVY} strokeWidth={3} dot={false} name="These customers" />
    </LineChart>
  </ResponsiveContainer>
);

export const Compare = ({ data, unit = "%", keyName = "value" }: any) => (
  <ResponsiveContainer width="100%" height={110}>
    <BarChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -20 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
      <XAxis dataKey="who" {...axis} />
      <YAxis {...axis} width={38} />
      <Tooltip formatter={(v: any) => (unit === "%" ? `${v}%` : inr(v))} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
      <Bar dataKey={keyName} radius={[6, 6, 0, 0]}>
        {data.map((d: any, i: number) => <Cell key={i} fill={i === 0 ? NAVY : "#cbd5e1"} />)}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

export const Hourly = ({ data }: any) => (
  <ResponsiveContainer width="100%" height={140}>
    <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -22 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
      <XAxis dataKey="hour" {...axis} interval={1} />
      <YAxis {...axis} width={34} unit="%" />
      <Tooltip formatter={(v: any) => `${v}%`} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
      <Bar dataKey="nearby" fill="#cbd5e1" radius={[3, 3, 0, 0]} name="Nearby shops" />
      <Bar dataKey="you" fill={NAVY} radius={[3, 3, 0, 0]} name="You" />
    </BarChart>
  </ResponsiveContainer>
);

export const Forecast = ({ data }: any) => (
  <ResponsiveContainer width="100%" height={140}>
    <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -12 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
      <XAxis dataKey="day" {...axis} interval={6} tickFormatter={(d: any) => `+${d}d`} />
      <YAxis {...axis} width={46} tickFormatter={(v: any) => `${Math.round(v / 1000)}k`} />
      <Tooltip formatter={(v: any) => inr(v)} labelFormatter={(d: any) => `In ${d} days`} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
      <Bar dataKey="sales" radius={[3, 3, 0, 0]}>
        {data.map((d: any, i: number) => <Cell key={i} fill={d.festival ? "#f59e0b" : "#cbd5e1"} />)}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

export const Sheet = ({ open, onClose, title, children }: any) =>
  !open ? null : (
    <div className="absolute inset-0 z-30 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40" />
      <div className="relative max-h-[78%] w-full overflow-y-auto rounded-t-3xl bg-white p-4 no-scrollbar"
        onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" />
        <div className="mb-2 text-sm font-bold text-slate-900">{title}</div>
        {children}
      </div>
    </div>
  );
