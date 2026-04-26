"use client"

import type React from "react"
import { useState, useMemo, useRef } from "react"
import { createPortal } from "react-dom"
import { TrendingUp, Users, Eye, MousePointerClick, Activity, Zap, Globe, Target, ChevronDown, ChevronUp } from "lucide-react"
import { ResponsiveLine } from "@nivo/line"
import Loading from "../../components/Loading/Loading"
import { useGA4, useGA4Eventos, useGA4Mapa, useGA4Leads, parseBrazilianNumber } from "../../services/consolidadoApi"
import BrazilMap from "../../components/BrazilMap/BrazilMap"

// ─── Helpers ─────────────────────────────────────────────────────────────────

const parseNum = (val: string): number => {
  if (!val || val === "-") return 0
  if (val.endsWith("%")) return parseFloat(val.replace("%", "").replace(",", ".")) || 0
  if (val.includes(":")) return 0
  return parseBrazilianNumber(val)
}

const fmt = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".", ",")} mi`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)} mil`
  return v.toLocaleString("pt-BR")
}
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`

// State name mapping from GA4 to GeoJSON-compatible Portuguese names
const GA4_TO_PT: { [key: string]: string } = {
  "State of São Paulo": "São Paulo",
  "State of Sao Paulo": "São Paulo",
  "State of Rio de Janeiro": "Rio de Janeiro",
  "State of Minas Gerais": "Minas Gerais",
  "State of Bahia": "Bahia",
  "State of Rio Grande do Sul": "Rio Grande do Sul",
  "State of Parana": "Paraná",
  "State of Paraná": "Paraná",
  "State of Santa Catarina": "Santa Catarina",
  "State of Goias": "Goiás",
  "State of Goiás": "Goiás",
  "State of Pernambuco": "Pernambuco",
  "State of Ceara": "Ceará",
  "State of Ceará": "Ceará",
  "State of Amazonas": "Amazonas",
  "State of Para": "Pará",
  "State of Pará": "Pará",
  "State of Espirito Santo": "Espírito Santo",
  "State of Espírito Santo": "Espírito Santo",
  "State of Mato Grosso": "Mato Grosso",
  "State of Mato Grosso do Sul": "Mato Grosso do Sul",
  "State of Maranhao": "Maranhão",
  "State of Maranhão": "Maranhão",
  "State of Rio Grande do Norte": "Rio Grande do Norte",
  "State of Paraiba": "Paraíba",
  "State of Paraíba": "Paraíba",
  "State of Piaui": "Piauí",
  "State of Piauí": "Piauí",
  "State of Alagoas": "Alagoas",
  "State of Sergipe": "Sergipe",
  "State of Rondonia": "Rondônia",
  "State of Rondônia": "Rondônia",
  "State of Tocantins": "Tocantins",
  "State of Acre": "Acre",
  "State of Amapa": "Amapá",
  "State of Amapá": "Amapá",
  "State of Roraima": "Roraima",
  "Federal District": "Distrito Federal",
  "Ceara": "Ceará",
}

const normalizeName = (name: string): string => GA4_TO_PT[name] || name

// ─── Component ────────────────────────────────────────────────────────────────

const TrafegoEngajamento: React.FC = () => {
  const { data: ga4Data, loading: l1, error: e1, refetch: r1 } = useGA4()
  const { data: eventosData, loading: l2, error: e2, refetch: r2 } = useGA4Eventos()
  const { data: mapaData, loading: l3, error: e3, refetch: r3 } = useGA4Mapa()
  const { data: leadsData, loading: l4, refetch: r4 } = useGA4Leads()

  const [activeTab, setActiveTab] = useState<"overview" | "eventos">("overview")
  const [selectedMetric, setSelectedMetric] = useState<"sessions" | "leads">("sessions")
  const [tableOpen, setTableOpen] = useState(false)
  const [regionTableOpen, setRegionTableOpen] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [filterStart, setFilterStart] = useState("")
  const [filterEnd, setFilterEnd] = useState("")
  const pillRef = useRef<HTMLButtonElement>(null)

  // Formata data ISO yyyy-mm-dd ou dd/mm/yyyy → dd/mm
  const fmtDateShort = (d: string) => {
    if (!d) return ""
    if (d.includes("-")) { const [y, m, day] = d.split("-"); return `${day}/${m}` }
    const [day, m] = d.split("/"); return `${day}/${m}`
  }
  const fmtDateFull = (d: string) => {
    if (!d) return ""
    if (d.includes("-")) { const [y, m, day] = d.split("-"); return `${day}/${m}/${y}` }
    return d
  }

  const refetch = () => { r1(); r2(); r3(); r4() }

  // ─── Helpers de data ──────────────────────────────────────────────────────
  const parseISODate = (s: string): Date | null => {
    // Aceita yyyy-mm-dd e dd/mm/yyyy
    if (!s) return null
    if (s.includes("-")) { const d = new Date(s + "T00:00:00"); return isNaN(d.getTime()) ? null : d }
    const [d, m, y] = s.split("/"); const dt = new Date(+y, +m - 1, +d); return isNaN(dt.getTime()) ? null : dt
  }
  const toISO = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${y}-${m}-${day}`
  }
  const formatDateBR = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`

  // ─── Parse GA4 overview ────────────────────────────────────────────────────
  const ga4Rows = useMemo(() => {
    if (!ga4Data?.success || !ga4Data.data?.values || ga4Data.data.values.length < 2) return []
    const headers = ga4Data.data.values[0]
    const idx = (n: string) => headers.indexOf(n)
    return ga4Data.data.values.slice(1).map((row) => ({
      date: row[idx("Date")] || "",
      newUsers: parseNum(row[idx("New users")] || "0"),
      sessions: parseNum(row[idx("Sessions")] || "0"),
      views: parseNum(row[idx("Views")] || "0"),
      engagedSessions: parseNum(row[idx("Engaged sessions")] || "0"),
      eventCount: parseNum(row[idx("Event count")] || "0"),
      bounceRate: parseNum(row[idx("Bounce rate")] || "0"),
    }))
  }, [ga4Data])

  // ─── Range real de datas + datas ativas ──────────────────────────────────
  const dataDateRange = useMemo((): { min: Date; max: Date } | null => {
    let min: Date | null = null
    let max: Date | null = null
    ga4Rows.forEach((r) => {
      const d = parseISODate(r.date)
      if (!d) return
      if (!min || d < min) min = d
      if (!max || d > max) max = d
    })
    if (!min || !max) return null
    return { min, max }
  }, [ga4Rows])

  const activeStart = filterStart || (dataDateRange ? toISO(dataDateRange.min) : "")
  const activeEnd   = filterEnd   || (dataDateRange ? toISO(dataDateRange.max) : "")
  const activeStartDate = activeStart ? new Date(activeStart + "T00:00:00") : null
  const activeEndDate   = activeEnd   ? new Date(activeEnd   + "T00:00:00") : null
  const isFiltered =
    dataDateRange && activeStartDate && activeEndDate &&
    (activeStartDate.getTime() !== dataDateRange.min.getTime() ||
     activeEndDate.getTime()   !== dataDateRange.max.getTime())

  // ─── Parse Eventos ─────────────────────────────────────────────────────────
  const eventAgg = useMemo(() => {
    if (!eventosData?.success || !eventosData.data?.values || eventosData.data.values.length < 2) return []
    const headers = eventosData.data.values[0]
    const idx = (n: string) => headers.indexOf(n)
    const map = new Map<string, { eventCount: number; conversions: number }>()
    eventosData.data.values.slice(1).forEach((row) => {
      const name = row[idx("Event name")]
      if (!name) return
      const existing = map.get(name) || { eventCount: 0, conversions: 0 }
      existing.eventCount += parseNum(row[idx("Event count")] || "0")
      existing.conversions += parseNum(row[idx("Conversions")] || "0")
      map.set(name, existing)
    })
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.eventCount - a.eventCount)
  }, [eventosData])

  // ─── Parse Mapa ────────────────────────────────────────────────────────────
  const regionAgg = useMemo(() => {
    if (!mapaData?.success || !mapaData.data?.values || mapaData.data.values.length < 2) return []
    const headers = mapaData.data.values[0]
    const idx = (n: string) => headers.indexOf(n)
    const map = new Map<string, { sessions: number; eventCount: number; conversions: number }>()
    mapaData.data.values.slice(1).forEach((row) => {
      const rawRegion = row[idx("Region")] || row[idx("Country")] || ""
      if (!rawRegion) return
      const region = normalizeName(rawRegion)
      const existing = map.get(region) || { sessions: 0, eventCount: 0, conversions: 0 }
      existing.sessions += parseNum(row[idx("Sessions")] || "0")
      existing.eventCount += parseNum(row[idx("Event count")] || "0")
      existing.conversions += parseNum(row[idx("Conversions")] || "0")
      map.set(region, existing)
    })
    return Array.from(map.entries())
      .map(([region, v]) => ({ region, ...v }))
      .sort((a, b) => b.sessions - a.sessions)
  }, [mapaData])

  // ─── Map data for BrazilMap ───────────────────────────────────────────────
  const regionDataForMap = useMemo(() => {
    const obj: { [key: string]: number } = {}
    regionAgg.forEach((r) => { obj[r.region] = r.sessions })
    return obj
  }, [regionAgg])

  // ─── Parse GA4 Leads ──────────────────────────────────────────────────────
  const leadsRows = useMemo(() => {
    if (!leadsData?.success || !leadsData.data?.values || leadsData.data.values.length < 2) return []
    const headers = leadsData.data.values[0]
    const idx = (n: string) => headers.indexOf(n)
    return leadsData.data.values.slice(1).map((row) => ({
      date: row[idx("Date")] || "",
      eventCount: parseInt(row[idx("Event count")] || "0", 10) || 0,
      source: row[idx("Session source")] || "(not set)",
      medium: row[idx("Session medium")] || "(not set)",
      platform: row[idx("Session source platform")] || "(not set)",
      campaign: row[idx("Session campaign")] || "(not set)",
    }))
  }, [leadsData])

  // Leads filtrados por data
  const leadsRowsFiltered = useMemo(() => {
    if (!activeStartDate || !activeEndDate) return leadsRows
    return leadsRows.filter((r) => {
      const d = parseISODate(r.date)
      return d && d >= activeStartDate && d <= activeEndDate
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadsRows, activeStart, activeEnd])

  const normalizeSource = (src: string): string => {
    const s = src.toLowerCase()
    if (["ig", "l.instagram.com", "instagram.com"].includes(s)) return "instagram"
    if (["fb", "l.facebook.com", "m.facebook.com", "facebook.com"].includes(s)) return "facebook"
    if (s === "linkedin-traf") return "linkedin"
    if (s === "kwai.com") return "kwai"
    if (s === "ads.tiktok.com") return "tiktok"
    if (["tagassistant.google.com", "gtm_teste"].includes(s)) return "testes"
    return src
  }

  // Aggregate by source
  const leadsBySource = useMemo(() => {
    const map = new Map<string, number>()
    leadsRowsFiltered.forEach((r) => {
      const key = normalizeSource(r.source)
      map.set(key, (map.get(key) || 0) + r.eventCount)
    })
    return Array.from(map.entries())
      .map(([source, leads]) => ({ source, leads }))
      .sort((a, b) => b.leads - a.leads)
  }, [leadsRowsFiltered])

  // Aggregate by campaign
  const leadsByCampaign = useMemo(() => {
    const map = new Map<string, { leads: number; source: string; medium: string }>()
    leadsRowsFiltered.forEach((r) => {
      const key = r.campaign
      const ex = map.get(key) || { leads: 0, source: r.source, medium: r.medium }
      ex.leads += r.eventCount
      map.set(key, ex)
    })
    return Array.from(map.entries())
      .map(([campaign, v]) => ({ campaign, ...v }))
      .sort((a, b) => b.leads - a.leads)
  }, [leadsRows])

  // Aggregate by day for line chart
  const leadsByDay = useMemo(() => {
    const map = new Map<string, number>()
    leadsRowsFiltered.forEach((r) => {
      if (!r.date) return
      map.set(r.date, (map.get(r.date) || 0) + r.eventCount)
    })
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, leads]) => ({ date, leads }))
  }, [leadsRowsFiltered])

  const totalLeads = leadsRowsFiltered.reduce((s, r) => s + r.eventCount, 0)

  const maxSessions = regionAgg[0]?.sessions || 1
  const getIntensityColor = (sessions: number): string => {
    if (sessions === 0) return "#e2e8f0"
    const intensity = Math.min(sessions / maxSessions, 1)
    // Blue gradient: light → dark
    const r = Math.round(219 - intensity * 170)
    const g = Math.round(234 - intensity * 140)
    const b = Math.round(254 - intensity * 50)
    return `rgb(${r},${g},${b})`
  }

  // ─── GA4 rows filtrados por data ──────────────────────────────────────────
  const ga4RowsFiltered = useMemo(() => {
    if (!activeStartDate || !activeEndDate) return ga4Rows
    return ga4Rows.filter((r) => {
      const d = parseISODate(r.date)
      return d && d >= activeStartDate && d <= activeEndDate
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ga4Rows, activeStart, activeEnd])

  // ─── Totals ────────────────────────────────────────────────────────────────
  const totals = useMemo(() => ({
    newUsers: ga4RowsFiltered.reduce((s, r) => s + r.newUsers, 0),
    sessions: ga4RowsFiltered.reduce((s, r) => s + r.sessions, 0),
    views: ga4RowsFiltered.reduce((s, r) => s + r.views, 0),
    engagedSessions: ga4RowsFiltered.reduce((s, r) => s + r.engagedSessions, 0),
    eventCount: ga4RowsFiltered.reduce((s, r) => s + r.eventCount, 0),
    avgBounceRate: ga4RowsFiltered.length > 0
      ? ga4RowsFiltered.reduce((s, r) => s + r.bounceRate, 0) / ga4RowsFiltered.length
      : 0,
  }), [ga4RowsFiltered])

  // ─── Daily sorted ─────────────────────────────────────────────────────────
  const dailySorted = useMemo(() => {
    const map = new Map<string, typeof ga4RowsFiltered[0]>()
    ga4RowsFiltered.forEach((r) => {
      if (!r.date) return
      const ex = map.get(r.date)
      if (!ex) { map.set(r.date, { ...r }) } else {
        ex.sessions += r.sessions; ex.newUsers += r.newUsers
        ex.views += r.views; ex.engagedSessions += r.engagedSessions
        ex.eventCount += r.eventCount
      }
    })
    return Array.from(map.values()).sort((a, b) => {
      const parseD = (s: string) => { const p = s.split("/"); return p.length === 3 ? new Date(+p[2], +p[1] - 1, +p[0]).getTime() : new Date(s).getTime() }
      return parseD(b.date) - parseD(a.date)
    })
  }, [ga4RowsFiltered])

  // ─── Line chart data (métrica selecionada) ────────────────────────────────
  const leadsMap = useMemo(
    () => new Map(leadsByDay.map((r) => [r.date, r.leads])),
    [leadsByDay]
  )

  const lineChartData = useMemo(() => {
    const sorted = [...dailySorted].reverse()
    if (selectedMetric === "sessions") {
      return [{
        id: "Sessões",
        color: "#3b82f6",
        data: sorted.map((r) => ({ x: fmtDateShort(r.date), y: r.sessions })),
      }]
    }
    return [{
      id: "Leads",
      color: "#10b981",
      data: sorted.map((r) => {
        let iso = r.date
        if (r.date.includes("/")) {
          const [d, mo, y] = r.date.split("/")
          iso = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`
        }
        return { x: fmtDateShort(r.date), y: leadsMap.get(iso) ?? 0 }
      }),
    }]
  }, [dailySorted, leadsByDay, selectedMetric, leadsMap])

  const loading = l1 || l2 || l3 || l4
  const error = e1 || e2 || e3

  if (loading) return <Loading message="Carregando dados de tráfego..." />
  if (error)
    return (
      <div className="bg-red-50/90 border border-red-200 rounded-2xl p-4">
        <p className="text-red-600">Erro: {error.message}</p>
      </div>
    )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card-overlay rounded-2xl shadow-lg px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/images/LOGO_JETOUR.png" alt="Jetour" className="h-7 object-contain" />
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Site</h1>
            <p className="text-xs text-gray-500">Google Analytics 4 — dados do site</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <TrendingUp className="w-7 h-7 text-gray-400" />

          {/* Filtro de período */}
          {dataDateRange && (
            <div className="relative">
              <button
                ref={pillRef}
                onClick={() => setDatePickerOpen((v) => !v)}
                className={`flex items-center gap-1.5 border rounded-full px-3 py-1.5 shadow-sm transition-all text-xs font-medium ${
                  isFiltered
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
                }`}
              >
                <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>
                  {activeStartDate && activeEndDate
                    ? `${formatDateBR(activeStartDate)} – ${formatDateBR(activeEndDate)}`
                    : "Selecionar período"}
                </span>
                <svg className={`w-3 h-3 flex-shrink-0 transition-transform ${datePickerOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {datePickerOpen && createPortal((() => {
                const rect = pillRef.current?.getBoundingClientRect()
                return (
                  <div
                    style={{
                      position: "fixed",
                      top: rect ? rect.bottom + 8 : 80,
                      right: rect ? window.innerWidth - rect.right : 16,
                      width: 288,
                      zIndex: 99999,
                      background: "#eef2f7",
                    }}
                    className="rounded-2xl shadow-2xl border border-slate-200 p-4"
                  >
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Filtrar período</p>
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">De</label>
                        <input
                          type="date"
                          value={activeStart}
                          min={toISO(dataDateRange.min)}
                          max={activeEnd || toISO(dataDateRange.max)}
                          onChange={(e) => setFilterStart(e.target.value)}
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Até</label>
                        <input
                          type="date"
                          value={activeEnd}
                          min={activeStart || toISO(dataDateRange.min)}
                          max={toISO(dataDateRange.max)}
                          onChange={(e) => setFilterEnd(e.target.value)}
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      {isFiltered && (
                        <button
                          onClick={() => { setFilterStart(""); setFilterEnd(""); setDatePickerOpen(false) }}
                          className="flex-1 text-xs text-gray-500 border border-gray-200 rounded-lg py-1.5 hover:bg-gray-50 bg-white transition-colors"
                        >
                          Limpar
                        </button>
                      )}
                      <button
                        onClick={() => setDatePickerOpen(false)}
                        className="flex-1 text-xs bg-blue-600 text-white rounded-lg py-1.5 hover:bg-blue-700 transition-colors font-medium"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                )
              })(), document.body)}
            </div>
          )}
        </div>
      </div>

      {/* Big numbers */}
      <div className="grid grid-cols-3 lg:grid-cols-7 gap-3">
        {[
          { label: "Novos Usuários",   value: fmt(totals.newUsers),         icon: <Users className="w-4 h-4" /> },
          { label: "Sessões",          value: fmt(totals.sessions),          icon: <Activity className="w-4 h-4" /> },
          { label: "Visualizações",    value: fmt(totals.views),             icon: <Eye className="w-4 h-4" /> },
          { label: "Sess. Engajadas",  value: fmt(totals.engagedSessions),   icon: <MousePointerClick className="w-4 h-4" /> },
          { label: "Eventos",          value: fmt(totals.eventCount),        icon: <Zap className="w-4 h-4" /> },
          { label: "Taxa de Rejeição", value: fmtPct(totals.avgBounceRate),  icon: <Globe className="w-4 h-4" /> },
          { label: "Leads",            value: fmt(totalLeads),               icon: <Target className="w-4 h-4" /> },
        ].map((c) => (
          <div key={c.label} className="bg-slate-700/80 rounded-2xl px-3 py-3 flex flex-col gap-1 text-white">
            <div className="flex items-center gap-1.5 text-slate-300 text-xs">{c.icon}{c.label}</div>
            <div className="text-sm font-bold truncate">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["overview", "eventos"] as const).map((tab) => {
          const labels = { overview: "Visão Geral", eventos: "Eventos" }
          return (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === tab
                  ? "bg-slate-700 text-white shadow"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {labels[tab]}
            </button>
          )
        })}
      </div>

      {/* ── Overview ──────────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* Line chart: métrica selecionável */}
          <div className="card-overlay rounded-2xl shadow-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-gray-800">
                {selectedMetric === "sessions" ? "Sessões por dia" : "Leads por dia"}
              </p>
              <div className="flex gap-1.5">
                {([
                  { key: "sessions", label: "Sessões", color: "bg-blue-500" },
                  { key: "leads",    label: "Leads",   color: "bg-emerald-500" },
                ] as const).map(({ key, label, color }) => (
                  <button
                    key={key}
                    onClick={() => setSelectedMetric(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border-2 ${
                      selectedMetric === key
                        ? "bg-slate-700 text-white border-slate-700"
                        : "bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${selectedMetric === key ? "bg-white" : color}`} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {lineChartData[0].data.length === 0 ? (
              <div className="text-gray-400 text-sm text-center py-8">Sem dados disponíveis</div>
            ) : (
              <div style={{ height: 260 }}>
                <ResponsiveLine
                  data={lineChartData}
                  margin={{ top: 10, right: 20, bottom: 60, left: 55 }}
                  xScale={{ type: "point" }}
                  yScale={{ type: "linear", min: "auto", max: "auto", stacked: false }}
                  curve="monotoneX"
                  axisBottom={{
                    tickSize: 0,
                    tickPadding: 10,
                    tickRotation: -45,
                    tickValues: lineChartData[0].data.length > 30
                      ? lineChartData[0].data.filter((_, i) => i % Math.ceil(lineChartData[0].data.length / 20) === 0).map(d => d.x)
                      : undefined,
                  }}
                  axisLeft={{
                    tickSize: 0,
                    tickPadding: 8,
                    format: (v: number) => selectedMetric === "sessions" ? fmt(v) : String(v),
                  }}
                  enableGridX={false}
                  gridYValues={4}
                  colors={[selectedMetric === "sessions" ? "#3b82f6" : "#10b981"]}
                  lineWidth={2}
                  enablePoints={lineChartData[0].data.length <= 30}
                  pointSize={5}
                  pointColor="#fff"
                  pointBorderWidth={2}
                  pointBorderColor={selectedMetric === "sessions" ? "#3b82f6" : "#10b981"}
                  enableArea={true}
                  areaOpacity={0.08}
                  useMesh={true}
                  tooltip={({ point }) => (
                    <div className="bg-white border border-gray-200 rounded-lg shadow px-3 py-2 text-xs">
                      <div className="font-semibold text-gray-700">{String(point.data.x)}</div>
                      <div className="font-bold" style={{ color: selectedMetric === "sessions" ? "#3b82f6" : "#10b981" }}>
                        {selectedMetric === "sessions" ? fmt(Number(point.data.y)) : Number(point.data.y)} {selectedMetric === "sessions" ? "sessões" : "leads"}
                      </div>
                    </div>
                  )}
                  theme={{
                    axis: { ticks: { text: { fontSize: 10, fill: "#9ca3af" } } },
                    grid: { line: { stroke: "#f1f5f9", strokeWidth: 1 } },
                  }}
                />
              </div>
            )}
          </div>

          {/* Leads por fonte + por campanha */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card-overlay rounded-2xl shadow-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-gray-800">Leads por fonte</p>
                <span className="text-xs text-gray-400">{fmt(totalLeads)} total</span>
              </div>
              {leadsBySource.length === 0 ? (
                <div className="text-gray-400 text-sm text-center py-6">Sem dados</div>
              ) : (
                <div className="overflow-y-auto space-y-2" style={{ maxHeight: 220 }}>
                  {leadsBySource.map((row) => {
                    const pct = (row.leads / (leadsBySource[0]?.leads || 1)) * 100
                    return (
                      <div key={row.source} className="flex items-center gap-2">
                        <div className="w-28 text-xs text-gray-700 font-medium truncate flex-shrink-0" title={row.source}>{row.source}</div>
                        <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="w-6 text-right text-xs font-bold text-gray-800 flex-shrink-0">{row.leads}</div>
                        <div className="w-9 text-right text-xs text-gray-400 flex-shrink-0">{((row.leads / totalLeads) * 100).toFixed(0)}%</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="card-overlay rounded-2xl shadow-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-gray-800">Leads por campanha</p>
                <span className="text-xs text-gray-400">{leadsByCampaign.length} campanhas</span>
              </div>
              {leadsByCampaign.length === 0 ? (
                <div className="text-gray-400 text-sm text-center py-6">Sem dados</div>
              ) : (
                <div className="overflow-y-auto space-y-2" style={{ maxHeight: 220 }}>
                  {leadsByCampaign.map((row) => {
                    const pct = (row.leads / (leadsByCampaign[0]?.leads || 1)) * 100
                    return (
                      <div key={row.campaign} className="flex items-center gap-2">
                        <div className="w-36 text-xs text-gray-700 font-medium truncate flex-shrink-0" title={row.campaign}>{row.campaign}</div>
                        <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="w-6 text-right text-xs font-bold text-gray-800 flex-shrink-0">{row.leads}</div>
                        <div className="w-9 text-right text-xs text-gray-400 flex-shrink-0">{((row.leads / totalLeads) * 100).toFixed(0)}%</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Map + Top regions — side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Map */}
            <div className="card-overlay rounded-2xl shadow-lg p-4">
              <p className="text-sm font-bold text-gray-800 mb-3">Distribuição Geográfica</p>
              <BrazilMap regionData={regionDataForMap} getIntensityColor={getIntensityColor} />
              <div className="flex items-center gap-2 mt-3 justify-center">
                <span className="text-xs text-gray-500">Menos</span>
                <div className="flex h-3 rounded overflow-hidden" style={{ width: 120 }}>
                  {[0.1, 0.3, 0.5, 0.7, 0.9, 1.0].map((v) => (
                    <div key={v} className="flex-1" style={{ background: getIntensityColor(v * maxSessions) }} />
                  ))}
                </div>
                <span className="text-xs text-gray-500">Mais</span>
              </div>
            </div>

            {/* Top regions list */}
            <div className="card-overlay rounded-2xl shadow-lg p-4">
              <p className="text-sm font-bold text-gray-800 mb-4">Sessões por região (Top 15)</p>
              {regionAgg.length === 0 ? (
                <div className="text-gray-400 text-sm text-center py-8">Sem dados de regiões</div>
              ) : (
                <div className="space-y-2.5">
                  {regionAgg.slice(0, 15).map((reg) => {
                    const pct = (reg.sessions / (regionAgg[0]?.sessions || 1)) * 100
                    return (
                      <div key={reg.region} className="flex items-center gap-3">
                        <div className="w-36 text-xs text-gray-700 font-medium truncate" title={reg.region}>{reg.region}</div>
                        <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="w-12 text-right text-xs font-bold text-gray-800">{fmt(reg.sessions)}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Dados por região — collapse */}
          <div className="card-overlay rounded-2xl shadow p-4">
            <button
              className="w-full flex items-center justify-between"
              onClick={() => setRegionTableOpen((v) => !v)}
            >
              <p className="text-sm font-bold text-gray-800">Dados por região ({regionAgg.length})</p>
              {regionTableOpen
                ? <ChevronUp className="w-4 h-4 text-gray-400" />
                : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {regionTableOpen && (
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-700 text-white">
                      <th className="text-left py-2.5 px-3 font-semibold rounded-l-xl">#</th>
                      <th className="text-left py-2.5 px-3 font-semibold">Região / Estado</th>
                      <th className="text-right py-2.5 px-3 font-semibold">Sessões</th>
                      <th className="text-right py-2.5 px-3 font-semibold">Eventos</th>
                      <th className="text-right py-2.5 px-3 font-semibold rounded-r-xl">Conversões</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regionAgg.map((reg, i) => (
                      <tr key={reg.region} className={i % 2 === 0 ? "bg-slate-50/60" : "bg-white/40"}>
                        <td className="py-2.5 px-3 text-gray-400">{i + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-gray-900">{reg.region}</td>
                        <td className="py-2.5 px-3 text-right text-gray-700">{fmt(reg.sessions)}</td>
                        <td className="py-2.5 px-3 text-right text-gray-700">{fmt(reg.eventCount)}</td>
                        <td className="py-2.5 px-3 text-right text-gray-700">{reg.conversions > 0 ? fmt(reg.conversions) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Dados por Dia — collapse */}
          <div className="card-overlay rounded-2xl shadow p-4">
            <button
              className="w-full flex items-center justify-between"
              onClick={() => setTableOpen((v) => !v)}
            >
              <p className="text-sm font-bold text-gray-800">Dados por Dia ({dailySorted.length} dias)</p>
              {tableOpen
                ? <ChevronUp className="w-4 h-4 text-gray-400" />
                : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {tableOpen && (
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-700 text-white">
                      <th className="text-left py-2.5 px-3 font-semibold rounded-l-xl">Data</th>
                      <th className="text-right py-2.5 px-3 font-semibold">Novos Usuários</th>
                      <th className="text-right py-2.5 px-3 font-semibold">Sessões</th>
                      <th className="text-right py-2.5 px-3 font-semibold">Visualizações</th>
                      <th className="text-right py-2.5 px-3 font-semibold">Sess. Engajadas</th>
                      <th className="text-right py-2.5 px-3 font-semibold">Eventos</th>
                      <th className="text-right py-2.5 px-3 font-semibold rounded-r-xl">Tx. Rejeição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailySorted.map((row, i) => (
                      <tr key={row.date} className={i % 2 === 0 ? "bg-slate-50/60" : "bg-white/40"}>
                        <td className="py-2.5 px-3 font-semibold text-gray-700">{fmtDateFull(row.date)}</td>
                        <td className="py-2.5 px-3 text-right text-gray-700">{fmt(row.newUsers)}</td>
                        <td className="py-2.5 px-3 text-right text-gray-700">{fmt(row.sessions)}</td>
                        <td className="py-2.5 px-3 text-right text-gray-700">{fmt(row.views)}</td>
                        <td className="py-2.5 px-3 text-right text-gray-700">{fmt(row.engagedSessions)}</td>
                        <td className="py-2.5 px-3 text-right text-gray-700">{fmt(row.eventCount)}</td>
                        <td className="py-2.5 px-3 text-right text-gray-700">{fmtPct(row.bounceRate)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-700 text-white font-bold border-t-2 border-slate-600">
                      <td className="py-2.5 px-3 rounded-l-xl">Total</td>
                      <td className="py-2.5 px-3 text-right">{fmt(totals.newUsers)}</td>
                      <td className="py-2.5 px-3 text-right">{fmt(totals.sessions)}</td>
                      <td className="py-2.5 px-3 text-right">{fmt(totals.views)}</td>
                      <td className="py-2.5 px-3 text-right">{fmt(totals.engagedSessions)}</td>
                      <td className="py-2.5 px-3 text-right">{fmt(totals.eventCount)}</td>
                      <td className="py-2.5 px-3 text-right rounded-r-xl">{fmtPct(totals.avgBounceRate)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Eventos ───────────────────────────────────────────────────────── */}
      {activeTab === "eventos" && (
        <div className="space-y-4">
          {/* Horizontal bars */}
          <div className="card-overlay rounded-2xl shadow-lg p-4">
            <p className="text-sm font-bold text-gray-800 mb-4">Principais eventos</p>
            {eventAgg.length === 0 ? (
              <div className="text-gray-400 text-sm text-center py-8">Sem dados de eventos</div>
            ) : (
              <div className="space-y-2.5">
                {eventAgg.slice(0, 20).map((ev) => {
                  const maxEvt = eventAgg[0]?.eventCount || 1
                  const pct = (ev.eventCount / maxEvt) * 100
                  return (
                    <div key={ev.name} className="flex items-center gap-3">
                      <div className="w-44 text-xs text-gray-700 font-medium truncate" title={ev.name}>{ev.name}</div>
                      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="w-16 text-right text-xs font-bold text-gray-800">{fmt(ev.eventCount)}</div>
                      {ev.conversions > 0 && (
                        <div className="w-20 text-right text-xs text-emerald-600 font-semibold">{fmt(ev.conversions)} conv.</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Events table */}
          <div className="card-overlay rounded-2xl shadow p-4">
            <p className="text-sm font-bold text-gray-800 mb-3">Todos os eventos ({eventAgg.length})</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-700 text-white">
                    <th className="text-left py-2.5 px-3 font-semibold rounded-l-xl">#</th>
                    <th className="text-left py-2.5 px-3 font-semibold">Evento</th>
                    <th className="text-right py-2.5 px-3 font-semibold">Contagem</th>
                    <th className="text-right py-2.5 px-3 font-semibold rounded-r-xl">Conversões</th>
                  </tr>
                </thead>
                <tbody>
                  {eventAgg.map((ev, i) => (
                    <tr key={ev.name} className={i % 2 === 0 ? "bg-slate-50/60" : "bg-white/40"}>
                      <td className="py-2.5 px-3 text-gray-400">{i + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-gray-900">{ev.name}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700">{fmt(ev.eventCount)}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700">{ev.conversions > 0 ? fmt(ev.conversions) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default TrafegoEngajamento
