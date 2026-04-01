"use client"

import type React from "react"
import { useState, useEffect, useMemo, useRef } from "react"
import { ResponsiveLine } from "@nivo/line"
import { Calendar, Filter, TrendingUp, Play, Info, DollarSign, MousePointer, Eye, BarChart3, Users } from "lucide-react"
import { useData } from "../../contexts/DataContext"
import Loading from "../../components/Loading/Loading"
import PDFDownloadButton from "../../components/PDFDownloadButton/PDFDownloadButton"
import AnaliseSemanal from "./components/AnaliseSemanal"

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
  leads: number
  veiculo: string
  tipoCompra: string
}

interface ChartData {
  id: string
  data: Array<{ x: string; y: number }>
}

interface VehicleEntry {
  platform: string
  firstDate: string
  color: string
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

const LinhaTempo: React.FC = () => {
  const contentRef = useRef<HTMLDivElement>(null)
  const { data, campaigns, loading, error } = useData()
  const [processedData, setProcessedData] = useState<DataPoint[]>([])
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" })
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [availableVehicles, setAvailableVehicles] = useState<string[]>([])
  const [isWeeklyAnalysis, setIsWeeklyAnalysis] = useState(false)
  const [filteredData, setFilteredData] = useState<DataPoint[]>([])
  const [selectedMetric, setSelectedMetric] = useState<
    "impressions" | "clicks" | "totalSpent" | "videoViews" | "leads" | "cpm" | "cpc" | "ctr" | "vtr"
  >("impressions")

  const platformColors = useMemo<Record<string, string>>(() => ({
    TikTok: "#000000",
    "LinkedIn Ads": "#0077b5",
    LinkedIn: "#0077b5",
    Meta: "#0668E1",
    Instagram: "#bc06e1",
    Facebook: "#0668E1",
    Spotify: "#1DB954",
    Band: "#ffd700",
    "Brasil 247": "#ff4500",
    GDN: "#4285f4",
    "Demand-Gen": "#34a853",
    "Portal Forum": "#8b4513",
    YouTube: "#ff0000",
    Pinterest: "#bd081c",
    Kwai: "#ff8000",
    Default: "#6366f1",
  }), [])

  const createLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date()
    const parts = dateStr.split("-")
    if (parts.length !== 3) return new Date()
    const [year, month, day] = parts
    return new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
  }

