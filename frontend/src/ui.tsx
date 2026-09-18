import React from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { inr } from "./api";

export const NAVY = "#002970";
export const SKY = "#00BAF2";

export const Btn = ({ kind = "primary", className = "", ...p }: any) => {
  const base = "rounded-xl px-4 py-3 text-[13px] font-bold tracking-tight transition active:scale-[.985] disabled:opacity-40 disabled:active:scale-100";
  const kinds: any = {
    primary: "bg-[#002970] text-white hover:bg-[#06337f]",
    accent: "bg-[#00BAF2] text-[#002970] hover:brightness-[1.04]",
    ghost: "border border-[#e2e7ef] bg-white text-[#5b6b84] hover:bg-[#f7f9fc]",
  };
  return <button {...p} className={`${base} ${kinds[kind]} ${className}`} />;
};

export const Label = ({ children, className = "" }: any) => (
  <div className={`text-[10px] font-bold uppercase tracking-[0.13em] text-[#8a98ad] ${className}`}>{children}</div>
);

export const Pill = ({ tone = "slate", children }: any) => {
  const tones: any = {
    slate: "bg-[#eef1f6] text-[#5b6b84]",
    green: "bg-[#ecfdf3] text-[#067647] ring-1 ring-[#abefc6]",
    amber: "bg-[#fffaeb] text-[#b54708] ring-1 ring-[#fedf89]",
    navy: "bg-[#eaf0fb] text-[#002970] ring-1 ring-[#c6d7f5]",
  };
  return <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${tones[tone]}`}>{children}</span>;
};

/** A figure the merchant can tap to see the payments underneath it. */
export const Traceable = ({ label, value, onTap }: any) => (
  <button onClick={onTap} disabled={!onTap}
    className={`group w-full rounded-xl border px-3 py-2.5 text-left transition ${
      onTap ? "border-[#c6d7f5] bg-[#f7faff] hover:border-[#002970]" : "border-[#e2e7ef] bg-white"}`}>
    <div className="text-[10px] font-semibold leading-tight text-[#8a98ad]">{label}</div>
    <div className="tnum mt-1 text-[17px] font-extrabold leading-none tracking-tight text-[#0b1b33]">{value}</div>
    {onTap && (
      <div className="mt-1.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#002970] opacity-60 group-hover:opacity-100">
        <span className="h-1 w-1 rounded-full bg-[#00BAF2]" /> view payments
      </div>
    )}
  </button>
);

const axis = { stroke: "#a9b4c6", fontSize: 10, tickLine: false, axisLine: false, fontWeight: 600 } as any;
const tip = { fontSize: 11, borderRadius: 10, border: "1px solid #e2e7ef", boxShadow: "0 8px 24px -12px rgba(11,27,51,.3)" };

export const Spark = ({ data }: any) => (
  <ResponsiveContainer width="100%" height={40}>
    <LineChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
      <Line type="monotone" dataKey="gmv" stroke="rgba(255,255,255,.85)" strokeWidth={1.75} dot={false} />
      <Tooltip formatter={(v: any) => inr(v)} labelFormatter={(_: any, p: any) => p?.[0]?.payload?.date ?? ""}
        contentStyle={tip} />
    </LineChart>
  </ResponsiveContainer>
);

export const WeeklyCustomers = ({ data }: any) => (
  <ResponsiveContainer width="100%" height={132}>
    <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
      <CartesianGrid strokeDasharray="2 4" stroke="#e8ecf3" vertical={false} />
      <XAxis dataKey="week" {...axis} interval={2} />
      <YAxis {...axis} width={30} />
      <Tooltip contentStyle={tip} />
      <Line type="monotone" dataKey="these_customers" stroke={NAVY} strokeWidth={2.75} dot={false}
        name="visits" activeDot={{ r: 3.5 }} />
    </LineChart>
  </ResponsiveContainer>
);

export const Compare = ({ data, unit = "%", keyName = "value" }: any) => (
  <ResponsiveContainer width="100%" height={116}>
    <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }} barCategoryGap="32%">
      <CartesianGrid strokeDasharray="2 4" stroke="#e8ecf3" vertical={false} />
      <XAxis dataKey="who" {...axis} />
      <YAxis {...axis} width={34} />
      <Tooltip formatter={(v: any) => (unit === "%" ? `${v}%` : inr(v))} contentStyle={tip} cursor={{ fill: "#f4f7fb" }} />
      <Bar dataKey={keyName} radius={[5, 5, 0, 0]}>
        {data.map((_: any, i: number) => <Cell key={i} fill={i === 0 ? NAVY : "#cfd8e6"} />)}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

export const Hourly = ({ data }: any) => (
  <ResponsiveContainer width="100%" height={140}>
    <BarChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: -18 }} barCategoryGap="18%">
      <CartesianGrid strokeDasharray="2 4" stroke="#e8ecf3" vertical={false} />
      <XAxis dataKey="hour" {...axis} interval={1} />
      <YAxis {...axis} width={30} unit="%" />
      <Tooltip formatter={(v: any) => `${v}%`} contentStyle={tip} cursor={{ fill: "#f4f7fb" }} />
      <Bar dataKey="nearby" fill="#cfd8e6" radius={[2, 2, 0, 0]} name="Nearby" />
      <Bar dataKey="you" fill={NAVY} radius={[2, 2, 0, 0]} name="You" />
    </BarChart>
  </ResponsiveContainer>
);

export const Forecast = ({ data }: any) => (
  <ResponsiveContainer width="100%" height={136}>
    <BarChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: -6 }}>
      <CartesianGrid strokeDasharray="2 4" stroke="#e8ecf3" vertical={false} />
      <XAxis dataKey="day" {...axis} interval={6} tickFormatter={(d: any) => `+${d}d`} />
      <YAxis {...axis} width={40} tickFormatter={(v: any) => `${Math.round(v / 1000)}k`} />
      <Tooltip formatter={(v: any) => inr(v)} labelFormatter={(d: any) => `In ${d} days`} contentStyle={tip}
        cursor={{ fill: "#f4f7fb" }} />
      <Bar dataKey="sales" radius={[2, 2, 0, 0]}>
        {data.map((d: any, i: number) => <Cell key={i} fill={d.festival ? "#f79009" : "#cfd8e6"} />)}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

export const Sheet = ({ open, onClose, title, children }: any) =>
  !open ? null : (
    <div className="absolute inset-0 z-30 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-[#0b1b33]/35 backdrop-blur-[1px]" />
      <div className="relative max-h-[80%] w-full overflow-y-auto rounded-t-[22px] bg-white px-4 pb-5 pt-3 no-scrollbar"
        onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-[#dde3ec]" />
        <div className="mb-3 text-[14px] font-extrabold tracking-tight text-[#0b1b33]">{title}</div>
        {children}
      </div>
    </div>
  );
