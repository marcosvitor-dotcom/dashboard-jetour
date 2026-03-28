"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { Calendar, Filter, ArrowUpDown, DollarSign, Eye, MousePointer, TrendingUp, Play } from "lucide-react"
import { useMetaCreatives } from "../../services/consolidadoApi"
import Loading from "../../components/Loading/Loading"
import CreativeModalMeta from "./CreativeModalMeta"

interface CreativeData {
  date: string
  adName: string
  adCreativeImageUrl: string
  adCreativeThumbnailUrl: string
  campaignName: string
  reach: number
  impressions: number
  cost: number
  linkClicks: number
  postEngagements: number
  videoWatches25: number
  videoWatches50: number
  videoWatches75: number
  videoWatches100: number
  videoPlayActions: number
  tipoCompra?: string
  placement?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".", ",")} mi`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)} mil`
  return v.toLocaleString("pt-BR")
}
const fmtCurrency = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtPct = (v: number) => `${v.toFixed(2)}%`
const isoDate = (br: string) => {
  if (!br) return ""
  const parts = br.split("/")
  if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`
  return br // já em formato ISO ou "Day" header
}

const CriativosMetaAds: React.FC = () => {
  const { data: apiData, loading, error } = useMetaCreatives()

  const [processedData, setProcessedData] = useState<CreativeData[]>([])
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" })
  const [selectedCampaign, setSelectedCampaign] = useState("")
  const [selectedTipoCompra, setSelectedTipoCompra] = useState("")
  const [selectedPlacement, setSelectedPlacement] = useState("")
  const [availableCampaigns, setAvailableCampaigns] = useState<string[]>([])
  const [availableTiposCompra, setAvailableTiposCompra] = useState<string[]>([])
  const [availablePlacements, setAvailablePlacements] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc")
  const [selectedCreative, setSelectedCreative] = useState<CreativeData | null>(null)
  const itemsPerPage = 10

  useEffect(() => {
    if (!apiData?.success || !apiData?.data?.values) return
    const headers = apiData.data.values[0]
    const rows = apiData.data.values.slice(1)

    const parseN = (v: string) => Number.parseFloat((v || "").replace(/[R$\s.]/g, "").replace(",", ".")) || 0
    const parseI = (v: string) => Number.parseInt((v || "").replace(/[.\s]/g, "").replace(",", "")) || 0

    const campaignSet = new Set<string>()
    const tipoSet = new Set<string>()
    const placementSet = new Set<string>()

    const processed: CreativeData[] = rows.map((row: string[]) => {
      const tipoCompra = row[headers.indexOf("Tipo de Compra")] || ""
      const placement = row[headers.indexOf("Placement")] || ""
      const campaignName = row[headers.indexOf("Campaign Name")] || ""
      if (campaignName) campaignSet.add(campaignName)
      if (tipoCompra) tipoSet.add(tipoCompra)
      if (placement) placementSet.add(placement)
      return {
        date: row[headers.indexOf("Day")] || "",
        adName: (row[headers.indexOf("Ad Name")] || "").trim(),
        adCreativeImageUrl: row[headers.indexOf("Creative Image")] || "",
        adCreativeThumbnailUrl: row[headers.indexOf("Creative Image")] || "",
        campaignName,
        reach: parseI(row[headers.indexOf("Reach")]),
        impressions: parseI(row[headers.indexOf("Impressions")]),
        cost: parseN(row[headers.indexOf("Amount Spent")]),
        linkClicks: parseI(row[headers.indexOf("Link Clicks")]),
        postEngagements: parseI(row[headers.indexOf("Post Engagement")]),
        videoWatches25: parseI(row[headers.indexOf("Video Watches at 25%")]),
        videoWatches50: parseI(row[headers.indexOf("Video Watches at 50%")]),
        videoWatches75: parseI(row[headers.indexOf("Video Watches at 75%")]),
        videoWatches100: parseI(row[headers.indexOf("Video Watches at 100%")]),
        videoPlayActions: parseI(row[headers.indexOf("Video Plays")]),
        tipoCompra: tipoCompra || undefined,
        placement: placement || undefined,
      }
    }).filter((r) => r.date && r.impressions > 0)

    setProcessedData(processed)
    setAvailableCampaigns(Array.from(campaignSet).sort())
    setAvailableTiposCompra(Array.from(tipoSet).sort())
    setAvailablePlacements(Array.from(placementSet).sort())

    if (processed.length > 0) {
      const dates = processed.map((r) => isoDate(r.date)).filter(Boolean).sort()
      setDateRange({ start: dates[0], end: dates[dates.length - 1] })
    }
  }, [apiData])

  const filtered = useMemo(() => {
    return processedData.filter((r) => {
      const iso = isoDate(r.date)
      if (dateRange.start && iso < dateRange.start) return false
      if (dateRange.end && iso > dateRange.end) return false
      if (selectedCampaign && r.campaignName !== selectedCampaign) return false
      if (selectedTipoCompra && r.tipoCompra !== selectedTipoCompra) return false
      if (selectedPlacement && r.placement !== selectedPlacement) return false
      return true
    })
  }, [processedData, dateRange, selectedCampaign, selectedTipoCompra, selectedPlacement])

  // Agrupa por criativo (adName + campaignName)
  const grouped = useMemo(() => {
    const map = new Map<string, CreativeData & { count: number }>()
    filtered.forEach((r) => {
      const key = `${r.adName}||${r.campaignName}`
      if (!map.has(key)) {
        map.set(key, { ...r, count: 0 })
      }
      const g = map.get(key)!
      g.impressions       += r.impressions
      g.cost              += r.cost
      g.linkClicks        += r.linkClicks
      g.postEngagements   += r.postEngagements
      g.videoWatches25    += r.videoWatches25
      g.videoWatches50    += r.videoWatches50
      g.videoWatches75    += r.videoWatches75
      g.videoWatches100   += r.videoWatches100
      g.videoPlayActions  += r.videoPlayActions
      g.count++
    })
    return Array.from(map.values()).sort((a, b) =>
      sortOrder === "desc" ? b.impressions - a.impressions : a.impressions - b.impressions
    )
  }, [filtered, sortOrder])

  const totals = useMemo(() => {
    const investment = filtered.reduce((s, r) => s + r.cost, 0)
    const impressions = filtered.reduce((s, r) => s + r.impressions, 0)
    const clicks = filtered.reduce((s, r) => s + r.linkClicks, 0)
    const videoPlays = filtered.reduce((s, r) => s + r.videoPlayActions, 0)
    const video100 = filtered.reduce((s, r) => s + r.videoWatches100, 0)
    const cpm = impressions > 0 ? investment / (impressions / 1000) : 0
    const cpc = clicks > 0 ? investment / clicks : 0
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
    const vtr = impressions > 0 ? (video100 / impressions) * 100 : 0
    return { investment, impressions, clicks, videoPlays, video100, cpm, cpc, ctr, vtr }
  }, [filtered])

  const totalPages = Math.ceil(grouped.length / itemsPerPage)
  const paginated = grouped.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  if (loading) return <Loading message="Carregando criativos Meta..." />
  if (error) return (
    <div className="bg-red-50/90 border border-red-200 rounded-2xl p-4">
      <p className="text-red-600">Erro: {error.message}</p>
    </div>
  )

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="card-overlay rounded-2xl shadow-lg px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/images/Jetour_logo.svg" alt="Jetour" className="h-7 object-contain" />
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Criativos — Meta Ads</h1>
            <p className="text-xs text-gray-500">Performance por criativo no Meta (Facebook + Instagram)</p>
          </div>
        </div>
        <svg className="w-7 h-7 text-blue-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" fill="currentColor">
          <path d="M47.3,21.01c-0.58-1.6-1.3-3.16-2.24-4.66c-0.93-1.49-2.11-2.93-3.63-4.13c-1.51-1.19-3.49-2.09-5.59-2.26l-0.78-0.04c-0.27,0.01-0.57,0.01-0.85,0.04c-0.57,0.06-1.11,0.19-1.62,0.34c-1.03,0.32-1.93,0.8-2.72,1.32c-1.42,0.94-2.55,2.03-3.57,3.15c0.01,0.02,0.03,0.03,0.04,0.05l0.22,0.28c0.51,0.67,1.62,2.21,2.61,3.87c1.23-1.2,2.83-2.65,3.49-3.07c0.5-0.31,0.99-0.55,1.43-0.68c0.23-0.06,0.44-0.11,0.64-0.12c0.1-0.02,0.19-0.01,0.3-0.02l0.38,0.02c0.98,0.09,1.94,0.49,2.85,1.19c1.81,1.44,3.24,3.89,4.17,6.48c0.95,2.6,1.49,5.44,1.52,8.18c0,1.31-0.17,2.57-0.57,3.61c-0.39,1.05-1.38,1.45-2.5,1.45c-1.63,0-2.81-0.7-3.76-1.68c-1.04-1.09-2.02-2.31-2.96-3.61c-0.78-1.09-1.54-2.22-2.26-3.37c-1.27-2.06-2.97-4.67-4.15-6.85L25,16.35c-0.31-0.39-0.61-0.78-0.94-1.17c-1.11-1.26-2.34-2.5-3.93-3.56c-0.79-0.52-1.69-1-2.72-1.32c-0.51-0.15-1.05-0.28-1.62-0.34c-0.18-0.02-0.36-0.03-0.54-0.03c-0.11,0-0.21-0.01-0.31-0.01l-0.78,0.04c-2.1,0.17-4.08,1.07-5.59,2.26c-1.52,1.2-2.7,2.64-3.63,4.13C4,17.85,3.28,19.41,2.7,21.01c-1.13,3.2-1.74,6.51-1.75,9.93c0.01,1.78,0.24,3.63,0.96,5.47c0.7,1.8,2.02,3.71,4.12,4.77c1.03,0.53,2.2,0.81,3.32,0.81c1.23,0.03,2.4-0.32,3.33-0.77c1.87-0.93,3.16-2.16,4.33-3.4c2.31-2.51,4.02-5.23,5.6-8c0.44-0.76,0.86-1.54,1.27-2.33c-0.21-0.41-0.42-0.84-0.64-1.29c-0.62-1.03-1.39-2.25-1.95-3.1c-0.83,1.5-1.69,2.96-2.58,4.41c-1.59,2.52-3.3,4.97-5.21,6.98c-0.95,0.98-2,1.84-2.92,2.25c-0.47,0.2-0.83,0.27-1.14,0.25c-0.43,0-0.79-0.1-1.13-0.28c-0.67-0.35-1.3-1.1-1.69-2.15c-0.4-1.04-0.57-2.3-0.57-3.61c0.03-2.74,0.57-5.58,1.52-8.18c0.93-2.59,2.36-5.04,4.17-6.48c0.91-0.7,1.87-1.1,2.85-1.19l0.38-0.02c0.11,0.01,0.2,0,0.3,0.02c0.2,0.01,0.41,0.06,0.64,0.12c0.26,0.08,0.54,0.19,0.83,0.34c0.2,0.1,0.4,0.21,0.6,0.34c1,0.64,1.99,1.58,2.92,2.62c0.72,0.81,1.41,1.71,2.1,2.63L25,25.24c0.75,1.55,1.53,3.09,2.39,4.58c1.58,2.77,3.29,5.49,5.6,8c0.68,0.73,1.41,1.45,2.27,2.1c0.61,0.48,1.28,0.91,2.06,1.3c0.93,0.45,2.1,0.8,3.33,0.77c1.12,0,2.29-0.28,3.32-0.81c2.1-1.06,3.42-2.97,4.12-4.77c0.72-1.84,0.95-3.69,0.96-5.47C49.04,27.52,48.43,24.21,47.3,21.01z" />
        </svg>
      </div>

      {/* Big numbers */}
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "Investimento", value: fmtCurrency(totals.investment),                              icon: <DollarSign className="w-4 h-4" /> },
          { label: "Impressões",   value: fmt(totals.impressions),                                     icon: <Eye className="w-4 h-4" /> },
          { label: "Cliques",      value: fmt(totals.clicks),                                          icon: <MousePointer className="w-4 h-4" /> },
          { label: "Video Plays",  value: fmt(totals.videoPlays),                                      icon: <Play className="w-4 h-4" /> },
          { label: "CPM",          value: fmtCurrency(totals.cpm),                                     icon: <TrendingUp className="w-4 h-4" /> },
          { label: "CPC",          value: totals.clicks > 0 ? fmtCurrency(totals.cpc) : "—",           icon: <DollarSign className="w-4 h-4" /> },
          { label: "CTR",          value: fmtPct(totals.ctr),                                          icon: <TrendingUp className="w-4 h-4" /> },
          { label: "VTR",          value: fmtPct(totals.vtr),                                          icon: <Play className="w-4 h-4" /> },
        ].map((c) => (
          <div key={c.label} className="bg-slate-700/80 rounded-2xl px-3 py-3 flex flex-col gap-1 text-white">
            <div className="flex items-center gap-1.5 text-slate-300 text-xs">{c.icon}{c.label}</div>
            <div className="text-sm font-bold truncate">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card-overlay rounded-2xl shadow-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1"><Filter className="w-3.5 h-3.5" /> Campanha</label>
            <div className="relative">
              <select value={selectedCampaign} onChange={(e) => { setSelectedCampaign(e.target.value); setCurrentPage(1) }}
                className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-xl text-xs font-medium text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todas</option>
                {availableCampaigns.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> De</label>
            <input type="date" value={dateRange.start} onChange={(e) => { setDateRange((p) => ({ ...p, start: e.target.value })); setCurrentPage(1) }}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Até</label>
            <input type="date" value={dateRange.end} onChange={(e) => { setDateRange((p) => ({ ...p, end: e.target.value })); setCurrentPage(1) }}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tipo de Compra</label>
            <div className="relative">
              <select value={selectedTipoCompra} onChange={(e) => { setSelectedTipoCompra(e.target.value); setCurrentPage(1) }}
                className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-xl text-xs font-medium text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todos</option>
                {availableTiposCompra.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Placement</label>
            <div className="relative">
              <select value={selectedPlacement} onChange={(e) => { setSelectedPlacement(e.target.value); setCurrentPage(1) }}
                className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-xl text-xs font-medium text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todos</option>
                {availablePlacements.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card-overlay rounded-2xl shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-gray-800">Criativos ({grouped.length})</p>
          <button onClick={() => setSortOrder((o) => o === "desc" ? "asc" : "desc")}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 text-gray-700 transition-colors">
            <ArrowUpDown className="w-3.5 h-3.5" /> Ordenar
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-700 text-white">
                <th className="text-left py-2.5 px-3 font-semibold rounded-l-xl w-16">Imagem</th>
                <th className="text-left py-2.5 px-3 font-semibold">Criativo / Campanha</th>
                <th className="text-right py-2.5 px-3 font-semibold">Investimento</th>
                <th className="text-right py-2.5 px-3 font-semibold">Impressões</th>
                <th className="text-right py-2.5 px-3 font-semibold">Cliques</th>
                <th className="text-right py-2.5 px-3 font-semibold">CTR / VTR</th>
                <th className="text-right py-2.5 px-3 font-semibold">CPM</th>
                <th className="text-right py-2.5 px-3 font-semibold">Tipo</th>
                <th className="text-right py-2.5 px-3 font-semibold rounded-r-xl">Placement</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((creative, i) => {
                const ctr = creative.impressions > 0 ? (creative.linkClicks / creative.impressions) * 100 : 0
                const vtr = creative.impressions > 0 ? (creative.videoWatches100 / creative.impressions) * 100 : 0
                const cpm = creative.impressions > 0 ? creative.cost / (creative.impressions / 1000) : 0
                const isVideo = creative.videoPlayActions > 0
                return (
                  <tr key={i} className={i % 2 === 0 ? "bg-slate-50/60" : "bg-white/40"}>
                    <td className="py-2.5 px-3">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setSelectedCreative(creative)}>
                        {creative.adCreativeImageUrl ? (
                          <img src={creative.adCreativeImageUrl} alt="Criativo" className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                        ) : (
                          <Eye className="w-5 h-5 text-gray-300" />
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 max-w-xs">
                      <p className="font-semibold text-gray-900 leading-tight line-clamp-2">{creative.adName || "—"}</p>
                      <p className="text-gray-400 text-xs mt-0.5 truncate">{creative.campaignName}</p>
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-gray-800">{fmtCurrency(creative.cost)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-700">{fmt(creative.impressions)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-700">{fmt(creative.linkClicks)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-700">
                      {isVideo ? (
                        <span>{fmtPct(vtr)} <span className="text-gray-400 text-xs">VTR</span></span>
                      ) : (
                        <span>{fmtPct(ctr)} <span className="text-gray-400 text-xs">CTR</span></span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-700">{fmtCurrency(cpm)}</td>
                    <td className="py-2.5 px-3 text-right">
                      {creative.tipoCompra ? (
                        <span className="px-2 py-0.5 rounded-full text-white text-xs font-semibold bg-blue-500">{creative.tipoCompra}</span>
                      ) : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-500 max-w-[120px] truncate">{creative.placement || "—"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {/* Paginação */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, grouped.length)} de {grouped.length}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
              ← Anterior
            </button>
            <span className="px-3 py-1.5 text-xs text-gray-600">{currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
              Próximo →
            </button>
          </div>
        </div>
      </div>

      <CreativeModalMeta creative={selectedCreative} isOpen={selectedCreative !== null} onClose={() => setSelectedCreative(null)} />
    </div>
  )
}

export default CriativosMetaAds