  useEffect(() => {
    if (data?.success && data?.data?.values) {
      const headers = data.data.values[0]
      const rows = data.data.values.slice(1)

      const parseNumber = (value: string | number) => {
        if (!value || value === "") return 0
        const s = value.toString().replace(/R\$\s*/g, "").replace(/\./g, "").replace(",", ".").trim()
        const n = Number.parseFloat(s)
        return isNaN(n) ? 0 : n
      }
      const parseInteger = (value: string | number) => {
        if (!value || value === "") return 0
        const s = value.toString().replace(/\./g, "").trim()
        const n = Number.parseInt(s)
        return isNaN(n) ? 0 : n
      }
      const parseDate = (dateStr: string) => {
        if (!dateStr) return ""
        const parts = dateStr.split("/")
        if (parts.length !== 3) return ""
        const [day, month, year] = parts
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
      }

      const dateIndex = headers.indexOf("Date")
      const campaignNameIndex = headers.indexOf("Campanha Nome")
      const creativeTitleIndex = headers.indexOf("Criativo nome")
      const reachIndex = headers.indexOf("Reach")
      const impressionsIndex = headers.indexOf("Impressions")
      const clicksIndex = headers.indexOf("Clicks")
      const totalSpentIndex = headers.indexOf("Total spent")
      const videoViewsIndex = headers.indexOf("Video views")
      const videoViews25Index = headers.indexOf("Video views at 25%")
      const videoViews50Index = headers.indexOf("Video views at 50%")
      const videoViews75Index = headers.indexOf("Video views at 75%")
      const videoCompletionsIndex = headers.indexOf("Video completions")
      const totalEngagementsIndex = headers.indexOf("Total engagements")
      const leadsIndex = headers.indexOf("Leads")
      const veiculoIndex = headers.indexOf("Veículo")
      const tipoCompraIndex = headers.indexOf("Tipo de Compra")

      const processed: DataPoint[] = rows
        .map((row: string[]) => {
          if (dateIndex === -1 || !row[dateIndex] || row[dateIndex] === "") return null
          const hasImpressions = row[impressionsIndex] && row[impressionsIndex] !== ""
          const hasSpent = row[totalSpentIndex] && row[totalSpentIndex] !== ""
          if (!hasImpressions && !hasSpent) return null

          const rawVeiculo = row[veiculoIndex] || "Outros"
          const normalizedVeiculo = (() => {
            const lower = rawVeiculo.toLowerCase()
            if (["audience network", "unknown", "threads", "messenger"].includes(lower)) return "Facebook"
            return rawVeiculo
          })()

          return {
            date: parseDate(row[dateIndex]),
            campaignName: row[campaignNameIndex] || "",
            creativeTitle: row[creativeTitleIndex] || "",
            platform: normalizedVeiculo,
            reach: parseInteger(row[reachIndex]),
            impressions: parseInteger(row[impressionsIndex]),
            clicks: parseInteger(row[clicksIndex]),
            totalSpent: parseNumber(row[totalSpentIndex]),
            videoViews: parseInteger(row[videoViewsIndex]),
            videoViews25: parseInteger(row[videoViews25Index]),
            videoViews50: parseInteger(row[videoViews50Index]),
            videoViews75: parseInteger(row[videoViews75Index]),
            videoCompletions: parseInteger(row[videoCompletionsIndex]),
            totalEngagements: parseInteger(row[totalEngagementsIndex]),
            leads: parseInteger(row[leadsIndex]),
            veiculo: normalizedVeiculo,
            tipoCompra: row[tipoCompraIndex] || "",
          } as DataPoint
        })
        .filter(Boolean) as DataPoint[]

      processed.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      setProcessedData(processed)

      if (processed.length > 0) {
        const dates = processed.map((i) => i.date).filter((d) => d.match(/^\d{4}-\d{2}-\d{2}$/)).sort()
        if (dates.length > 0) setDateRange({ start: dates[0], end: dates[dates.length - 1] })
      }

      const vehicleSet = new Set<string>()
      processed.forEach((i) => { if (i.platform?.trim()) vehicleSet.add(i.platform) })
      setAvailableVehicles(Array.from(vehicleSet).filter(Boolean))
      setSelectedVehicles([])
    }
  }, [data])

  useEffect(() => {
    if (processedData.length > 0) {
      let filtered = processedData
      if (dateRange.start && dateRange.end) {
        filtered = filtered.filter((i) => {
          const d = new Date(i.date)
          return d >= new Date(dateRange.start) && d <= new Date(dateRange.end)
        })
      }
      if (selectedCampaign) filtered = filtered.filter((i) => i.campaignName === selectedCampaign)
      setFilteredData(filtered)
    } else {
      setFilteredData([])
    }
  }, [processedData, dateRange, selectedCampaign])

  const chartData: ChartData[] = useMemo(() => {
    const calc = (dayData: DataPoint[], metric: typeof selectedMetric): number => {
      if (!dayData.length) return 0
      const totalCost = dayData.reduce((s, i) => s + i.totalSpent, 0)
      const totalImp = dayData.reduce((s, i) => s + i.impressions, 0)
      const totalClicks = dayData.reduce((s, i) => s + i.clicks, 0)
      const totalViews = dayData.reduce((s, i) => s + (i.videoViews || i.videoCompletions || 0), 0)
      const totalLeads = dayData.reduce((s, i) => s + i.leads, 0)
      switch (metric) {
        case "impressions": return totalImp
        case "clicks": return totalClicks
        case "totalSpent": return totalCost
        case "videoViews": return totalViews
        case "leads": return totalLeads
        case "cpm": return totalImp > 0 ? (totalCost / totalImp) * 1000 : 0
        case "cpc": return totalClicks > 0 ? totalCost / totalClicks : 0
        case "ctr": return totalImp > 0 ? (totalClicks / totalImp) * 100 : 0
        case "vtr": return totalImp > 0 ? (totalViews / totalImp) * 100 : 0
        default: return 0
      }
    }

    if (selectedVehicles.length === 0) {
      const grouped = filteredData.reduce((acc, i) => {
        if (!acc[i.date]) acc[i.date] = []
        acc[i.date].push(i)
        return acc
      }, {} as Record<string, DataPoint[]>)
      return [{
        id: selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1),
        data: Object.entries(grouped)
          .map(([date, d]) => ({ x: date, y: calc(d, selectedMetric) }))
          .sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime()),
      }]
    }

