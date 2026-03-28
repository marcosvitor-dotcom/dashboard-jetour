"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { Calendar, Filter, DollarSign, Eye, MousePointer, TrendingUp, Users, BarChart3, Play } from "lucide-react"
import Loading from "../../components/Loading/Loading"
import { useData } from "../../contexts/DataContext"
import { parseBrazilianCurrency, parseBrazilianNumber } from "../../services/consolidadoApi"

// ── Interfaces ────────────────────────────────────────────────────────────────

interface ProcessedRow {
  date: string
  platform: string
  campaignName: string
  impressions: number
  cost: number
  clicks: number
  videoPlays: number
  videoCompletions: number
  leads: number
  engagements: number
}

interface PlatformMetrics {
  platform: string
  impressions: number
  cost: number
  clicks: number
  videoPlays: number
  videoCompletions: number
  leads: number
  engagements: number
  color: string
}

interface ChartPoint { platform: string; value: number; color: string }

// ── Platform icon ─────────────────────────────────────────────────────────────
const PlatformIcon: React.FC<{ platform: string; className?: string }> = ({ platform, className = "w-3.5 h-3.5" }) => {
  const p = platform.toLowerCase()
  if (p.includes("meta") || p.includes("instagram") || p.includes("facebook")) {
    return (
      <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" fill="currentColor">
        <path d="M47.3,21.01c-0.58-1.6-1.3-3.16-2.24-4.66c-0.93-1.49-2.11-2.93-3.63-4.13c-1.51-1.19-3.49-2.09-5.59-2.26l-0.78-0.04c-0.27,0.01-0.57,0.01-0.85,0.04c-0.57,0.06-1.11,0.19-1.62,0.34c-1.03,0.32-1.93,0.8-2.72,1.32c-1.42,0.94-2.55,2.03-3.57,3.15c0.01,0.02,0.03,0.03,0.04,0.05l0.22,0.28c0.51,0.67,1.62,2.21,2.61,3.87c1.23-1.2,2.83-2.65,3.49-3.07c0.5-0.31,0.99-0.55,1.43-0.68c0.23-0.06,0.44-0.11,0.64-0.12c0.1-0.02,0.19-0.01,0.3-0.02l0.38,0.02c0.98,0.09,1.94,0.49,2.85,1.19c1.81,1.44,3.24,3.89,4.17,6.48c0.95,2.6,1.49,5.44,1.52,8.18c0,1.31-0.17,2.57-0.57,3.61c-0.39,1.05-1.38,1.45-2.5,1.45c-1.63,0-2.81-0.7-3.76-1.68c-1.04-1.09-2.02-2.31-2.96-3.61c-0.78-1.09-1.54-2.22-2.26-3.37c-1.27-2.06-2.97-4.67-4.15-6.85L25,16.35c-0.31-0.39-0.61-0.78-0.94-1.17c-1.11-1.26-2.34-2.5-3.93-3.56c-0.79-0.52-1.69-1-2.72-1.32c-0.51-0.15-1.05-0.28-1.62-0.34c-0.18-0.02-0.36-0.03-0.54-0.03c-0.11,0-0.21-0.01-0.31-0.01l-0.78,0.04c-2.1,0.17-4.08,1.07-5.59,2.26c-1.52,1.2-2.7,2.64-3.63,4.13C4,17.85,3.28,19.41,2.7,21.01c-1.13,3.2-1.74,6.51-1.75,9.93c0.01,1.78,0.24,3.63,0.96,5.47c0.7,1.8,2.02,3.71,4.12,4.77c1.03,0.53,2.2,0.81,3.32,0.81c1.23,0.03,2.4-0.32,3.33-0.77c1.87-0.93,3.16-2.16,4.33-3.4c2.31-2.51,4.02-5.23,5.6-8c0.44-0.76,0.86-1.54,1.27-2.33c-0.21-0.41-0.42-0.84-0.64-1.29c-0.62-1.03-1.39-2.25-1.95-3.1c-0.83,1.5-1.69,2.96-2.58,4.41c-1.59,2.52-3.3,4.97-5.21,6.98c-0.95,0.98-2,1.84-2.92,2.25c-0.47,0.2-0.83,0.27-1.14,0.25c-0.43,0-0.79-0.1-1.13-0.28c-0.67-0.35-1.3-1.1-1.69-2.15c-0.4-1.04-0.57-2.3-0.57-3.61c0.03-2.74,0.57-5.58,1.52-8.18c0.93-2.59,2.36-5.04,4.17-6.48c0.91-0.7,1.87-1.1,2.85-1.19l0.38-0.02c0.11,0.01,0.2,0,0.3,0.02c0.2,0.01,0.41,0.06,0.64,0.12c0.26,0.08,0.54,0.19,0.83,0.34c0.2,0.1,0.4,0.21,0.6,0.34c1,0.64,1.99,1.58,2.92,2.62c0.72,0.81,1.41,1.71,2.1,2.63L25,25.24c0.75,1.55,1.53,3.09,2.39,4.58c1.58,2.77,3.29,5.49,5.6,8c0.68,0.73,1.41,1.45,2.27,2.1c0.61,0.48,1.28,0.91,2.06,1.3c0.93,0.45,2.1,0.8,3.33,0.77c1.12,0,2.29-0.28,3.32-0.81c2.1-1.06,3.42-2.97,4.12-4.77c0.72-1.84,0.95-3.69,0.96-5.47C49.04,27.52,48.43,24.21,47.3,21.01z" />
      </svg>
    )
  }
  if (p.includes("tiktok")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    )
  }
  if (p.includes("linkedin")) {
    return (
      <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" fill="currentColor">
        <path d="M41,4H9C6.24,4,4,6.24,4,9v32c0,2.76,2.24,5,5,5h32c2.76,0,5-2.24,5-5V9C46,6.24,43.76,4,41,4z M17,20v19h-6V20H17z M11,14.47c0-1.4,1.2-2.47,3-2.47s2.93,1.07,3,2.47c0,1.4-1.12,2.53-3,2.53C12.2,17,11,15.87,11,14.47z M39,39h-6c0,0,0-9.26,0-10 c0-2-1-4-3.5-4.04h-0.08C27,24.96,26,27.02,26,29c0,0.91,0,10,0,10h-6V20h6v2.56c0,0,1.93-2.56,5.81-2.56 c3.97,0,7.19,2.73,7.19,8.26V39z" />
      </svg>
    )
  }
  if (p.includes("google")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    )
  }
  if (p.includes("kwai")) {
    return <img src="https://www.svgrepo.com/show/349411/kwai.svg" alt="Kwai" className={className} />
  }
  if (p.includes("youtube")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    )
  }
  return <BarChart3 className={className} />
}

