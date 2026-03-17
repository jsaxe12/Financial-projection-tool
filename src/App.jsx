import { useState, useCallback } from "react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";

const fmt = (n) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const fmtNum = (n) => {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toFixed(0);
};

const SCENARIO_PRESETS = {
  conservative: { newCustomersY1: 30, growthRate: 55, churnRate: 8, avgMRR: 175, cogsPercent: 18, smPercent: 28, rdPercent: 15, gaPercent: 10 },
  base: { newCustomersY1: 60, growthRate: 75, churnRate: 6, avgMRR: 220, cogsPercent: 15, smPercent: 25, rdPercent: 12, gaPercent: 8 },
  optimistic: { newCustomersY1: 100, growthRate: 95, churnRate: 4, avgMRR: 280, cogsPercent: 12, smPercent: 22, rdPercent: 10, gaPercent: 7 },
};

function buildProjection(params) {
  const { newCustomersY1, growthRate, churnRate, avgMRR, cogsPercent, smPercent, rdPercent, gaPercent } = params;
  const years = [];
  let customers = 0;
  const annualChurn = churnRate / 100;
  const annualGrowth = growthRate / 100;

  for (let y = 1; y <= 10; y++) {
    const newCusts = y === 1 ? newCustomersY1 : Math.round(years[y - 2].newCustomers * (1 + annualGrowth));
    const churned = Math.round(customers * annualChurn);
    customers = customers - churned + newCusts;
    const arr = customers * avgMRR * 12;
    const cogs = arr * (cogsPercent / 100);
    const grossProfit = arr - cogs;
    const sm = arr * (smPercent / 100);
    const rd = arr * (rdPercent / 100);
    const ga = arr * (gaPercent / 100);
    const opex = sm + rd + ga;
    const ebitda = grossProfit - opex;
    const ebitdaMargin = arr > 0 ? (ebitda / arr) * 100 : 0;

    years.push({
      year: `Y${y}`,
      customers,
      newCustomers: newCusts,
      churned,
      arr,
      grossProfit,
      grossMargin: arr > 0 ? (grossProfit / arr) * 100 : 0,
      ebitda,
      ebitdaMargin,
      sm, rd, ga,
    });
  }
  return years;
}

const TABS = ["Revenue", "Customers", "Profitability", "Assumptions"];

const SliderInput = ({ label, value, min, max, step, onChange, format }) => (
  <div className="mb-4">
    <div className="flex justify-between mb-1">
      <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</span>
      <span className="text-sm font-bold text-amber-400">{format ? format(value) : value}</span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full accent-amber-400 cursor-pointer"
    />
    <div className="flex justify-between text-xs text-slate-600 mt-half">
      <span>{format ? format(min) : min}</span>
      <span>{format ? format(max) : max}</span>
    </div>
  </div>
);

