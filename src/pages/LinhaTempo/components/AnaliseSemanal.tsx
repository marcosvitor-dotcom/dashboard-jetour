"use client"

import type React from "react"
import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import { ResponsiveLine } from "@nivo/line"
import {
  Calendar,
  Filter,
  TrendingUp,
  DollarSign,
  MousePointer,
  Eye,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus,
  Users,
} from "lucide-react"
import PDFDownloadButton from "../../../components/PDFDownloadButton/PDFDownloadButton"

interface DataPoint {
  date: string
  campaignName: string
  creativeTitle: string
  platform: string
  reach: number
  impressions: number
  clicks: number
  totalSpent: number
  videoViews: number
  videoViews25: number
  videoViews50: number
  videoViews75: number
  videoCompletions: number
  totalEngagements: number
  veiculo: string
  tipoCompra: string
}

interface ChartData {
  id: string
  data: Array<{ x: string; y: number }>
}

interface WeeklyMetrics {
  investment: number
  impressions: number
  clicks: number
  views: number
  cpm: number
  cpc: number
  ctr: number
  vtr: number
  cpv: number
}

interface WeeklyComparison {
  current: WeeklyMetrics
  previous: WeeklyMetrics
  comparison: {
    investment: number
    impressions: number
    clicks: number
    views: number
    cpm: number
    cpc: number
    ctr: number
    vtr: number
    cpv: number
  }
}

interface AnaliseSemanalProps {
  processedData: DataPoint[]
  availableVehicles: string[]
  platformColors: Record<string, string>
  onBack: () => void
  campaigns: Array<{ name: string }>
}

// ── Ícones de plataforma ──────────────────────────────────────────────────────
const PlatformIcon: React.FC<{ platform: string; className?: string }> = ({ platform, className = "w-3.5 h-3.5" }) => {
  const p = platform.toLowerCase()
  if (p.includes("instagram") || p.includes("facebook") || p.includes("meta")) {
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
        <path d="M41,4H9C6.24,4,4,6.24,4,9v32c0,2.76,2.24,5,5,5h32c2.76,0,5-2.24,5-5V9C46,6.24,43.76,4,41,4z M17,20v19h-6V20H17z M11,14.47c0-1.4,1.2-2.47,3-2.47s2.93,1.07,3,2.47c0,1.4-1.12,2.53-3,2.53C12.2,17,11,15.87,11,14.47z M39,39h-6c0,0,0-9.26,0-10c0-2-1-4-3.5-4.04h-0.08C27,24.96,26,27.02,26,29c0,0.91,0,10,0,10h-6V20h6v2.56c0,0,1.93-2.56,5.81-2.56c3.97,0,7.19,2.73,7.19,8.26V39z" />
      </svg>
    )
  }
  if (p.includes("kwai")) {
    return <img className={className} src="https://www.svgrepo.com/show/517319/kwai.svg" alt="Kwai" />
  }
  if (p.includes("google") || p.includes("youtube") || p.includes("gdn") || p.includes("demand")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
      </svg>
    )
  }
  return <span className="text-xs font-bold leading-none">{platform.charAt(0).toUpperCase()}</span>
}

const platformColor = (platform: string): string => {
  const p = platform.toLowerCase()
  if (p.includes("instagram")) return "bg-pink-100 text-pink-700"
  if (p.includes("facebook")) return "bg-blue-100 text-blue-700"
  if (p.includes("meta")) return "bg-blue-100 text-blue-700"
  if (p.includes("tiktok")) return "bg-slate-800 text-white"
  if (p.includes("linkedin")) return "bg-sky-100 text-sky-700"
  if (p.includes("kwai")) return "bg-orange-100 text-orange-700"
  if (p.includes("google") || p.includes("gdn") || p.includes("demand")) return "bg-red-100 text-red-700"
  if (p.includes("youtube")) return "bg-red-100 text-red-700"
  return "bg-gray-100 text-gray-700"
}