// ── Color map ─────────────────────────────────────────────────────────────────
const PLATFORM_COLORS: Record<string, string> = {
  Google: "#4285f4",
  Meta: "#0668E1",
  TikTok: "#ff0050",
  YouTube: "#ff0000",
  Kwai: "#ff6b35",
  "Globo.com": "#00a86b",
  Serasa: "#9b59b6",
  Spotify: "#1DB954",
  LinkedIn: "#0077b5",
  Default: "#6366f1",
}

const platformColor = (p: string) =>
  PLATFORM_COLORS[p] ?? PLATFORM_COLORS[Object.keys(PLATFORM_COLORS).find(k => p.toLowerCase().includes(k.toLowerCase())) ?? ""] ?? PLATFORM_COLORS.Default

// ── Format helpers ────────────────────────────────────────────────────────────
const fmt = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".", ",")} mi`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)} mil`
  return v.toLocaleString("pt-BR")
}
const fmtCurrency = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtPct = (v: number) => `${v.toFixed(2)}%`

// ── Horizontal bar chart ──────────────────────────────────────────────────────
const HBar: React.FC<{ data: ChartPoint[]; format?: (v: number) => string }> = ({
  data,
  format = fmt,
}) => {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="space-y-2 mt-2">
      {data.map((item) => (
        <div key={item.platform} className="flex items-center gap-2">
          <div className="w-4 h-4 flex-shrink-0">
            <PlatformIcon platform={item.platform} className="w-4 h-4" />
          </div>
          <div className="w-14 text-xs text-gray-600 truncate">{item.platform}</div>
          <div className="flex-1 relative h-6 bg-gray-100 rounded-lg overflow-hidden">
            <div
              className="h-full rounded-lg transition-all duration-500"
              style={{ width: `${(item.value / max) * 100}%`, backgroundColor: item.color }}
            />
            <div className="absolute inset-0 flex items-center justify-end pr-2">
              <span className="text-xs font-semibold text-gray-700">{format(item.value)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
const VisaoGeral: React.FC = () => {
  const { data: apiData, campaigns, loading, error } = useData()

  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" })
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)

  // ── Parse raw API rows ──────────────────────────────────────────────────────
  const allRows = useMemo<ProcessedRow[]>(() => {
    if (!apiData?.success || !apiData?.data?.values || apiData.data.values.length < 2) return []

    const headers = apiData.data.values[0]
    const rows = apiData.data.values.slice(1)

    const idx = (col: string) => headers.indexOf(col)

    const dateIdx       = idx("Date")
    const veiculoIdx    = idx("Veículo")
    const campanhaIdx   = idx("Campanha Nome")
    const impressIdx    = idx("Impressions")
    const spentIdx      = idx("Total spent")
    const clicksIdx     = idx("Clicks")
    const videoIdx      = idx("Video views")
    const videoCompIdx  = idx("Video completions")
    const leadsIdx      = idx("Leads")
    const engagemIdx    = idx("Total engagements")

    return rows
      .map((row: string[]) => {
        const rawPlatform = (row[veiculoIdx] || "Outros").trim()
        const lower = rawPlatform.toLowerCase()
        const platform =
          lower === "audience network" || lower === "unknown" || lower === "threads" || lower === "messenger"
            ? "Meta"
            : rawPlatform

        return {
          date: row[dateIdx] || "",
          platform,
          campaignName: row[campanhaIdx] || "",
          impressions: parseBrazilianNumber(row[impressIdx] || "0"),
          cost: parseBrazilianCurrency(row[spentIdx] || "0"),
          clicks: parseBrazilianNumber(row[clicksIdx] || "0"),
          videoPlays: parseBrazilianNumber(row[videoIdx] || "0"),
          videoCompletions: parseBrazilianNumber(row[videoCompIdx] || "0"),
          leads: parseBrazilianNumber(row[leadsIdx] || "0"),
          engagements: parseBrazilianNumber(row[engagemIdx] || "0"),
        }
      })
      .filter((r) => r.date && r.impressions > 0)
  }, [apiData])

  // ── Set initial date range ──────────────────────────────────────────────────
  const isoDate = (br: string) => {
    if (!br) return ""
    const [d, m, y] = br.split("/")
    return `${y}-${m?.padStart(2, "0")}-${d?.padStart(2, "0")}`
  }

  useMemo(() => {
    if (allRows.length > 0 && !dateRange.start) {
      const dates = allRows.map((r) => isoDate(r.date)).filter(Boolean).sort()
      setDateRange({ start: dates[0], end: dates[dates.length - 1] })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows])

  const availablePlatforms = useMemo(() => {
    return Array.from(new Set(allRows.map((r) => r.platform))).sort()
  }, [allRows])

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return allRows.filter((r) => {
      const iso = isoDate(r.date)
      if (dateRange.start && iso < dateRange.start) return false
      if (dateRange.end && iso > dateRange.end) return false
      if (selectedPlatforms.length > 0 && !selectedPlatforms.includes(r.platform)) return false
      if (selectedCampaign && r.campaignName !== selectedCampaign) return false
      return true
    })
  }, [allRows, dateRange, selectedPlatforms, selectedCampaign])

  // ── Totals ──────────────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const investment      = filtered.reduce((s, r) => s + r.cost, 0)
    const impressions     = filtered.reduce((s, r) => s + r.impressions, 0)
    const clicks          = filtered.reduce((s, r) => s + r.clicks, 0)
    const videoPlays      = filtered.reduce((s, r) => s + r.videoPlays, 0)
    const videoComp       = filtered.reduce((s, r) => s + r.videoCompletions, 0)
    const leads           = filtered.reduce((s, r) => s + r.leads, 0)
    const engagements     = filtered.reduce((s, r) => s + r.engagements, 0)

    const cpm  = impressions > 0 ? investment / (impressions / 1000) : 0
    const cpc  = clicks > 0 ? investment / clicks : 0
    const cpl  = leads > 0 ? investment / leads : 0
    const ctr  = impressions > 0 ? (clicks / impressions) * 100 : 0
    const vtr  = videoPlays > 0 ? (videoComp / videoPlays) * 100 : 0
    const cpv  = videoComp > 0 ? investment / videoComp : 0

    return { investment, impressions, clicks, videoPlays, videoComp, leads, engagements, cpm, cpc, cpl, ctr, vtr, cpv }
  }, [filtered])

  // ── Per-platform metrics ────────────────────────────────────────────────────
  const platformMetrics = useMemo<PlatformMetrics[]>(() => {
    const map: Record<string, PlatformMetrics> = {}
    filtered.forEach((r) => {
      if (!map[r.platform]) {
        map[r.platform] = {
          platform: r.platform,
          impressions: 0, cost: 0, clicks: 0,
          videoPlays: 0, videoCompletions: 0,
          leads: 0, engagements: 0,
          color: platformColor(r.platform),
        }
      }
      const m = map[r.platform]
      m.impressions        += r.impressions
      m.cost               += r.cost
      m.clicks             += r.clicks
      m.videoPlays         += r.videoPlays
      m.videoCompletions   += r.videoCompletions
      m.leads              += r.leads
      m.engagements        += r.engagements
    })
    return Object.values(map).sort((a, b) => b.impressions - a.impressions)
  }, [filtered])

  const mkChart = (key: keyof PlatformMetrics): ChartPoint[] =>
    platformMetrics.map((m) => ({ platform: m.platform, value: m[key] as number, color: m.color }))

  if (loading) return <Loading message="Carregando visão geral..." />
  if (error) return (
    <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-2xl p-4">
      <p className="text-red-600">Erro ao carregar dados: {error.message}</p>
    </div>
  )

  return (
    <div className="space-y-4">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="card-overlay rounded-2xl shadow-lg px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/images/Jetour_logo.svg" alt="Jetour" className="h-7 object-contain" />
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Visão Geral</h1>
            <p className="text-xs text-gray-500">Performance consolidada por plataforma</p>
          </div>
        </div>
        <span className="text-xs text-gray-400">Atualizado: {new Date().toLocaleString("pt-BR")}</span>
      </div>

      {/* ── Big numbers ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "Investimento",  value: `R$ ${fmt(totals.investment)}`,          icon: <DollarSign className="w-4 h-4" /> },
          { label: "Impressões",    value: fmt(totals.impressions),                  icon: <Eye className="w-4 h-4" /> },
          { label: "Cliques",       value: fmt(totals.clicks),                       icon: <MousePointer className="w-4 h-4" /> },
          { label: "Vídeos",        value: fmt(totals.videoPlays),                   icon: <Play className="w-4 h-4" /> },
          { label: "Leads",         value: fmt(totals.leads),                        icon: <Users className="w-4 h-4" /> },
          { label: "CPM",           value: fmtCurrency(totals.cpm),                  icon: <TrendingUp className="w-4 h-4" /> },
          { label: "CTR",           value: fmtPct(totals.ctr),                       icon: <BarChart3 className="w-4 h-4" /> },
          { label: "CPL",           value: totals.leads > 0 ? fmtCurrency(totals.cpl) : "—", icon: <Users className="w-4 h-4" /> },
        ].map((card) => (
          <div key={card.label} className="bg-slate-700/80 rounded-2xl px-3 py-3 flex flex-col gap-1 text-white">
            <div className="flex items-center gap-1.5 text-slate-300 text-xs">
              {card.icon}
              {card.label}
            </div>
            <div className="text-base font-bold truncate">{card.value}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="card-overlay rounded-2xl shadow-lg p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-3">
          {/* Campanha */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Campanha
            </label>
            <div className="relative">
              <select
                value={selectedCampaign || ""}
                onChange={(e) => setSelectedCampaign(e.target.value || null)}
                className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
              >
                <option value="">Todas as campanhas</option>
                {campaigns.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Período */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Período
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={dateRange.start}
                onChange={(e) => setDateRange((p) => ({ ...p, start: e.target.value }))}
                className="px-2 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="date" value={dateRange.end}
                onChange={(e) => setDateRange((p) => ({ ...p, end: e.target.value }))}
                className="px-2 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Plataformas */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Plataformas</label>
            <div className="flex flex-wrap gap-1.5">
              {availablePlatforms.map((p) => {
                const active = selectedPlatforms.includes(p)
                const color = platformColor(p)
                return (
                  <button
                    key={p}
                    onClick={() => setSelectedPlatforms((prev) =>
                      active ? prev.filter((x) => x !== p) : [...prev, p]
                    )}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all border ${
                      active ? "border-transparent shadow-sm" : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                    style={active ? { backgroundColor: color + "20", borderColor: color, color } : undefined}
                  >
                    <PlatformIcon platform={p} className="w-3 h-3" />
                    {p}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Charts grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* Impressões */}
        <div className="card-overlay rounded-2xl shadow p-4">
          <p className="text-sm font-bold text-gray-800 mb-1">Impressões por Plataforma</p>
          <HBar data={mkChart("impressions")} />
        </div>

        {/* Cliques */}
        <div className="card-overlay rounded-2xl shadow p-4">
          <p className="text-sm font-bold text-gray-800 mb-1">Cliques por Plataforma</p>
          <HBar data={mkChart("clicks")} />
        </div>

        {/* Leads */}
        <div className="card-overlay rounded-2xl shadow p-4">
          <p className="text-sm font-bold text-gray-800 mb-1">Leads por Plataforma</p>
          <HBar data={mkChart("leads")} />
        </div>

        {/* Vídeos */}
        <div className="card-overlay rounded-2xl shadow p-4">
          <p className="text-sm font-bold text-gray-800 mb-1">Visualizações de Vídeo por Plataforma</p>
          <HBar data={mkChart("videoPlays")} />
        </div>

        {/* Investimento */}
        <div className="card-overlay rounded-2xl shadow p-4">
          <p className="text-sm font-bold text-gray-800 mb-1">Investimento por Plataforma</p>
          <HBar data={mkChart("cost")} format={(v) => `R$ ${fmt(v)}`} />
        </div>

        {/* CPM */}
        <div className="card-overlay rounded-2xl shadow p-4">
          <p className="text-sm font-bold text-gray-800 mb-1">CPM por Plataforma</p>
          <HBar
            data={platformMetrics.map((m) => ({
              platform: m.platform,
              value: m.impressions > 0 ? m.cost / (m.impressions / 1000) : 0,
              color: m.color,
            }))}
            format={(v) => fmtCurrency(v)}
          />
        </div>

        {/* CTR */}
        <div className="card-overlay rounded-2xl shadow p-4">
          <p className="text-sm font-bold text-gray-800 mb-1">CTR por Plataforma</p>
          <HBar
            data={platformMetrics.map((m) => ({
              platform: m.platform,
              value: m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0,
              color: m.color,
            }))}
            format={fmtPct}
          />
        </div>

        {/* VTR */}
        <div className="card-overlay rounded-2xl shadow p-4">
          <p className="text-sm font-bold text-gray-800 mb-1">VTR por Plataforma</p>
          <HBar
            data={platformMetrics.map((m) => ({
              platform: m.platform,
              value: m.videoPlays > 0 ? (m.videoCompletions / m.videoPlays) * 100 : 0,
              color: m.color,
            }))}
            format={fmtPct}
          />
        </div>

        {/* CPL */}
        <div className="card-overlay rounded-2xl shadow p-4">
          <p className="text-sm font-bold text-gray-800 mb-1">CPL por Plataforma</p>
          <HBar
            data={platformMetrics.map((m) => ({
              platform: m.platform,
              value: m.leads > 0 ? m.cost / m.leads : 0,
              color: m.color,
            }))}
            format={(v) => v > 0 ? fmtCurrency(v) : "—"}
          />
        </div>

      </div>

      {/* ── Tabela detalhada por plataforma ──────────────────────────────── */}
      <div className="card-overlay rounded-2xl shadow p-4">
        <p className="text-sm font-bold text-gray-800 mb-3">Dados Detalhados por Plataforma</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-700 text-white rounded-xl">
                <th className="text-left py-2.5 px-3 font-semibold rounded-l-xl">#</th>
                <th className="text-left py-2.5 px-3 font-semibold">Plataforma</th>
                <th className="text-right py-2.5 px-3 font-semibold">Investimento</th>
                <th className="text-right py-2.5 px-3 font-semibold">Impressões</th>
                <th className="text-right py-2.5 px-3 font-semibold">Cliques</th>
                <th className="text-right py-2.5 px-3 font-semibold">Vídeos</th>
                <th className="text-right py-2.5 px-3 font-semibold">Leads</th>
                <th className="text-right py-2.5 px-3 font-semibold">CPM</th>
                <th className="text-right py-2.5 px-3 font-semibold">CTR</th>
                <th className="text-right py-2.5 px-3 font-semibold rounded-r-xl">CPL</th>
              </tr>
            </thead>
            <tbody>
              {platformMetrics.map((m, i) => (
                <tr key={m.platform} className={i % 2 === 0 ? "bg-slate-50/60" : "bg-white/40"}>
                  <td className="py-2.5 px-3 font-medium text-gray-500">{i + 1}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5 font-semibold text-gray-800">
                      <PlatformIcon platform={m.platform} className="w-3.5 h-3.5 flex-shrink-0" />
                      {m.platform}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-gray-800">{fmtCurrency(m.cost)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-700">{fmt(m.impressions)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-700">{fmt(m.clicks)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-700">{fmt(m.videoPlays)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-700">{fmt(m.leads)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-700">{fmtCurrency(m.impressions > 0 ? m.cost / (m.impressions / 1000) : 0)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-700">{fmtPct(m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-700">{m.leads > 0 ? fmtCurrency(m.cost / m.leads) : "—"}</td>
                </tr>
              ))}
              {/* Total row */}
              {platformMetrics.length > 0 && (
                <tr className="bg-slate-700/10 font-bold border-t border-slate-300">
                  <td className="py-2.5 px-3" />
                  <td className="py-2.5 px-3 text-gray-800">Total</td>
                  <td className="py-2.5 px-3 text-right text-gray-900">{fmtCurrency(totals.investment)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-900">{fmt(totals.impressions)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-900">{fmt(totals.clicks)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-900">{fmt(totals.videoPlays)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-900">{fmt(totals.leads)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-900">{fmtCurrency(totals.cpm)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-900">{fmtPct(totals.ctr)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-900">{totals.leads > 0 ? fmtCurrency(totals.cpl) : "—"}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

export default VisaoGeral