    return selectedVehicles.map((vehicle) => {
      const byDate: Record<string, DataPoint[]> = {}
      filteredData.filter((i) => i.platform === vehicle).forEach((i) => {
        if (!byDate[i.date]) byDate[i.date] = []
        byDate[i.date].push(i)
      })
      return {
        id: vehicle,
        data: Object.entries(byDate)
          .map(([date, d]) => ({ x: date, y: calc(d, selectedMetric) }))
          .sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime()),
      }
    }).sort((a, b) => a.id.localeCompare(b.id))
  }, [filteredData, selectedVehicles, selectedMetric])

  const vehicleEntries: VehicleEntry[] = useMemo(() => {
    const entries: Record<string, string> = {}
    filteredData.forEach((i) => {
      if (!entries[i.platform] || new Date(i.date) < new Date(entries[i.platform])) entries[i.platform] = i.date
    })
    return Object.entries(entries)
      .map(([platform, date]) => ({ platform, firstDate: date, color: platformColors[platform] || platformColors.Default }))
      .sort((a, b) => new Date(a.firstDate).getTime() - new Date(b.firstDate).getTime())
  }, [filteredData, platformColors])

  // ── Métricas totais do período ────────────────────────────────────────────
  const totals = useMemo(() => {
    const spent = filteredData.reduce((s, i) => s + i.totalSpent, 0)
    const impressions = filteredData.reduce((s, i) => s + i.impressions, 0)
    const clicks = filteredData.reduce((s, i) => s + i.clicks, 0)
    const videoViews = filteredData.reduce((s, i) => s + i.videoViews, 0)
    const leads = filteredData.reduce((s, i) => s + i.leads, 0)
    const engagements = filteredData.reduce((s, i) => s + i.totalEngagements, 0)
    const cpm = impressions > 0 ? (spent / impressions) * 1000 : 0
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
    const cpl = leads > 0 ? spent / leads : 0
    return { spent, impressions, clicks, videoViews, leads, engagements, cpm, ctr, cpl }
  }, [filteredData])

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

  const formatNumber = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".", ",")} mi`
    if (v >= 1_000) return `${(v / 1_000).toFixed(1).replace(".", ",")} mil`
    return v.toLocaleString("pt-BR")
  }

  const formatChartValue = (value: number): string => {
    if (["totalSpent", "cpm", "cpc"].includes(selectedMetric)) return formatCurrency(value)
    if (["ctr", "vtr"].includes(selectedMetric)) return `${value.toFixed(2)}%`
    return formatNumber(value)
  }

  const formatChartTick = (v: number | string): string => {
    const n = typeof v === "string" ? parseFloat(v) : v
    if (["totalSpent", "cpm", "cpc"].includes(selectedMetric)) {
      if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1).replace(".", ",")} mi`
      if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(0)} mil`
      return formatCurrency(n)
    }
    if (["ctr", "vtr"].includes(selectedMetric)) return `${n.toFixed(1)}%`
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} mi`
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)} mil`
    return n.toLocaleString("pt-BR")
  }

  const toggleVehicle = (vehicle: string) => {
    setSelectedVehicles((prev) =>
      prev.includes(vehicle) ? prev.filter((v) => v !== vehicle) : [...prev, vehicle]
    )
  }

  if (loading) return <Loading message="Carregando dados da linha do tempo..." />

  if (error) {
    return (
      <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-2xl p-4">
        <p className="text-red-600">Erro ao carregar dados: {error.message}</p>
      </div>
    )
  }

  if (isWeeklyAnalysis) {
    return (
      <div className="space-y-4">
        <AnaliseSemanal
          processedData={processedData}
          availableVehicles={availableVehicles}
          platformColors={platformColors}
          campaigns={campaigns}
          onBack={() => setIsWeeklyAnalysis(false)}
        />
      </div>
    )
  }

  return (
    <div ref={contentRef} className="space-y-4 flex flex-col max-h-screen overflow-y-auto">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl shadow-2xl h-36">
        <video className="w-full h-full object-cover" autoPlay loop muted playsInline>
          <source src="/images/jetour-hero.mp4" media="(min-width: 768px)" type="video/mp4" />
          <source src="/images/Jetour_Hero_Mobile.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg flex items-center gap-4 max-w-2xl">
            <img src="/images/Jetour_logo.svg" alt="Jetour" className="h-7 object-contain" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">Linha do Tempo</h1>
              <p className="text-xs text-gray-500">Evolução de métricas por período</p>
            </div>
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => setIsWeeklyAnalysis(true)}
                className="px-3 py-1.5 border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-xs font-medium"
              >
                Análise Semanal
              </button>
              <PDFDownloadButton contentRef={contentRef} fileName="linha-tempo" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Big numbers ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 lg:grid-cols-9 gap-2">
        {[
          { label: "Investimento", value: formatCurrency(totals.spent) },
          { label: "Impressões",   value: formatNumber(totals.impressions) },
          { label: "Cliques",      value: formatNumber(totals.clicks) },
          { label: "Visualizações",       value: formatNumber(totals.videoViews) },
          { label: "Leads",        value: formatNumber(totals.leads) },
          { label: "Engajamentos", value: formatNumber(totals.engagements) },
          { label: "CPM",          value: formatCurrency(totals.cpm) },
          { label: "CTR",          value: `${totals.ctr.toFixed(2)}%` },
          { label: "CPL",          value: totals.leads > 0 ? formatCurrency(totals.cpl) : "—" },
        ].map((item) => (
          <div key={item.label} className="bg-slate-700/80 rounded-2xl p-2 text-center shadow-sm">
            <p className="text-xs text-slate-300 font-medium leading-tight">{item.label}</p>
            <p className="text-sm font-bold text-white truncate">{item.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filtros ───────────────────────────────────────────────────────── */}
      <div className="card-overlay rounded-2xl shadow-lg p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

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

          {/* Veículos — com ícones */}
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
                      backgroundColor: (platformColors[vehicle] || platformColors.Default) + "20",
                      borderColor: platformColors[vehicle] || platformColors.Default,
                      color: platformColors[vehicle] || platformColors.Default,
                    } : undefined}
                  >
                    <PlatformIcon platform={vehicle} className="w-3 h-3" />
                    {vehicle}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Métricas */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
              <BarChart3 className="w-3.5 h-3.5" /> Métrica
            </label>
            <div className="flex flex-wrap gap-1.5">
              {([
                { key: "impressions", label: "Impressões" },
                { key: "totalSpent",  label: "Investimento" },
                { key: "videoViews",  label: "Visualizações" },
                { key: "clicks",      label: "Cliques" },
                { key: "leads",       label: "Leads" },
                { key: "cpm",         label: "CPM" },
                { key: "cpc",         label: "CPC" },
                { key: "ctr",         label: "CTR" },
                { key: "vtr",         label: "VTR" },
              ] as { key: typeof selectedMetric; label: string }[]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSelectedMetric(key)}
                  className={`px-2 py-1 rounded-full text-xs font-medium transition-colors border ${
                    selectedMetric === key
                      ? "bg-slate-700 text-white border-slate-700"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Gráfico + Entrada de Veículos ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" style={{ height: "440px" }}>

        {/* Gráfico */}
        <div className="lg:col-span-3 card-overlay rounded-2xl shadow-lg p-4 flex flex-col h-full">
          <h3 className="text-sm font-bold text-gray-800 mb-2">
            Evolução — {selectedMetric === "totalSpent" ? "Investimento" : selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}
          </h3>
          <div className="flex-1 min-h-0">
            {chartData.length > 0 && chartData.some((s) => s.data.length > 0) ? (
              <ResponsiveLine
                data={chartData}
                margin={{ top: 20, right: 30, bottom: 70, left: 80 }}
                xScale={{ type: "point" }}
                yScale={{ type: "linear", min: "auto", max: "auto" }}
                curve="monotoneX"
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 10,
                  tickRotation: -45,
                  tickValues: (() => {
                    const pts = chartData[0]?.data || []
                    const n = pts.length
                    if (n <= 7) return pts.map((d) => d.x)
                    if (n <= 31) return pts.filter((_, i) => i % 3 === 0).map((d) => d.x)
                    if (n <= 90) return pts.filter((_, i) => i % 7 === 0).map((d) => d.x)
                    return pts.filter((_, i) => i % 15 === 0).map((d) => d.x)
                  })(),
                  format: (v) => {
                    const parts = (v as string).split("-")
                    if (parts.length !== 3) return v as string
                    const [year, month, day] = parts
                    const totalDays = chartData[0]?.data.length || 0
                    if (totalDays > 90) {
                      const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
                      return `${months[parseInt(month) - 1]}/${year}`
                    }
                    return `${day.padStart(2,"0")}/${month.padStart(2,"0")}`
                  },
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 8,
                  format: (v) => formatChartTick(v),
                }}
                colors={selectedVehicles.length > 0
                  ? (serie) => platformColors[serie.id] || platformColors.Default
                  : ["#334155"]
                }
                lineWidth={2}
                pointSize={5}
                pointColor={{ theme: "background" }}
                pointBorderWidth={2}
                pointBorderColor={{ from: "serieColor" }}
                enableArea
                areaOpacity={0.08}
                useMesh
                enableSlices="x"
                sliceTooltip={({ slice }) => (
                  <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-xs">
                    <p className="font-semibold text-gray-600 mb-1">{slice.points[0]?.data.x as string}</p>
                    {slice.points.map((point) => (
                      <p key={point.id} className="font-bold text-gray-900">
                        {point.seriesId}: {formatChartValue(point.data.y as number)}
                      </p>
                    ))}
                  </div>
                )}
                legends={selectedVehicles.length > 0 ? [{
                  anchor: "top-right",
                  direction: "row",
                  justify: false,
                  translateX: 0,
                  translateY: -18,
                  itemsSpacing: 10,
                  itemDirection: "left-to-right",
                  itemWidth: 100,
                  itemHeight: 18,
                  itemOpacity: 0.85,
                  symbolSize: 10,
                  symbolShape: "circle",
                }] : []}
                theme={{
                  axis: { ticks: { text: { fontSize: 10, fill: "#6b7280" } } },
                  grid: { line: { stroke: "#e5e7eb", strokeWidth: 1 } },
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                <div className="text-center">
                  <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Nenhum dado para o período selecionado</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Entrada de Veículos — com ícones */}
        <div className="card-overlay rounded-2xl shadow-lg p-4 flex flex-col h-full">
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2 flex-shrink-0">
            <Info className="w-4 h-4" /> Entrada de Veículos
          </h3>
          <div className="overflow-y-auto space-y-2 flex-1">
            {vehicleEntries.map((entry, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all border-2 ${
                  selectedVehicles.includes(entry.platform)
                    ? "border-current shadow-sm"
                    : "border-transparent hover:bg-gray-50"
                }`}
                style={selectedVehicles.includes(entry.platform)
                  ? { backgroundColor: entry.color + "15", borderColor: entry.color }
                  : undefined
                }
                onClick={() => toggleVehicle(entry.platform)}
              >
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0 ${platformColor(entry.platform)}`}
                >
                  <PlatformIcon platform={entry.platform} className="w-3.5 h-3.5" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{entry.platform}</p>
                  <p className="text-xs text-gray-400">
                    {createLocalDate(entry.firstDate).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Play className="w-3 h-3 flex-shrink-0" style={{ color: entry.color }} />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

export default LinhaTempo
