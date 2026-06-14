"use client";

import React, { useState } from "react";
import { Calculator, Ruler, FileText, BarChart3 } from "lucide-react";

type Tool = "emi" | "area" | "stamp";

export default function ToolsPage() {
  const [active, setActive] = useState<Tool>("emi");

  return (
    <div className="max-w-5xl mx-auto container-fluid py-10 sm:py-16 rise">
      <p className="text-mute uppercase tracking-[0.3em] text-[10px] mb-3">Tools</p>
      <h1 className="font-display text-3xl sm:text-5xl tracking-tightest mb-3 font-semibold">
        Real estate calculators
      </h1>
      <p className="text-mute text-sm mb-8">Free tools to help you make informed property decisions in Nepal.</p>

      {/* Tool selector */}
      <div className="flex gap-2 flex-wrap mb-8">
        {([
          { id: "emi" as Tool, icon: <Calculator size={14} />, label: "EMI Calculator" },
          { id: "area" as Tool, icon: <Ruler size={14} />, label: "Land Area Converter" },
          { id: "stamp" as Tool, icon: <FileText size={14} />, label: "Stamp Duty Calculator" },
        ]).map(t => (
          <button key={t.id} onClick={() => setActive(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              active === t.id ? "bg-emerald-500 text-white" : "surface hover:bg-[var(--brand-soft)]/30"
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {active === "emi" && <EmiTool />}
      {active === "area" && <AreaTool />}
      {active === "stamp" && <StampTool />}
    </div>
  );
}

// ═══ Tool 1: Detailed EMI Calculator ═══════════════════════════════════════════
function EmiTool() {
  const [priceLakh, setPriceLakh] = useState(50);
  const [downPercent, setDownPercent] = useState(20);
  const [rate, setRate] = useState(9.5);
  const [years, setYears] = useState(20);

  const priceRs = priceLakh * 100000;
  const downPayment = priceRs * (downPercent / 100);
  const principal = priceRs - downPayment;
  const r = rate / 100 / 12;
  const n = years * 12;
  const emi = r === 0 ? principal / n : principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  const totalPayable = emi * n;
  const totalInterest = totalPayable - principal;

  const fmt = (v: number) => `Rs. ${Math.round(v).toLocaleString("en-IN")}`;

  // Yearly breakdown
  const yearlyData: { year: number; principal: number; interest: number; balance: number }[] = [];
  let balance = principal;
  for (let y = 1; y <= years; y++) {
    let yP = 0, yI = 0;
    for (let m = 0; m < 12; m++) {
      const iP = balance * r;
      const pP = emi - iP;
      yI += iP; yP += pP;
      balance = Math.max(0, balance - pP);
    }
    yearlyData.push({ year: y, principal: yP, interest: yI, balance });
  }
  const maxBar = Math.max(...yearlyData.map(d => d.principal + d.interest));

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Controls */}
      <div className="surface rounded-2xl p-6 space-y-5">
        <h2 className="font-display text-xl font-semibold flex items-center gap-2">
          <Calculator size={20} className="text-emerald-500" /> EMI Calculator
        </h2>

        <Slider label="Property price" value={priceLakh} setValue={setPriceLakh}
          min={5} max={500} step={1} display={`${priceLakh} Lakh (${fmt(priceRs)})`} />
        <Slider label="Down payment" value={downPercent} setValue={setDownPercent}
          min={0} max={80} step={5} display={`${downPercent}% (${fmt(downPayment)})`} />
        <Slider label="Interest rate" value={rate} setValue={setRate}
          min={4} max={20} step={0.1} display={`${rate.toFixed(1)}% p.a.`} />
        <Slider label="Loan tenure" value={years} setValue={setYears}
          min={1} max={30} step={1} display={`${years} year${years > 1 ? "s" : ""}`} />

        {/* Results */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <ResultCard label="Monthly EMI" value={fmt(emi)} highlight />
          <ResultCard label="Loan amount" value={fmt(principal)} />
          <ResultCard label="Total interest" value={fmt(totalInterest)} />
          <ResultCard label="Total payable" value={fmt(totalPayable)} />
          <ResultCard label="Down payment" value={fmt(downPayment)} />
          <ResultCard label="Interest-to-principal ratio" value={`${((totalInterest / principal) * 100).toFixed(1)}%`} />
        </div>
      </div>

      {/* Chart */}
      <div className="surface rounded-2xl p-6 space-y-4">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2">
          <BarChart3 size={18} className="text-emerald-500" /> Payment timeline
        </h3>

        {/* Donut summary */}
        <div className="flex items-center justify-center gap-6 py-4">
          <svg viewBox="0 0 120 120" className="w-28 h-28">
            <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" className="text-[var(--line)]" strokeWidth="12" />
            <circle cx="60" cy="60" r="50" fill="none" stroke="#10b981" strokeWidth="12"
              strokeDasharray={`${(principal / totalPayable) * 314} 314`}
              strokeDashoffset="0" transform="rotate(-90 60 60)" strokeLinecap="round" />
          </svg>
          <div className="text-xs space-y-1.5">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-emerald-500" /> Principal ({((principal / totalPayable) * 100).toFixed(0)}%)</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[var(--line)]" /> Interest ({((totalInterest / totalPayable) * 100).toFixed(0)}%)</div>
          </div>
        </div>

        {/* Bar chart */}
        <div className="flex items-end gap-px h-36">
          {yearlyData.map((d, i) => {
            const pH = (d.principal / maxBar) * 100;
            const iH = (d.interest / maxBar) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col justify-end cursor-pointer group relative"
                title={`Year ${d.year}: Principal ${fmt(d.principal)} | Interest ${fmt(d.interest)} | Balance ${fmt(d.balance)}`}>
                <div className="bg-emerald-400 rounded-t-sm transition-colors group-hover:bg-emerald-300" style={{ height: `${pH}%` }} />
                <div className="bg-amber-400 transition-colors group-hover:bg-amber-300" style={{ height: `${iH}%` }} />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[9px] text-mute"><span>Year 1</span><span>Year {years}</span></div>
        <div className="flex gap-4 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" /> Principal</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400" /> Interest</span>
        </div>

        {/* Yearly table */}
        <details className="text-xs">
          <summary className="cursor-pointer text-mute hover:text-emerald-600 font-medium py-2">View yearly breakdown</summary>
          <div className="max-h-48 overflow-y-auto mt-2">
            <table className="w-full text-left">
              <thead className="text-mute uppercase tracking-widest text-[9px] sticky top-0 bg-[var(--bg-elev)]">
                <tr><th className="py-1 pr-2">Yr</th><th>Principal</th><th>Interest</th><th>Balance</th></tr>
              </thead>
              <tbody>
                {yearlyData.map(d => (
                  <tr key={d.year} className="border-t border-[var(--line)]">
                    <td className="py-1 pr-2 font-mono">{d.year}</td>
                    <td>{fmt(d.principal)}</td>
                    <td>{fmt(d.interest)}</td>
                    <td className="text-mute">{fmt(d.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </div>
  );
}

// ═══ Tool 2: Land Area Converter ═══════════════════════════════════════════════
function AreaTool() {
  const [value, setValue] = useState(1);
  const [unit, setUnit] = useState("ropani");

  const units: Record<string, { label: string; sqm: number; system: string }> = {
    ropani:  { label: "Ropani",     sqm: 508.72,   system: "Hill (Kathmandu Valley)" },
    aana:    { label: "Aana",       sqm: 31.80,    system: "Hill (Kathmandu Valley)" },
    paisa:   { label: "Paisa",      sqm: 7.95,     system: "Hill (Kathmandu Valley)" },
    dam:     { label: "Dam",        sqm: 1.99,     system: "Hill (Kathmandu Valley)" },
    bigha:   { label: "Bigha",      sqm: 6772.63,  system: "Terai" },
    katha:   { label: "Katha",      sqm: 338.63,   system: "Terai" },
    dhur:    { label: "Dhur",       sqm: 16.93,    system: "Terai" },
    sqft:    { label: "Square feet", sqm: 0.0929,   system: "International" },
    sqm:     { label: "Square meter",sqm: 1.0,      system: "International" },
    acre:    { label: "Acre",       sqm: 4046.86,  system: "International" },
    hectare: { label: "Hectare",    sqm: 10000.0,  system: "International" },
  };

  const sqm = value * units[unit].sqm;

  return (
    <div className="surface rounded-2xl p-6 space-y-6">
      <h2 className="font-display text-xl font-semibold flex items-center gap-2">
        <Ruler size={20} className="text-emerald-500" /> Land Area Converter
      </h2>
      <p className="text-mute text-sm">Convert between Nepal's traditional land measurement units and international standards.</p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] uppercase tracking-widest text-mute font-bold block mb-1">VALUE</label>
          <input type="number" value={value} onChange={e => setValue(parseFloat(e.target.value) || 0)}
            className="field text-lg" min={0} step="0.01" />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-widest text-mute font-bold block mb-1">UNIT</label>
          <select value={unit} onChange={e => setUnit(e.target.value)} className="field text-lg">
            <optgroup label="Hill (Kathmandu Valley)">
              <option value="ropani">Ropani</option>
              <option value="aana">Aana</option>
              <option value="paisa">Paisa</option>
              <option value="dam">Dam</option>
            </optgroup>
            <optgroup label="Terai">
              <option value="bigha">Bigha</option>
              <option value="katha">Katha</option>
              <option value="dhur">Dhur</option>
            </optgroup>
            <optgroup label="International">
              <option value="sqft">Square feet</option>
              <option value="sqm">Square meter</option>
              <option value="acre">Acre</option>
              <option value="hectare">Hectare</option>
            </optgroup>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Object.entries(units).filter(([k]) => k !== unit).map(([k, u]) => {
          const converted = sqm / u.sqm;
          return (
            <div key={k} className="surface rounded-xl p-3">
              <div className="text-[10px] uppercase tracking-widest text-mute">{u.label}</div>
              <div className="font-display text-lg font-semibold">{converted < 0.01 ? converted.toExponential(2) : converted.toFixed(converted < 10 ? 4 : 2)}</div>
              <div className="text-[9px] text-mute">{u.system}</div>
            </div>
          );
        })}
      </div>

      <div className="bg-[var(--brand-soft)] rounded-xl p-4 text-xs text-mute">
        <strong className="text-[var(--fg)]">Note:</strong> Nepal uses two land measurement systems.
        The Hill system (Ropani-Aana-Paisa-Dam) is used in Kathmandu Valley and hill districts.
        The Terai system (Bigha-Katha-Dhur) is used in southern plains districts.
        1 Ropani = 16 Aana = 64 Paisa = 256 Dam. 1 Bigha = 20 Katha = 400 Dhur.
      </div>
    </div>
  );
}

// ═══ Tool 3: Stamp Duty & Registration Fee Calculator ═══════════════════════
function StampTool() {
  const [propertyValue, setPropertyValue] = useState(50);
  const [location, setLocation] = useState<"metro" | "submetro" | "rural">("metro");
  const [isFirstHome, setIsFirstHome] = useState(true);

  const valueRs = propertyValue * 100000;

  // Nepal registration rates (approximate as per Land Revenue Office)
  const registrationRate = location === "metro" ? 0.04 : location === "submetro" ? 0.03 : 0.02;
  const registrationFee = valueRs * registrationRate;

  // Capital gains tax (if selling within 5 years: 5%, after 5 years: 2.5%)
  const capitalGains5yr = valueRs * 0.05;
  const capitalGainsAfter = valueRs * 0.025;

  // Stamp duty
  const stampDuty = location === "metro" ? 1000 : 500;

  // Total approximate cost
  const totalCost = registrationFee + stampDuty;

  const fmt = (v: number) => `Rs. ${Math.round(v).toLocaleString("en-IN")}`;

  return (
    <div className="surface rounded-2xl p-6 space-y-6">
      <h2 className="font-display text-xl font-semibold flex items-center gap-2">
        <FileText size={20} className="text-emerald-500" /> Stamp Duty & Registration Calculator
      </h2>
      <p className="text-mute text-sm">Estimate the government fees for property registration in Nepal.</p>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="text-[11px] uppercase tracking-widest text-mute font-bold block mb-1">PROPERTY VALUE (LAKH)</label>
          <input type="number" value={propertyValue} onChange={e => setPropertyValue(parseFloat(e.target.value) || 0)}
            className="field text-lg" min={1} />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-widest text-mute font-bold block mb-1">LOCATION TYPE</label>
          <select value={location} onChange={e => setLocation(e.target.value as any)} className="field">
            <option value="metro">Metropolitan city</option>
            <option value="submetro">Sub-metropolitan</option>
            <option value="rural">Rural municipality</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-widest text-mute font-bold block mb-1">FIRST HOME?</label>
          <select value={isFirstHome ? "yes" : "no"} onChange={e => setIsFirstHome(e.target.value === "yes")} className="field">
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <ResultCard label="Property value" value={fmt(valueRs)} />
        <ResultCard label={`Registration fee (${(registrationRate * 100).toFixed(0)}%)`} value={fmt(registrationFee)} highlight />
        <ResultCard label="Stamp duty" value={fmt(stampDuty)} />
        <ResultCard label="Total registration cost" value={fmt(totalCost)} highlight />
        <ResultCard label="Capital gains tax (if sold < 5 yrs)" value={fmt(capitalGains5yr)} />
        <ResultCard label="Capital gains tax (if sold ≥ 5 yrs)" value={fmt(capitalGainsAfter)} />
      </div>

      <div className="bg-[var(--brand-soft)] rounded-xl p-4 text-xs text-mute space-y-2">
        <p><strong className="text-[var(--fg)]">Registration rates (approximate):</strong> Metropolitan — 4%, Sub-metropolitan — 3%, Rural — 2% of the government-assessed property value.</p>
        <p><strong className="text-[var(--fg)]">Capital gains tax:</strong> 5% if property is sold within 5 years of purchase, 2.5% if sold after 5 years. First home purchases may qualify for reduced rates.</p>
        <p><strong className="text-[var(--fg)]">Disclaimer:</strong> These are estimates based on general Nepal government rates. Actual fees may vary by district and current fiscal year policy. Verify at your local Malpot (Land Revenue) office.</p>
      </div>
    </div>
  );
}

// ═══ Shared components ═══════════════════════════════════════════════════════
function Slider({ label, value, setValue, min, max, step, display }: {
  label: string; value: number; setValue: (v: number) => void;
  min: number; max: number; step: number; display: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-[11px] uppercase tracking-widest text-mute font-bold mb-1.5">
        <span>{label}</span><span className="font-mono normal-case">{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step}
        value={value} onChange={e => setValue(parseFloat(e.target.value))}
        className="w-full accent-emerald-500" />
    </div>
  );
}

function ResultCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${highlight ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800" : "surface"}`}>
      <div className="text-[10px] uppercase tracking-widest text-mute mb-1">{label}</div>
      <div className={`font-display text-lg font-semibold ${highlight ? "text-emerald-700 dark:text-emerald-400" : ""}`}>{value}</div>
    </div>
  );
}