const MetricCard = ({ label, value, sub, highlight }) => (
  <div className={`rounded-xl metric-card ${highlight ? "metric-highlight" : "metric-default"}`}>
    <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">{label}</div>
    <div className={`metric-value ${highlight ? "text-amber-400" : "text-white"}`}>{value}</div>
    {sub && <div className="text-xs text-slate-500 mt-half">{sub}</div>}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="font-bold text-white mb-2">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex justify-between gap-4" style={{ color: p.color }}>
          <span>{p.name}</span>
          <span className="font-bold">{typeof p.value === "number" && p.value > 1000 ? fmt(p.value) : p.value?.toFixed ? p.value.toFixed(1) + (p.name.includes("Margin") ? "%" : "") : p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function App() {
  const [scenario, setScenario] = useState("base");
  const [params, setParams] = useState(SCENARIO_PRESETS.base);
  const [activeTab, setActiveTab] = useState("Revenue");

  const setParam = useCallback((key, val) => {
    setScenario("custom");
    setParams(p => ({ ...p, [key]: val }));
  }, []);

  const applyScenario = (s) => {
    setScenario(s);
    setParams(SCENARIO_PRESETS[s]);
  };

  const data = buildProjection(params);
  const y10 = data[9];
  const y5 = data[4];
  const firstProfitYear = data.find(d => d.ebitda > 0);

  return (
    <div style={{ fontFamily: "'DM Mono', 'Courier New', monospace", background: "#0a0c10", minHeight: "100vh", color: "#e2e8f0" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #1e293b", padding: "24px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
            ✈ TAILNUMBER <span style={{ color: "#fbbf24" }}>SAAS</span>
          </div>
          <div style={{ fontSize: 11, color: "#475569", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 2 }}>10-Year Financial Projection Model</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["conservative", "base", "optimistic"].map(s => (
            <button key={s} onClick={() => applyScenario(s)}
              style={{ padding: "6px 14px", borderRadius: 6, fontSize: 11, fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.1em", cursor: "pointer", border: "1px solid", transition: "all 0.15s",
                background: scenario === s ? "#fbbf24" : "transparent",
                borderColor: scenario === s ? "#fbbf24" : "#334155",
                color: scenario === s ? "#0a0c10" : "#64748b",
                fontWeight: scenario === s ? 700 : 400
              }}>
              {s}
            </button>
          ))}
          {scenario === "custom" && (
            <div style={{ padding: "6px 14px", borderRadius: 6, fontSize: 11, background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", letterSpacing: "0.1em", textTransform: "uppercase" }}>Custom</div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", minHeight: "calc(100vh - 73px)" }}>
        {/* Sidebar */}
        <div style={{ borderRight: "1px solid #1e293b", padding: "24px 20px", overflowY: "auto" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#475569", marginBottom: 20 }}>Adjust Assumptions</div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, color: "#fbbf24", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12, paddingBottom: 6, borderBottom: "1px solid #1e293b" }}>Growth</div>
            <SliderInput label="New Customers Year 1" value={params.newCustomersY1} min={10} max={200} step={5} onChange={v => setParam("newCustomersY1", v)} />
            <SliderInput label="Annual New Customer Growth" value={params.growthRate} min={20} max={150} step={5} onChange={v => setParam("growthRate", v)} format={v => `${v}%`} />
            <SliderInput label="Annual Churn Rate" value={params.churnRate} min={2} max={20} step={0.5} onChange={v => setParam("churnRate", v)} format={v => `${v}%`} />
            <SliderInput label="Avg Monthly Revenue / Customer" value={params.avgMRR} min={99} max={500} step={10} onChange={v => setParam("avgMRR", v)} format={v => `$${v}`} />
          </div>

          <div>
            <div style={{ fontSize: 10, color: "#fbbf24", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12, paddingBottom: 6, borderBottom: "1px solid #1e293b" }}>Cost Structure</div>
            <SliderInput label="COGS % of Revenue" value={params.cogsPercent} min={5} max={35} step={1} onChange={v => setParam("cogsPercent", v)} format={v => `${v}%`} />
            <SliderInput label="Sales & Marketing %" value={params.smPercent} min={10} max={50} step={1} onChange={v => setParam("smPercent", v)} format={v => `${v}%`} />
            <SliderInput label="R&D %" value={params.rdPercent} min={5} max={30} step={1} onChange={v => setParam("rdPercent", v)} format={v => `${v}%`} />
            <SliderInput label="G&A %" value={params.gaPercent} min={3} max={20} step={1} onChange={v => setParam("gaPercent", v)} format={v => `${v}%`} />
          </div>

          {/* LTV / CAC box */}
          <div style={{ marginTop: 24, background: "#111827", border: "1px solid #1e293b", borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Unit Economics</div>
            {[
              ["LTV", fmt(params.avgMRR * 12 / (params.churnRate / 100))],
              ["Est. CAC", fmt(params.avgMRR * 3)],
              ["LTV:CAC", `${(params.avgMRR * 12 / (params.churnRate / 100) / (params.avgMRR * 3)).toFixed(1)}x`],
              ["Payback", `${(3).toFixed(0)} mo`],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "#64748b" }}>{k}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main */}
        <div style={{ padding: "24px 28px", overflowY: "auto" }}>
          {/* KPI Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
            <MetricCard label="Year 10 ARR" value={fmt(y10.arr)} sub={`${fmtNum(y10.customers)} customers`} highlight />
            <MetricCard label="Year 5 ARR" value={fmt(y5.arr)} sub={`${fmtNum(y5.customers)} customers`} />
            <MetricCard label="Y10 EBITDA Margin" value={`${y10.ebitdaMargin.toFixed(0)}%`} sub={fmt(y10.ebitda)} highlight={y10.ebitdaMargin > 0} />
            <MetricCard label="First Profitable Year" value={firstProfitYear ? firstProfitYear.year : "—"} sub="EBITDA breakeven" />
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 24, borderBottom: "1px solid #1e293b", marginBottom: 24 }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={activeTab === t ? "tab-active" : "tab-inactive"}
                style={{ background: "none", border: "none", padding: "8px 0", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", transition: "color 0.15s" }}>
                {t}
              </button>
            ))}
          </div>

          {/* Tab: Revenue */}
          {activeTab === "Revenue" && (
            <div>
              <div style={{ marginBottom: 8, fontSize: 11, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase" }}>Annual Recurring Revenue (ARR) — 10 Year Trajectory</div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="arrGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="year" stroke="#334155" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tickFormatter={fmt} stroke="#334155" tick={{ fontSize: 11, fill: "#64748b" }} width={70} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="arr" name="ARR" stroke="#fbbf24" strokeWidth={2} fill="url(#arrGrad)" />
                  <Area type="monotone" dataKey="grossProfit" name="Gross Profit" stroke="#34d399" strokeWidth={2} fill="none" strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>

              {/* Table */}
              <div style={{ marginTop: 20, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1e293b" }}>
                      {["Year", "Customers", "ARR", "Gross Profit", "Gross Margin", "EBITDA", "EBITDA Margin"].map(h => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: h === "Year" || h === "Customers" ? "left" : "right", fontSize: 10, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((d, i) => (
                      <tr key={d.year} style={{ borderBottom: "1px solid #0f172a", background: i % 2 === 0 ? "transparent" : "#0d1117" }}>
                        <td style={{ padding: "8px 12px", color: "#fbbf24", fontWeight: 700 }}>{d.year}</td>
                        <td style={{ padding: "8px 12px", color: "#e2e8f0" }}>{fmtNum(d.customers)}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", color: "#e2e8f0" }}>{fmt(d.arr)}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", color: "#34d399" }}>{fmt(d.grossProfit)}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", color: "#34d399" }}>{d.grossMargin.toFixed(0)}%</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", color: d.ebitda >= 0 ? "#34d399" : "#f87171" }}>{fmt(d.ebitda)}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", color: d.ebitdaMargin >= 0 ? "#34d399" : "#f87171" }}>{d.ebitdaMargin.toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab: Customers */}
          {activeTab === "Customers" && (
            <div>
              <div style={{ marginBottom: 8, fontSize: 11, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase" }}>Customer Growth — New vs Churned</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="year" stroke="#334155" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis stroke="#334155" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
                  <Bar dataKey="newCustomers" name="New Customers" fill="#fbbf24" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="churned" name="Churned" fill="#f87171" radius={[3, 3, 0, 0]} />
                  <Line type="monotone" dataKey="customers" name="Total Customers" stroke="#34d399" strokeWidth={2} dot={false} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {[
                  { label: "Total Customers Y5", value: fmtNum(y5.customers), sub: `${fmtNum(y5.newCustomers)} acquired that year` },
                  { label: "Total Customers Y10", value: fmtNum(y10.customers), sub: `${fmtNum(y10.churned)} churn that year` },
                  { label: "Net New Y10", value: `+${fmtNum(y10.newCustomers - y10.churned)}`, sub: "New minus churned" },
                ].map(c => <MetricCard key={c.label} {...c} />)}
              </div>
            </div>
          )}

          {/* Tab: Profitability */}
          {activeTab === "Profitability" && (
            <div>
              <div style={{ marginBottom: 8, fontSize: 11, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase" }}>EBITDA Margin Progression</div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="year" stroke="#334155" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tickFormatter={v => `${v.toFixed(0)}%`} stroke="#334155" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="ebitdaMargin" name="EBITDA Margin" stroke="#34d399" strokeWidth={2} fill="url(#profGrad)" />
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {[
                  { label: "Gross Margin Y10", value: `${y10.grossMargin.toFixed(0)}%`, sub: `${fmt(y10.grossProfit)} gross profit` },
                  { label: "S&M Spend Y10", value: fmt(y10.sm), sub: `${params.smPercent}% of ARR` },
                  { label: "R&D Spend Y10", value: fmt(y10.rd), sub: `${params.rdPercent}% of ARR` },
                  { label: "EBITDA Y10", value: fmt(y10.ebitda), sub: `${y10.ebitdaMargin.toFixed(0)}% margin`, highlight: y10.ebitda > 0 },
                ].map(c => <MetricCard key={c.label} {...c} />)}
              </div>
            </div>
          )}

          {/* Tab: Assumptions */}
          {activeTab === "Assumptions" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {[
                { title: "Pricing Logic", items: ["Solo plan: $99/mo (1 aircraft)", "Ramp plan: $249/mo (2–5 aircraft)", "Fleet plan: $499/mo (6–15 aircraft)", `Blended avg used in model: $${params.avgMRR}/mo`] },
                { title: "Churn Assumptions", items: ["Aviation compliance = high switching cost", "Industry benchmark: 5–8% annual B2B SaaS", `Model uses: ${params.churnRate}% annual churn`, "Lower churn once logbook data is locked in"] },
                { title: "Growth Drivers", items: ["Word of mouth in tight pilot communities", "Type club & FBO partnership channel", "SEO targeting AD/SB compliance searches", `Model: ${params.growthRate}% YoY new customer growth`] },
                { title: "Cost Benchmarks", items: [`COGS ${params.cogsPercent}%: hosting, support, AD/SB data`, `S&M ${params.smPercent}%: content, conferences, ads`, `R&D ${params.rdPercent}%: product dev, FAA API integrations`, `G&A ${params.gaPercent}%: legal, finance, admin`] },
                { title: "What This Model Excludes", items: ["International expansion (Canada, EASA)", "Enterprise/Part 121 upmarket move", "M&A, fundraising, or exit multiple", "Revenue expansion from upsells"] },
                { title: "Exit Potential", items: [`Revenue multiples: 4–8x ARR for vertical SaaS`, `Y10 Base ARR: ${fmt(y10.arr)}`, `Est. exit range: ${fmt(y10.arr * 4)} – ${fmt(y10.arr * 8)}`, "Strategic buyers: CAMP, Veryon, Garmin, Boeing"] },
              ].map(({ title, items }) => (
                <div key={title} style={{ background: "#0d1117", border: "1px solid #1e293b", borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 11, color: "#fbbf24", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>{title}</div>
                  {items.map(item => (
                    <div key={item} style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6, paddingLeft: 10, borderLeft: "2px solid #1e293b" }}>{item}</div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
