"use client"

import type React from "react"
import { useMemo, useState, useRef } from "react"
import { ResponsiveLine } from "@nivo/line"
import {
  DollarSign,
  Eye,
  MousePointerClick,
  Play,
  BarChart3,
  Users,
  Globe,
} from "lucide-react"
import { useConsolidadoGeral, parseBrazilianCurrency, useGA4 } from "../../services/consolidadoApi"
import Loading from "../../components/Loading/Loading"

type MetricType = "impressions" | "clicks" | "videoViews" | "spent" | "leads" | "sessions"

const Capa: React.FC = () => {
  const {
    campaigns,
    last7Days,
    loading,
    error,
    data: consolidadoData,
  } = useConsolidadoGeral()
  const { data: ga4Data } = useGA4()

  const [selectedMetric, setSelectedMetric] = useState<MetricType>("impressions")
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const pillRef = useRef<HTMLButtonElement>(null)
  const [filterStart, setFilterStart] = useState<string>("") // "YYYY-MM-DD"
  const [filterEnd, setFilterEnd] = useState<string>("")     // "YYYY-MM-DD"

  // ── Helpers de data ───────────────────────────────────────────────────────
  const parseRowDate = (dateStr: string): Date | null => {
    const parts = dateStr.split("/")
    if (parts.length !== 3) return null
    const [day, month, year] = parts
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  }

  const formatDateBR = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`

  const toInputValue = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${y}-${m}-${day}`
  }

  // ── Intervalo de datas real da planilha ───────────────────────────────────
  const dataDateRange = useMemo(() => {
    if (!consolidadoData?.success || !consolidadoData?.data?.values) return null
    const headers = consolidadoData.data.values[0]
    const dateIdx = headers.indexOf("Date")
    if (dateIdx === -1) return null

    let min: Date | null = null
    let max: Date | null = null
    for (const row of consolidadoData.data.values.slice(1)) {
      if (!row[dateIdx]) continue
      const d = parseRowDate(row[dateIdx])
      if (!d) continue
      if (!min || d < min) min = d
      if (!max || d > max) max = d
    }
    if (!min || !max) return null
    return { min, max }
  }, [consolidadoData])

  // Inicializa os inputs com o intervalo real quando os dados chegam
  const activeStart = filterStart || (dataDateRange ? toInputValue(dataDateRange.min) : "")
  const activeEnd   = filterEnd   || (dataDateRange ? toInputValue(dataDateRange.max) : "")

  const activeStartDate = activeStart ? new Date(activeStart + "T00:00:00") : null
  const activeEndDate   = activeEnd   ? new Date(activeEnd   + "T00:00:00") : null

  const isFiltered =
    dataDateRange &&
    activeStartDate && activeEndDate &&
    (activeStartDate.getTime() !== dataDateRange.min.getTime() ||
     activeEndDate.getTime()   !== dataDateRange.max.getTime())

  // ── Totais gerais do consolidado (com filtro de data) ─────────────────────
  const totaisGerais = useMemo(() => {
    if (!consolidadoData?.success || !consolidadoData?.data?.values) {
      return { spent: 0, impressions: 0, clicks: 0, videoViews: 0, leads: 0 }
    }
    const headers = consolidadoData.data.values[0]
    const rows = consolidadoData.data.values.slice(1)

    const dateIdx = headers.indexOf("Date")
    const spentIdx = headers.indexOf("Total spent")
    const impressionsIdx = headers.indexOf("Impressions")
    const clicksIdx = headers.indexOf("Clicks")
    const videoViewsIdx = headers.indexOf("Video views")
    const leadsIdx = headers.indexOf("Leads")

    return rows.reduce(
      (acc, row) => {
        if (activeStartDate && activeEndDate && dateIdx !== -1 && row[dateIdx]) {
          const d = parseRowDate(row[dateIdx])
          if (!d || d < activeStartDate || d > activeEndDate) return acc
        }
        return {
          spent: acc.spent + parseBrazilianCurrency(row[spentIdx] || "0"),
          impressions: acc.impressions + (parseFloat(row[impressionsIdx]) || 0),
          clicks: acc.clicks + (parseFloat(row[clicksIdx]) || 0),
          videoViews: acc.videoViews + (parseFloat(row[videoViewsIdx]) || 0),
          leads: acc.leads + (parseFloat(row[leadsIdx]) || 0),
        }
      },
      { spent: 0, impressions: 0, clicks: 0, videoViews: 0, leads: 0 }
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consolidadoData, activeStart, activeEnd])

  // ── Total de Sessões do GA4 (com filtro de data) ──────────────────────────
  const totalSessoesGA = useMemo(() => {
    if (!ga4Data?.success || !ga4Data?.data?.values || ga4Data.data.values.length < 2) return 0
    const headers = ga4Data.data.values[0]
    const sessionsIdx = headers.indexOf("Sessions")
    const dateIdx = headers.indexOf("Date")
    if (sessionsIdx === -1) return 0

    // GA4 pode usar dd/mm/yyyy ou formato ISO (yyyy-mm-dd)
    const parseGA4Date = (s: string): Date | null => {
      const parts = s.split("/")
      if (parts.length === 3) return new Date(+parts[2], +parts[1] - 1, +parts[0])
      const d = new Date(s)
      return isNaN(d.getTime()) ? null : d
    }

    return ga4Data.data.values.slice(1).reduce((acc, row) => {
      if (activeStartDate && activeEndDate && dateIdx !== -1 && row[dateIdx]) {
        const d = parseGA4Date(row[dateIdx])
        if (!d || d < activeStartDate || d > activeEndDate) return acc
      }
      const val = row[sessionsIdx] || "0"
      return acc + (parseFloat(val.replace(/\./g, "").replace(",", ".")) || 0)
    }, 0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ga4Data, activeStart, activeEnd])

  // ── Sessões GA4 por dia (dd/mm/yyyy) ─────────────────────────────────────
  const ga4SessionsByDay = useMemo(() => {
    const map = new Map<string, number>()
    if (!ga4Data?.success || !ga4Data?.data?.values || ga4Data.data.values.length < 2) return map
    const headers = ga4Data.data.values[0]
    const sessionsIdx = headers.indexOf("Sessions")
    const dateIdx = headers.indexOf("Date")
    if (sessionsIdx === -1 || dateIdx === -1) return map
    ga4Data.data.values.slice(1).forEach((row) => {
      if (!row[dateIdx]) return
      // normaliza para dd/mm/yyyy
      let key = row[dateIdx] as string
      if (key.includes("-")) {
        const [y, m, d] = key.split("-")
        key = `${d}/${m}/${y}`
      }
      const val = parseFloat((row[sessionsIdx] || "0").replace(/\./g, "").replace(",", ".")) || 0
      map.set(key, (map.get(key) || 0) + val)
    })
    return map
  }, [ga4Data])

  // ── Métricas do gráfico (filtro de data + campanha) ───────────────────────
  const filteredLast7Days = useMemo(() => {
    if (!consolidadoData?.success || !consolidadoData?.data?.values) return last7Days

    const headers = consolidadoData.data.values[0]
    const rows = consolidadoData.data.values.slice(1)

    const dateIdx = headers.indexOf("Date")
    const campaignIdx = headers.indexOf("Campanha Nome")
    const spentIdx = headers.indexOf("Total spent")
    const impressionsIdx = headers.indexOf("Impressions")
    const clicksIdx = headers.indexOf("Clicks")
    const videoViewsIdx = headers.indexOf("Video views")
    const leadsIdx = headers.indexOf("Leads")

    // Intervalo: usa filtro do usuário se definido, senão últimos 7 dias
    let chartStart: Date
    let chartEnd: Date
    if (activeStartDate && activeEndDate && isFiltered) {
      chartStart = activeStartDate
      chartEnd = activeEndDate
    } else {
      chartEnd = new Date()
      chartEnd.setDate(chartEnd.getDate() - 1)
      chartEnd.setHours(0, 0, 0, 0)
      chartStart = new Date(chartEnd)
      chartStart.setDate(chartEnd.getDate() - 6)
      chartStart.setHours(0, 0, 0, 0)
    }

    const map = new Map<string, { date: string; impressions: number; clicks: number; videoViews: number; spent: number; leads: number; sessions: number }>()

    rows.forEach((row) => {
      if (!row[dateIdx]) return
      if (selectedCampaign && row[campaignIdx] !== selectedCampaign) return
      const rowDate = parseRowDate(row[dateIdx])
      if (!rowDate) return
      rowDate.setHours(0, 0, 0, 0)
      if (rowDate < chartStart || rowDate > chartEnd) return

      const key = row[dateIdx]
      if (!map.has(key)) map.set(key, { date: key, impressions: 0, clicks: 0, videoViews: 0, spent: 0, leads: 0, sessions: 0 })
      const m = map.get(key)!
      m.impressions += parseFloat(row[impressionsIdx]) || 0
      m.clicks += parseFloat(row[clicksIdx]) || 0
      m.videoViews += parseFloat(row[videoViewsIdx]) || 0
      m.spent += parseBrazilianCurrency(row[spentIdx] || "0")
      m.leads += parseFloat(row[leadsIdx]) || 0
    })

    // Injeta sessões do GA4 em cada dia
    map.forEach((val, key) => { val.sessions = ga4SessionsByDay.get(key) || 0 })

    const sorted = Array.from(map.values()).sort((a, b) => {
      const [dA, mA, yA] = a.date.split("/").map(Number)
      const [dB, mB, yB] = b.date.split("/").map(Number)
      return new Date(yA, mA - 1, dA).getTime() - new Date(yB, mB - 1, dB).getTime()
    })

    if (!isFiltered && !selectedCampaign) {
      // enriquece o last7Days com sessões
      return last7Days.map((d) => ({ ...d, sessions: ga4SessionsByDay.get(d.date) || 0 }))
    }

    return sorted
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCampaign, consolidadoData, last7Days, activeStart, activeEnd, isFiltered, ga4SessionsByDay])

  // ── Big numbers dos últimos 7 dias ────────────────────────────────────────
  const last7Totals = useMemo(() => {
    const totals = filteredLast7Days.reduce(
      (acc, day) => ({
        spent: acc.spent + day.spent,
        impressions: acc.impressions + day.impressions,
        clicks: acc.clicks + day.clicks,
        videoViews: acc.videoViews + day.videoViews,
        leads: acc.leads + day.leads,
      }),
      { spent: 0, impressions: 0, clicks: 0, videoViews: 0, leads: 0 }
    )
    const cpm = totals.impressions > 0 ? (totals.spent / totals.impressions) * 1000 : 0
    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0
    const cpl = totals.leads > 0 ? totals.spent / totals.leads : 0
    return { ...totals, cpm, ctr, cpl }
  }, [filteredLast7Days])

  // ── Gráfico ───────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (!filteredLast7Days.length) return []
    const labels: Record<MetricType, string> = {
      impressions: "Impressões",
      clicks: "Cliques",
      videoViews: "Visualizações",
      spent: "Investimento",
      leads: "Leads",
      sessions: "Sessões GA",
    }
    return [
      {
        id: labels[selectedMetric],
        data: filteredLast7Days.map((day) => ({ x: day.date, y: (day as any)[selectedMetric] ?? 0 })),
      },
    ]
  }, [filteredLast7Days, selectedMetric])

  // Ticks do eixo X: limita a ~10 labels para não poluir
  const xTickValues = useMemo(() => {
    const dates = chartData[0]?.data.map((d) => d.x) ?? []
    if (dates.length <= 10) return dates
    const step = Math.ceil(dates.length / 10)
    return dates.filter((_, i) => i % step === 0 || i === dates.length - 1)
  }, [chartData])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

  // Abreviações no padrão BR: mil / mi (em vez de K / M)
  const formatNumber = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".", ",")} mi`
    if (v >= 1_000) return `${(v / 1_000).toFixed(1).replace(".", ",")} mil`
    return v.toLocaleString("pt-BR")
  }

  // Formata o valor do eixo Y do gráfico conforme a métrica selecionada
  const formatChartTick = (v: number | string): string => {
    const n = typeof v === "string" ? parseFloat(v) : v
    if (selectedMetric === "spent") {
      if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1).replace(".", ",")} mi`
      if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(0).replace(".", ",")} mil`
      return formatCurrency(n)
    }
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} mi`
    if (n >= 1_000) return `${(n / 1_000).toFixed(0).replace(".", ",")} mil`
    return n.toLocaleString("pt-BR")
  }

  // Formata o tooltip do gráfico (valor completo)
  const formatChartTooltip = (v: number): string => {
    if (selectedMetric === "spent") return formatCurrency(v)
    return v.toLocaleString("pt-BR")
  }

  const activeCampaigns = campaigns.filter((c) => c.isActive)

  // ── Ícones por plataforma (reutilizados do Sidebar) ───────────────────────
  const platformIcon = (platform: string) => {
    const p = platform.toLowerCase()
    if (p.includes("instagram") || p.includes("facebook") || p.includes("meta")) {
      return (
        <svg className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" fill="currentColor">
          <path d="M47.3,21.01c-0.58-1.6-1.3-3.16-2.24-4.66c-0.93-1.49-2.11-2.93-3.63-4.13c-1.51-1.19-3.49-2.09-5.59-2.26l-0.78-0.04c-0.27,0.01-0.57,0.01-0.85,0.04c-0.57,0.06-1.11,0.19-1.62,0.34c-1.03,0.32-1.93,0.8-2.72,1.32c-1.42,0.94-2.55,2.03-3.57,3.15c0.01,0.02,0.03,0.03,0.04,0.05l0.22,0.28c0.51,0.67,1.62,2.21,2.61,3.87c1.23-1.2,2.83-2.65,3.49-3.07c0.5-0.31,0.99-0.55,1.43-0.68c0.23-0.06,0.44-0.11,0.64-0.12c0.1-0.02,0.19-0.01,0.3-0.02l0.38,0.02c0.98,0.09,1.94,0.49,2.85,1.19c1.81,1.44,3.24,3.89,4.17,6.48c0.95,2.6,1.49,5.44,1.52,8.18c0,1.31-0.17,2.57-0.57,3.61c-0.39,1.05-1.38,1.45-2.5,1.45c-1.63,0-2.81-0.7-3.76-1.68c-1.04-1.09-2.02-2.31-2.96-3.61c-0.78-1.09-1.54-2.22-2.26-3.37c-1.27-2.06-2.97-4.67-4.15-6.85L25,16.35c-0.31-0.39-0.61-0.78-0.94-1.17c-1.11-1.26-2.34-2.5-3.93-3.56c-0.79-0.52-1.69-1-2.72-1.32c-0.51-0.15-1.05-0.28-1.62-0.34c-0.18-0.02-0.36-0.03-0.54-0.03c-0.11,0-0.21-0.01-0.31-0.01l-0.78,0.04c-2.1,0.17-4.08,1.07-5.59,2.26c-1.52,1.2-2.7,2.64-3.63,4.13C4,17.85,3.28,19.41,2.7,21.01c-1.13,3.2-1.74,6.51-1.75,9.93c0.01,1.78,0.24,3.63,0.96,5.47c0.7,1.8,2.02,3.71,4.12,4.77c1.03,0.53,2.2,0.81,3.32,0.81c1.23,0.03,2.4-0.32,3.33-0.77c1.87-0.93,3.16-2.16,4.33-3.4c2.31-2.51,4.02-5.23,5.6-8c0.44-0.76,0.86-1.54,1.27-2.33c-0.21-0.41-0.42-0.84-0.64-1.29c-0.62-1.03-1.39-2.25-1.95-3.1c-0.83,1.5-1.69,2.96-2.58,4.41c-1.59,2.52-3.3,4.97-5.21,6.98c-0.95,0.98-2,1.84-2.92,2.25c-0.47,0.2-0.83,0.27-1.14,0.25c-0.43,0-0.79-0.1-1.13-0.28c-0.67-0.35-1.3-1.1-1.69-2.15c-0.4-1.04-0.57-2.3-0.57-3.61c0.03-2.74,0.57-5.58,1.52-8.18c0.93-2.59,2.36-5.04,4.17-6.48c0.91-0.7,1.87-1.1,2.85-1.19l0.38-0.02c0.11,0.01,0.2,0,0.3,0.02c0.2,0.01,0.41,0.06,0.64,0.12c0.26,0.08,0.54,0.19,0.83,0.34c0.2,0.1,0.4,0.21,0.6,0.34c1,0.64,1.99,1.58,2.92,2.62c0.72,0.81,1.41,1.71,2.1,2.63L25,25.24c0.75,1.55,1.53,3.09,2.39,4.58c1.58,2.77,3.29,5.49,5.6,8c0.68,0.73,1.41,1.45,2.27,2.1c0.61,0.48,1.28,0.91,2.06,1.3c0.93,0.45,2.1,0.8,3.33,0.77c1.12,0,2.29-0.28,3.32-0.81c2.1-1.06,3.42-2.97,4.12-4.77c0.72-1.84,0.95-3.69,0.96-5.47C49.04,27.52,48.43,24.21,47.3,21.01z" />
        </svg>
      )
    }
    if (p.includes("tiktok")) {
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </svg>
      )
    }
    if (p.includes("linkedin")) {
      return (
        <svg className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" fill="currentColor">
          <path d="M41,4H9C6.24,4,4,6.24,4,9v32c0,2.76,2.24,5,5,5h32c2.76,0,5-2.24,5-5V9C46,6.24,43.76,4,41,4z M17,20v19h-6V20H17z M11,14.47c0-1.4,1.2-2.47,3-2.47s2.93,1.07,3,2.47c0,1.4-1.12,2.53-3,2.53C12.2,17,11,15.87,11,14.47z M39,39h-6c0,0,0-9.26,0-10c0-2-1-4-3.5-4.04h-0.08C27,24.96,26,27.02,26,29c0,0.91,0,10,0,10h-6V20h6v2.56c0,0,1.93-2.56,5.81-2.56c3.97,0,7.19,2.73,7.19,8.26V39z" />
        </svg>
      )
    }
    if (p.includes("kwai")) {
      return <img className="w-3.5 h-3.5" src="https://www.svgrepo.com/show/517319/kwai.svg" alt="Kwai" />
    }
    if (p.includes("google") || p.includes("youtube")) {
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
        </svg>
      )
    }
    // Genérico
    return <span className="text-xs font-bold">{platform.charAt(0).toUpperCase()}</span>
  }

  const platformColor = (platform: string) => {
    const p = platform.toLowerCase()
    if (p.includes("instagram")) return "bg-pink-100 text-pink-600"
    if (p.includes("facebook")) return "bg-blue-100 text-blue-600"
    if (p.includes("meta")) return "bg-blue-100 text-blue-600"
    if (p.includes("tiktok")) return "bg-gray-900 text-white"
    if (p.includes("linkedin")) return "bg-blue-100 text-blue-700"
    if (p.includes("kwai")) return "bg-orange-100 text-orange-600"
    if (p.includes("google")) return "bg-red-100 text-red-600"
    if (p.includes("youtube")) return "bg-red-100 text-red-600"
    return "bg-gray-100 text-gray-600"
  }

  if (loading) return <Loading message="Carregando dashboard Jetour..." />

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">Erro ao carregar dados do dashboard</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col space-y-4 overflow-auto">

      {/* ── Hero (wrapper com relative para o dropdown não ser cortado) ──── */}
      <div className="relative rounded-2xl shadow-2xl h-44">
        {/* vídeo com overflow-hidden isolado */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          <video
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
          >
            <source src="/images/jetour-hero.mp4" media="(min-width: 768px)" type="video/mp4" />
            <source src="/images/Jetour_Hero_Mobile.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/40" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg max-w-2xl flex items-center gap-4">
            <img src="/images/Jetour_logo.svg" alt="Jetour" className="h-8 object-contain" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">Dashboard JETOUR</h1>
              <p className="text-sm text-gray-600">Visão consolidada de campanhas e resultados</p>
            </div>
            <div className="ml-auto">
              <img src="/images/W+E_logo.png" alt="W+E" className="h-7 object-contain opacity-70" />
            </div>
          </div>
        </div>

        {/* Filtro de período — canto inferior direito, fora do overflow-hidden */}
        {dataDateRange && (
          <div className="absolute bottom-4 right-4 z-10">
            {/* Pílula clicável */}
            <button
              ref={pillRef}
              onClick={() => setDatePickerOpen((v) => !v)}
              className={`flex items-center gap-1.5 backdrop-blur-sm border rounded-full px-3 py-1.5 shadow-sm transition-all ${
                isFiltered
                  ? "bg-white text-gray-900 border-white"
                  : "bg-white/15 text-white border-white/25 hover:bg-white/25"
              }`}
            >
              <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-medium tracking-wide">
                {activeStartDate && activeEndDate
                  ? `${formatDateBR(activeStartDate)} – ${formatDateBR(activeEndDate)}`
                  : "Selecionar período"}
              </span>
              <svg className={`w-3 h-3 flex-shrink-0 transition-transform ${datePickerOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown — fixed para escapar de qualquer overflow pai */}
            {datePickerOpen && (() => {
              const rect = pillRef.current?.getBoundingClientRect()
              return (
              <div
                style={{
                  position: "fixed",
                  top: rect ? rect.bottom + 8 : 80,
                  right: rect ? window.innerWidth - rect.right : 16,
                  width: 288,
                }}
                className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-[9999]"
              >
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Filtrar período</p>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">De</label>
                    <input
                      type="date"
                      value={activeStart}
                      min={toInputValue(dataDateRange.min)}
                      max={activeEnd || toInputValue(dataDateRange.max)}
                      onChange={(e) => setFilterStart(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Até</label>
                    <input
                      type="date"
                      value={activeEnd}
                      min={activeStart || toInputValue(dataDateRange.min)}
                      max={toInputValue(dataDateRange.max)}
                      onChange={(e) => setFilterEnd(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  {isFiltered && (
                    <button
                      onClick={() => { setFilterStart(""); setFilterEnd(""); setDatePickerOpen(false) }}
                      className="flex-1 text-xs text-gray-500 border border-gray-200 rounded-lg py-1.5 hover:bg-gray-50 transition-colors"
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
            )})()}
          </div>
        )}
      </div>

      {/* ── Big Numbers — Total Geral ─────────────────────────────────────── */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Investimento Total", value: formatCurrency(totaisGerais.spent), icon: <DollarSign className="w-4 h-4 text-green-600" />, bg: "bg-green-50" },
          { label: "Impressões", value: formatNumber(totaisGerais.impressions), icon: <Eye className="w-4 h-4 text-blue-600" />, bg: "bg-blue-50" },
          { label: "Cliques", value: formatNumber(totaisGerais.clicks), icon: <MousePointerClick className="w-4 h-4 text-purple-600" />, bg: "bg-purple-50" },
          { label: "Visualizações", value: formatNumber(totaisGerais.videoViews), icon: <Play className="w-4 h-4 text-orange-600" />, bg: "bg-orange-50" },
          { label: "Leads", value: formatNumber(totaisGerais.leads), icon: <Users className="w-4 h-4 text-pink-600" />, bg: "bg-pink-50" },
          { label: "Sessões do GA", value: formatNumber(totalSessoesGA), icon: <Globe className="w-4 h-4 text-teal-600" />, bg: "bg-teal-50" },
        ].map((card) => (
          <div key={card.label} className="card-overlay rounded-xl shadow p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className={`p-1.5 ${card.bg} rounded`}>{card.icon}</div>
              <p className="text-xs text-gray-500">{card.label}</p>
            </div>
            <p className="text-base font-bold text-gray-900 truncate">{card.value}</p>
          </div>
        ))}
      </div>

      {/* ── Últimos 7 dias + Campanhas Ativas ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Gráfico — últimos 7 dias */}
        <div className="lg:col-span-2 card-overlay rounded-xl shadow-lg p-5 flex flex-col" style={{ maxHeight: "420px" }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              {isFiltered && activeStartDate && activeEndDate
                ? `${formatDateBR(activeStartDate)} – ${formatDateBR(activeEndDate)}`
                : "Últimos 7 dias"}
              {selectedCampaign && <span className="text-xs font-normal text-gray-500">— {selectedCampaign}</span>}
            </h2>
            {/* Seletor de métrica */}
            <div className="flex gap-1 flex-wrap justify-end">
              {(["impressions", "spent", "videoViews", "clicks", "leads", "sessions"] as MetricType[]).map((m) => {
                const labels: Record<MetricType, string> = {
                  impressions: "Impressões",
                  spent: "Investimento",
                  videoViews: "Visualizações",
                  clicks: "Cliques",
                  leads: "Leads",
                  sessions: "Sessões GA",
                }
                return (
                  <button
                    key={m}
                    onClick={() => setSelectedMetric(m)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      selectedMetric === m
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {labels[m]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Big numbers 7 dias — linha única */}
          <div className="grid grid-cols-6 gap-2 mb-3">
            {[
              { label: "Investimento", value: formatCurrency(last7Totals.spent) },
              { label: "Impressões",   value: formatNumber(last7Totals.impressions) },
              { label: "Leads",        value: formatNumber(last7Totals.leads) },
              { label: "CPM",          value: formatCurrency(last7Totals.cpm) },
              { label: "CTR",          value: `${last7Totals.ctr.toFixed(2)}%` },
              { label: "CPL",          value: last7Totals.leads > 0 ? formatCurrency(last7Totals.cpl) : "—" },
            ].map((item) => (
              <div key={item.label} className="bg-slate-700/80 rounded-2xl p-2 text-center shadow-sm">
                <p className="text-xs text-slate-300 font-medium">{item.label}</p>
                <p className="text-sm font-bold text-white truncate">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Gráfico */}
          <div className="flex-1 min-h-40">
            {chartData.length > 0 ? (
              <ResponsiveLine
                data={chartData}
                margin={{ top: 10, right: 20, bottom: 40, left: 60 }}
                xScale={{ type: "point" }}
                yScale={{ type: "linear", min: "auto", max: "auto" }}
                curve="monotoneX"
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: -30,
                  tickValues: xTickValues,
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 5,
                  format: (v) => formatChartTick(v),
                }}
                colors={["#2563eb"]}
                lineWidth={2}
                pointSize={6}
                pointColor={{ theme: "background" }}
                pointBorderWidth={2}
                pointBorderColor={{ from: "serieColor" }}
                enableArea
                areaOpacity={0.1}
                useMesh
                enableSlices="x"
                sliceTooltip={({ slice }) => (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
                    <p className="font-semibold text-gray-700 mb-1">{slice.points[0]?.data.x as string}</p>
                    {slice.points.map((point) => (
                      <p key={point.id} className="text-gray-900 font-bold">
                        {point.seriesId}: {formatChartTooltip(point.data.y as number)}
                      </p>
                    ))}
                  </div>
                )}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                Sem dados nos últimos 7 dias
              </div>
            )}
          </div>
        </div>

        {/* Campanhas Ativas */}
        <div className="card-overlay rounded-xl shadow-lg p-5 flex flex-col" style={{ maxHeight: "420px" }}>
          <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-green-600" />
            Campanhas Ativas
            <span className="ml-auto bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {activeCampaigns.length}
            </span>
          </h2>

          <div className="overflow-y-auto space-y-2" style={{ maxHeight: "320px" }}>
            {activeCampaigns.length === 0 && (
              <p className="text-sm text-gray-400 text-center mt-4">Nenhuma campanha ativa</p>
            )}
            {activeCampaigns.map((campaign, index) => (
              <div
                key={index}
                onClick={() =>
                  setSelectedCampaign(selectedCampaign === campaign.name ? null : campaign.name)
                }
                className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border-2 ${
                  selectedCampaign === campaign.name
                    ? "bg-blue-50 border-blue-400"
                    : "hover:bg-gray-50 border-transparent"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="mt-1 w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate" title={campaign.name}>
                      {campaign.name}
                    </p>
                    {/* Ícones das plataformas */}
                    {campaign.platforms.size > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Array.from(campaign.platforms).map((platform) => (
                          <span
                            key={platform}
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs ${platformColor(platform)}`}
                            title={platform}
                          >
                            {platformIcon(platform)}
                            <span className="text-xs leading-none">{platform}</span>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs text-gray-500">{formatCurrency(campaign.totalSpent)}</span>
                      <span className="text-xs text-gray-400">{formatNumber(campaign.impressions)} imp.</span>
                      {campaign.leads > 0 && (
                        <span className="text-xs text-pink-600 font-medium">{formatNumber(campaign.leads)} leads</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedCampaign && (
            <button
              onClick={() => setSelectedCampaign(null)}
              className="mt-2 text-xs text-blue-600 hover:underline text-center w-full"
            >
              Limpar filtro de campanha
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Capa