// ─────────────────────────────────────────────────────────────────────────────

const AnaliseSemanal: React.FC<AnaliseSemanalProps> = ({
  processedData,
  availableVehicles,
  platformColors,
  onBack,
  campaigns,
}) => {
  const contentRef = useRef<HTMLDivElement>(null)
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" })
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [selectedMetric, setSelectedMetric] = useState<
    "impressions" | "clicks" | "views" | "cpm" | "cpc" | "cpv" | "ctr" | "vtr"
  >("impressions")

  const createLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date()
    const parts = dateStr.split("-")
    if (parts.length !== 3) return new Date()
    const [year, month, day] = parts
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  }

  useEffect(() => {
    if (processedData.length > 0) {
      const allDates = Array.from(new Set(processedData.map((i) => i.date)))
        .filter((d) => d?.match(/^\d{4}-\d{2}-\d{2}$/))
        .sort()
      if (allDates.length > 0) {
        const lastDate = allDates[allDates.length - 1]
        const lastDateObj = createLocalDate(lastDate)
        const firstDateObj = new Date(lastDateObj)
        firstDateObj.setDate(lastDateObj.getDate() - 6)
        setDateRange({ start: firstDateObj.toISOString().split("T")[0], end: lastDate })
      }
    }
  }, [processedData])

  const getFilteredDataByPeriod = useCallback((isCurrentPeriod: boolean): DataPoint[] => {
    if (!dateRange.start || !dateRange.end) return []
    const startDate = createLocalDate(dateRange.start)
    const endDate = createLocalDate(dateRange.end)
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1
    const prevStart = new Date(startDate)
    prevStart.setDate(startDate.getDate() - duration)
    const prevEnd = new Date(prevStart)
    prevEnd.setDate(prevStart.getDate() + duration - 1)

    const targetStart = isCurrentPeriod ? startDate : prevStart
    const targetEnd = isCurrentPeriod ? endDate : prevEnd

    return processedData.filter((item) => {
      const d = createLocalDate(item.date)
      return d >= targetStart && d <= targetEnd &&
        (selectedVehicles.length === 0 || selectedVehicles.includes(item.platform)) &&
        (!selectedCampaign || item.campaignName === selectedCampaign)
    })
  }, [processedData, dateRange, selectedVehicles, selectedCampaign])

  const calculateWeeklyMetrics = (data: DataPoint[]): WeeklyMetrics => {
    const investment = data.reduce((s, i) => s + (i.totalSpent || 0), 0)
    const impressions = data.reduce((s, i) => s + (i.impressions || 0), 0)
    const clicks = data.reduce((s, i) => s + (i.clicks || 0), 0)
    const videoCompletions = data.reduce((s, i) => s + (i.videoCompletions || 0), 0)
    const views = data.reduce((s, i) => s + (i.videoViews || 0), 0)
    return {
      investment,
      impressions,
      clicks,
      views,
      cpm: impressions > 0 ? (investment / impressions) * 1000 : 0,
      cpc: clicks > 0 ? investment / clicks : 0,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      vtr: impressions > 0 ? (videoCompletions / impressions) * 100 : 0,
      cpv: views > 0 ? investment / views : 0,
    }
  }

  const weeklyComparison: WeeklyComparison = useMemo(() => {
    const current = calculateWeeklyMetrics(getFilteredDataByPeriod(true))
    const previous = calculateWeeklyMetrics(getFilteredDataByPeriod(false))
    const pct = (cur: number, prev: number) =>
      !prev ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100
    return {
      current,
      previous,
      comparison: {
        investment: pct(current.investment, previous.investment),
        impressions: pct(current.impressions, previous.impressions),
        clicks: pct(current.clicks, previous.clicks),
        views: pct(current.views, previous.views),
        cpm: pct(current.cpm, previous.cpm),
        cpc: pct(current.cpc, previous.cpc),
        ctr: pct(current.ctr, previous.ctr),
        vtr: pct(current.vtr, previous.vtr),
        cpv: pct(current.cpv, previous.cpv),
      },
    }
  }, [getFilteredDataByPeriod])

  const weeklyChartData: ChartData[] = useMemo(() => {
    const currentData = getFilteredDataByPeriod(true)
    const previousData = getFilteredDataByPeriod(false)

    const groupByDay = (data: DataPoint[]) => {
      const grouped: Record<string, DataPoint[]> = {}
      data.forEach((item) => {
        const key = createLocalDate(item.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(item)
      })
      return grouped
    }

    const getValue = (dayData: DataPoint[]) => {
      if (!dayData?.length) return 0
      const inv = dayData.reduce((s, i) => s + (i.totalSpent || 0), 0)
      const imp = dayData.reduce((s, i) => s + (i.impressions || 0), 0)
      const clk = dayData.reduce((s, i) => s + (i.clicks || 0), 0)
      const vws = dayData.reduce((s, i) => s + (i.videoViews || i.videoCompletions || 0), 0)
      switch (selectedMetric) {
        case "impressions": return imp
        case "clicks": return clk
        case "views": return vws
        case "cpm": return imp > 0 ? (inv / imp) * 1000 : 0
        case "cpc": return clk > 0 ? inv / clk : 0
        case "cpv": return vws > 0 ? inv / vws : 0
        case "ctr": return imp > 0 ? (clk / imp) * 100 : 0
        case "vtr": return imp > 0 ? (vws / imp) * 100 : 0
        default: return 0
      }
    }

    const sortDays = (days: string[]) =>
      days.sort((a, b) => {
        const [dA, mA] = a.split("/").map(Number)
        const [dB, mB] = b.split("/").map(Number)
        return new Date(2000, mA - 1, dA).getTime() - new Date(2000, mB - 1, dB).getTime()
      })

    const currGrouped = groupByDay(currentData)
    const prevGrouped = groupByDay(previousData)
    const result: ChartData[] = []

    const prevPoints = sortDays(Object.keys(prevGrouped))
      .map((d) => ({ x: d, y: getValue(prevGrouped[d]) }))
      .filter((p) => p.y > 0)
    if (prevPoints.length) result.push({ id: "Período Anterior", data: prevPoints })

    const currPoints = sortDays(Object.keys(currGrouped))
      .map((d) => ({ x: d, y: getValue(currGrouped[d]) }))
      .filter((p) => p.y > 0)
    if (currPoints.length) result.push({ id: "Período Atual", data: currPoints })

    return result
  }, [selectedMetric, getFilteredDataByPeriod])

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

  const formatNumber = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".", ",")} mi`
    if (v >= 1_000) return `${(v / 1_000).toFixed(1).replace(".", ",")} mil`
    return v.toLocaleString("pt-BR")
  }

  const formatValue = (v: number, metric = selectedMetric) => {
    if (["cpm", "cpc", "cpv", "investment"].includes(metric)) return formatCurrency(v)
    if (["ctr", "vtr"].includes(metric)) return `${v.toFixed(2)}%`
    return formatNumber(v)
  }

  const formatAxisLeft = (v: number | string) => {
    const n = typeof v === "string" ? parseFloat(v) : v
    if (["ctr", "vtr"].includes(selectedMetric)) return `${n.toFixed(1)}%`
    if (["cpm", "cpc", "cpv"].includes(selectedMetric)) {
      if (n >= 1000) return `R$ ${(n / 1000).toFixed(0)} mil`
      return `R$ ${n.toFixed(0)}`
    }
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} mi`
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)} mil`
    return n.toLocaleString("pt-BR")
  }

  const toggleVehicle = (v: string) =>
    setSelectedVehicles((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v])

  const renderDelta = (value: number, inverse = false) => {
    if (!value || isNaN(value)) return <Minus className="w-3.5 h-3.5 text-gray-400" />
    const positive = inverse ? value < 0 : value > 0
    return positive
      ? <ArrowUp className="w-3.5 h-3.5 text-green-500" />
      : <ArrowDown className="w-3.5 h-3.5 text-red-500" />
  }

  const deltaColor = (value: number, inverse = false) => {
    if (!value || isNaN(value)) return "text-gray-400"
    const positive = inverse ? value < 0 : value > 0
    return positive ? "text-green-600" : "text-red-600"
  }

  const getChartScale = (): { type: "linear"; min: "auto" | number; max: "auto" | number } => {
    if (["ctr", "vtr"].includes(selectedMetric)) {
      const max = Math.min(100, Math.max(...weeklyChartData.flatMap((s) => s.data.map((d) => d.y))) * 1.1)
      return { type: "linear", min: 0, max }
    }
    return { type: "linear", min: "auto", max: "auto" }
  }

  const getPreviousPeriodDates = () => {
    if (!dateRange.start || !dateRange.end) return { start: "", end: "" }
    const start = createLocalDate(dateRange.start)
    const end = createLocalDate(dateRange.end)
    const duration = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1
    const prevStart = new Date(start)
    prevStart.setDate(start.getDate() - duration)
    const prevEnd = new Date(prevStart)
    prevEnd.setDate(prevStart.getDate() + duration - 1)
    return { start: prevStart.toLocaleDateString("pt-BR"), end: prevEnd.toLocaleDateString("pt-BR") }
  }

  const previousPeriod = getPreviousPeriodDates()

  // ── Cards de métricas ────────────────────────────────────────────────────
  const metricCards = [
    {
      label: "Investimento", icon: <DollarSign className="w-4 h-4" />,
      value: formatCurrency(weeklyComparison.current.investment),
      sub: `CPM: ${formatCurrency(weeklyComparison.current.cpm)}`,
      delta: weeklyComparison.comparison.investment, inverse: false,
    },
    {
      label: "Impressões", icon: <TrendingUp className="w-4 h-4" />,
      value: formatNumber(weeklyComparison.current.impressions),
      sub: `CTR: ${weeklyComparison.current.ctr.toFixed(2)}%`,
      delta: weeklyComparison.comparison.impressions, inverse: false,
    },
    {
      label: "Cliques", icon: <MousePointer className="w-4 h-4" />,
      value: formatNumber(weeklyComparison.current.clicks),
      sub: `CPC: ${formatCurrency(weeklyComparison.current.cpc)}`,
      delta: weeklyComparison.comparison.clicks, inverse: false,
    },
    {
      label: "Visualizações", icon: <Eye className="w-4 h-4" />,
      value: formatNumber(weeklyComparison.current.views),
      sub: `VTR: ${weeklyComparison.current.vtr.toFixed(2)}%`,
      delta: weeklyComparison.comparison.views, inverse: false,
    },
    {
      label: "CPM", icon: <BarChart3 className="w-4 h-4" />,
      value: formatCurrency(weeklyComparison.current.cpm),
      sub: `Ant: ${formatCurrency(weeklyComparison.previous.cpm)}`,
      delta: weeklyComparison.comparison.cpm, inverse: true,
    },
  ]

  return (
    <div ref={contentRef} className="space-y-4 flex flex-col max-h-screen overflow-y-auto">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="card-overlay rounded-2xl shadow-lg px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="/images/Jetour_logo.svg" alt="Jetour" className="h-7 object-contain" />
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Análise de Período</h1>
            <p className="text-xs text-gray-500">Comparativo entre períodos</p>
          </div>
          {/* Indicador de períodos inline */}
          <div className="hidden md:flex items-center gap-4 ml-6 pl-6 border-l border-gray-200">
            <div className="text-center">
              <div className="flex items-center gap-1.5 justify-center mb-0.5">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs font-semibold text-gray-500">Período Anterior</span>
              </div>
              <p className="text-xs font-bold text-gray-800">
                {previousPeriod.start && `${previousPeriod.start} — ${previousPeriod.end}`}
              </p>
            </div>
            <span className="text-lg text-gray-300 font-light">vs</span>
            <div className="text-center">
              <div className="flex items-center gap-1.5 justify-center mb-0.5">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs font-semibold text-gray-500">Período Atual</span>
              </div>
              <p className="text-xs font-bold text-gray-800">
                {dateRange.start && `${createLocalDate(dateRange.start).toLocaleDateString("pt-BR")} — ${createLocalDate(dateRange.end).toLocaleDateString("pt-BR")}`}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PDFDownloadButton contentRef={contentRef} fileName="analise-de-periodo" />
          <button
            onClick={onBack}
            className="px-3 py-1.5 border border-slate-400 text-slate-600 rounded-xl hover:bg-slate-50 text-xs font-medium transition-colors"
          >
            ← Linha do Tempo
          </button>
        </div>
      </div>

      {/* ── Cards de métricas ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-3">
        {metricCards.map((card) => (
          <div key={card.label} className="card-overlay rounded-2xl shadow p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 bg-slate-100 rounded-lg text-slate-600">{card.icon}</div>
              <div className="flex items-center gap-1">
                {renderDelta(card.delta, card.inverse)}
                <span className={`text-xs font-semibold ${deltaColor(card.delta, card.inverse)}`}>
                  {Math.abs(card.delta).toFixed(1)}%
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 font-medium">{card.label}</p>
            <p className="text-base font-bold text-gray-900 truncate">{card.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Filtros ───────────────────────────────────────────────────────── */}
      <div className="card-overlay rounded-2xl shadow-lg p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

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
                {campaigns.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Período */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Período atual (últimos 7 dias por padrão)
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

          {/* Veículos com ícones */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Veículos
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableVehicles.map((vehicle) => {
                const active = selectedVehicles.includes(vehicle)
                return (
                  <button
                    key={vehicle}
                    onClick={() => toggleVehicle(vehicle)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all border ${
                      active ? "border-transparent shadow-sm" : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                    style={active ? {
                      backgroundColor: (platformColors[vehicle] || "#6366f1") + "20",
                      borderColor: platformColors[vehicle] || "#6366f1",
                      color: platformColors[vehicle] || "#6366f1",
                    } : undefined}
                  >
                    <PlatformIcon platform={vehicle} className="w-3 h-3" />
                    {vehicle}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Gráfico + seletor de métrica ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" style={{ height: "380px" }}>

        {/* Gráfico */}
        <div className="lg:col-span-3 card-overlay rounded-2xl shadow-lg p-4 flex flex-col h-full">
          <h3 className="text-sm font-bold text-gray-800 mb-2">
            Comparativo — {selectedMetric === "views" ? "Visualizações" : selectedMetric.toUpperCase()}
          </h3>
          <div className="flex-1 min-h-0">
            {weeklyChartData.length > 0 && weeklyChartData.some((s) => s.data.length > 0) ? (
              <ResponsiveLine
                data={weeklyChartData}
                margin={{ top: 20, right: 30, bottom: 55, left: 75 }}
                xScale={{ type: "point" }}
                yScale={getChartScale()}
                curve="monotoneX"
                axisBottom={{ tickSize: 5, tickPadding: 10, tickRotation: -30 }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 8,
                  format: (v) => formatAxisLeft(v),
                }}
                colors={["#f59e0b", "#2563eb"]}
                lineWidth={2}
                pointSize={6}
                pointColor={{ theme: "background" }}
                pointBorderWidth={2}
                pointBorderColor={{ from: "serieColor" }}
                enableArea
                areaOpacity={0.12}
                defs={[
                  { id: "gA", type: "linearGradient", colors: [{ offset: 0, color: "#f59e0b", opacity: 0.3 }, { offset: 100, color: "#f59e0b", opacity: 0.05 }] },
                  { id: "gB", type: "linearGradient", colors: [{ offset: 0, color: "#2563eb", opacity: 0.3 }, { offset: 100, color: "#2563eb", opacity: 0.05 }] },
                ]}
                fill={[
                  { match: { id: "Período Anterior" }, id: "gA" },
                  { match: { id: "Período Atual" }, id: "gB" },
                ]}
                useMesh
                enableSlices="x"
                sliceTooltip={({ slice }) => (
                  <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-xs">
                    <p className="font-semibold text-gray-600 mb-1">{slice.points[0]?.data.x as string}</p>
                    {slice.points.map((point) => (
                      <p key={point.id} style={{ color: point.seriesColor }} className="font-bold">
                        {point.seriesId}: {formatValue(point.data.y as number)}
                      </p>
                    ))}
                  </div>
                )}
                legends={[{
                  anchor: "top-right",
                  direction: "row",
                  justify: false,
                  translateX: 0,
                  translateY: -18,
                  itemsSpacing: 12,
                  itemDirection: "left-to-right",
                  itemWidth: 110,
                  itemHeight: 16,
                  itemOpacity: 0.85,
                  symbolSize: 10,
                  symbolShape: "circle",
                }]}
                theme={{
                  axis: { ticks: { text: { fontSize: 10, fill: "#6b7280" } } },
                  grid: { line: { stroke: "#e5e7eb", strokeWidth: 1 } },
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                <div className="text-center">
                  <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Sem dados para o período</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Seletor de métrica + resumo */}
        <div className="card-overlay rounded-2xl shadow-lg p-4 flex flex-col h-full overflow-y-auto">
          <p className="text-xs font-bold text-gray-700 mb-2">Selecionar Métrica</p>
          <div className="space-y-1.5 flex-1">
            {([
              { key: "impressions", label: "Impressões", icon: TrendingUp },
              { key: "clicks",      label: "Cliques",    icon: MousePointer },
              { key: "views",       label: "Vídeos",     icon: Eye },
              { key: "cpm",         label: "CPM",        icon: DollarSign },
              { key: "cpc",         label: "CPC",        icon: DollarSign },
              { key: "cpv",         label: "CPV",        icon: DollarSign },
              { key: "ctr",         label: "CTR",        icon: BarChart3 },
              { key: "vtr",         label: "VTR",        icon: BarChart3 },
            ] as { key: typeof selectedMetric; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSelectedMetric(key)}
                className={`w-full px-3 py-2 rounded-xl text-left text-xs font-medium flex items-center gap-2 transition-all border-2 ${
                  selectedMetric === key
                    ? "bg-slate-700 text-white border-slate-700"
                    : "bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100"
                }`}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                {label}
                {selectedMetric === key && (
                  <span className="ml-auto text-slate-300 font-normal truncate">
                    {formatValue(weeklyComparison.current[key === "views" ? "views" : key as keyof WeeklyMetrics] as number)}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Resumo da métrica selecionada */}
          <div className="mt-3 p-3 bg-slate-700/10 rounded-2xl">
            <p className="text-xs font-bold text-gray-700 mb-2">Variação</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-blue-600 font-medium">Atual</span>
                <span className="font-bold text-gray-800">
                  {formatValue(weeklyComparison.current[selectedMetric === "views" ? "views" : selectedMetric as keyof WeeklyMetrics] as number)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-amber-600 font-medium">Anterior</span>
                <span className="font-bold text-gray-600">
                  {formatValue(weeklyComparison.previous[selectedMetric === "views" ? "views" : selectedMetric as keyof WeeklyMetrics] as number)}
                </span>
              </div>
              <div className="flex justify-between text-xs pt-1.5 border-t border-gray-200">
                <span className="text-gray-500">Δ</span>
                <span className={`font-bold ${deltaColor(weeklyComparison.comparison[selectedMetric], ["cpm", "cpc", "cpv"].includes(selectedMetric))}`}>
                  {weeklyComparison.comparison[selectedMetric] > 0 ? "+" : ""}
                  {weeklyComparison.comparison[selectedMetric].toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default AnaliseSemanal
