"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { Calendar, Filter, ArrowUpDown, DollarSign, Eye, MousePointer, TrendingUp, Target } from "lucide-react"
import { useGoogleSearchData } from "../../services/consolidadoApi"
import Loading from "../../components/Loading/Loading"

interface SearchRow {
  day: string
  keyword: string
  matchType: string
  campaignName: string
  adGroupName: string
  clicks: number
  impressions: number
  ctr: number
  avgCpc: number
  cost: number
  conversions: number
  convRate: number
}

const fmt = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".", ",")} mi`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)} mil`
  return v.toLocaleString("pt-BR")
}
const fmtCurrency = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtPct = (v: number) => `${v.toFixed(2)}%`
const isoDate = (s: string) => {
  if (!s) return ""
  const p = s.split("/")
  if (p.length === 3) return `${p[2]}-${p[1].padStart(2, "0")}-${p[0].padStart(2, "0")}`
  return s
}
const parseN = (v: string) => parseFloat((v || "").replace(/[R$\s.]/g, "").replace(",", ".")) || 0
const parseI = (v: string) => parseInt((v || "").replace(/[.\s]/g, "").replace(",", "")) || 0
const parsePct = (v: string) => parseFloat((v || "").replace("%", "").replace(",", ".")) || 0

// ─── Word Cloud ───────────────────────────────────────────────────────────────

const CLOUD_COLORS = ["#2563eb","#16a34a","#d97706","#dc2626","#7c3aed","#0891b2","#ea580c","#db2777","#65a30d","#0d9488"]

interface WordItem { text: string; value: number }

const getWordSize = (value: number, maxVal: number, minVal: number): number => {
  const range = maxVal - minVal
  if (range === 0) return 18
  const normalized = (value - minVal) / range
  return 12 + normalized * 36 // 12px → 48px
}

const WordCloud: React.FC<{ words: WordItem[] }> = ({ words }) => {
  if (!words.length) return <div className="text-gray-400 text-sm text-center py-8">Sem dados para nuvem de palavras</div>

  const maxVal = words[0].value
  const minVal = words[words.length - 1].value

  // Gera posições espirais ao redor do centro para simular nuvem real
  // Cada palavra recebe um ângulo e raio crescente
  const W = 420 // largura lógica do container
  const H = 300 // altura lógica do container
  const cx = W / 2
  const cy = H / 2

  const positioned = words.map((w, i) => {
    const fontSize = getWordSize(w.value, maxVal, minVal)
    const golden = 2.399963
    // Raio maior = mais espaço entre palavras; palavras grandes ocupam mais espaço
    const radius = i === 0 ? 0 : 30 + i * 13 + fontSize * 0.8
    const angle = i * golden
    const rawX = cx + Math.cos(angle) * radius
    const rawY = cy + Math.sin(angle) * radius * 0.52
    const margin = fontSize * 1.8
    const x = Math.max(margin, Math.min(W - margin, rawX))
    const y = Math.max(fontSize, Math.min(H - fontSize, rawY))
    return { ...w, fontSize, x, y }
  })

  return (
    <div
      className="border border-gray-100 rounded-xl overflow-hidden"
      style={{ position: "relative", width: "100%", paddingBottom: `${(H / W) * 100}%` }}
    >
      <div style={{ position: "absolute", inset: 0 }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
          {positioned.map((w, i) => {
            const opacity = 0.55 + (w.value / maxVal) * 0.45
            return (
              <text
                key={`${w.text}-${i}`}
                x={w.x}
                y={w.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={CLOUD_COLORS[i % CLOUD_COLORS.length]}
                fontSize={w.fontSize}
                fontWeight={w.fontSize > 26 ? 700 : w.fontSize > 18 ? 600 : 400}
                opacity={opacity}
                style={{ cursor: "default", userSelect: "none" }}
              >
                <title>{`${w.text}: ${w.value.toLocaleString("pt-BR")} impressões`}</title>
                {w.text}
              </text>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

const GoogleSearch: React.FC = () => {
  const { data: apiData, loading, error, refetch } = useGoogleSearchData()
  const [processedData, setProcessedData] = useState<SearchRow[]>([])
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" })
  const [selectedCampaign, setSelectedCampaign] = useState("")
  const [selectedMatchType, setSelectedMatchType] = useState("")
  const [availableCampaigns, setAvailableCampaigns] = useState<string[]>([])
  const [availableMatchTypes, setAvailableMatchTypes] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc")
  const [sortField, setSortField] = useState<keyof SearchRow>("cost")
  const itemsPerPage = 15

  useEffect(() => {
    if (!apiData?.success || !apiData?.data?.values || apiData.data.values.length < 2) return
    const headers = apiData.data.values[0]
    const rows = apiData.data.values.slice(1)
    const cSet = new Set<string>(), mSet = new Set<string>()

    const processed: SearchRow[] = rows
      .filter((row) => row[headers.indexOf("Search keyword")])
      .map((row): SearchRow => {
        const campaignName = row[headers.indexOf("Campaign Name")] || ""
        const matchType = row[headers.indexOf("Search keyword match type")] || ""
        if (campaignName) cSet.add(campaignName)
        if (matchType) mSet.add(matchType)
        return {
          day: row[headers.indexOf("Day")] || "",
          keyword: row[headers.indexOf("Search keyword")] || "",
          matchType,
          campaignName,
          adGroupName: row[headers.indexOf("Ad Group Name")] || "",
          clicks: parseI(row[headers.indexOf("Clicks")]),
          impressions: parseI(row[headers.indexOf("Impressions")]),
          ctr: parsePct(row[headers.indexOf("CTR")]),
          avgCpc: parseN(row[headers.indexOf("Avg. CPC")]),
          cost: parseN(row[headers.indexOf("Cost (Spend)")]),
          conversions: parseN(row[headers.indexOf("Conversions")]),
          convRate: parsePct(row[headers.indexOf("Conv. rate")]),
        }
      })

    setProcessedData(processed)
    setAvailableCampaigns(Array.from(cSet).sort())
    setAvailableMatchTypes(Array.from(mSet).sort())
    if (processed.length > 0) {
      const dates = processed.map((r) => isoDate(r.day)).filter(Boolean).sort()
      setDateRange({ start: dates[0], end: dates[dates.length - 1] })
    }
  }, [apiData])

  const filtered = useMemo(() => processedData.filter((r) => {
    const iso = isoDate(r.day)
    if (dateRange.start && iso < dateRange.start) return false
    if (dateRange.end && iso > dateRange.end) return false
    if (selectedCampaign && r.campaignName !== selectedCampaign) return false
    if (selectedMatchType && r.matchType !== selectedMatchType) return false
    return true
  }), [processedData, dateRange, selectedCampaign, selectedMatchType])

  // Aggregate by keyword + campaign + matchType
  const grouped = useMemo(() => {
    const map = new Map<string, SearchRow>()
    filtered.forEach((r) => {
      const key = `${r.keyword}||${r.campaignName}||${r.matchType}`
      if (!map.has(key)) { map.set(key, { ...r }) } else {
        const g = map.get(key)!
        g.clicks += r.clicks
        g.impressions += r.impressions
        g.cost += r.cost
        g.conversions += r.conversions
      }
    })
    // Recalculate derived
    const arr = Array.from(map.values()).map((r) => ({
      ...r,
      ctr: r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0,
      avgCpc: r.clicks > 0 ? r.cost / r.clicks : 0,
      convRate: r.clicks > 0 ? (r.conversions / r.clicks) * 100 : 0,
    }))
    return arr.sort((a, b) => {
      const va = a[sortField] as number
      const vb = b[sortField] as number
      return sortOrder === "desc" ? vb - va : va - vb
    })
  }, [filtered, sortOrder, sortField])

  const totals = useMemo(() => {
    const cost = grouped.reduce((s, r) => s + r.cost, 0)
    const clicks = grouped.reduce((s, r) => s + r.clicks, 0)
    const impressions = grouped.reduce((s, r) => s + r.impressions, 0)
    const conversions = grouped.reduce((s, r) => s + r.conversions, 0)
    return {
      cost, clicks, impressions, conversions,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpc: clicks > 0 ? cost / clicks : 0,
      cpm: impressions > 0 ? cost / (impressions / 1000) : 0,
      convRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
    }
  }, [grouped])

  // Word cloud data
  const cloudWords = useMemo(() => {
    const map = new Map<string, number>()
    filtered.forEach((r) => {
      const kw = r.keyword.toLowerCase().trim()
      if (!kw || kw === "(other)") return
      // Split into individual words too for variety
      kw.split(/\s+/).forEach((w) => {
        if (w.length < 3) return
        map.set(w, (map.get(w) || 0) + r.impressions)
      })
      // Also add full phrase
      map.set(kw, (map.get(kw) || 0) + r.impressions * 2)
    })
    return Array.from(map.entries())
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 60)
  }, [filtered])

  const totalPages = Math.ceil(grouped.length / itemsPerPage)
  const paginated = grouped.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handleSort = (field: keyof SearchRow) => {
    if (sortField === field) setSortOrder((o) => (o === "desc" ? "asc" : "desc"))
    else { setSortField(field); setSortOrder("desc") }
    setCurrentPage(1)
  }

  const SortArrow = ({ field }: { field: keyof SearchRow }) =>
    sortField === field ? (
      <span className="ml-0.5">{sortOrder === "desc" ? "↓" : "↑"}</span>
    ) : (
      <span className="ml-0.5 opacity-30">↕</span>
    )

  if (loading) return <Loading message="Carregando Google Search..." />
  if (error) return <div className="bg-red-50/90 border border-red-200 rounded-2xl p-4"><p className="text-red-600">Erro: {error.message}</p></div>

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card-overlay rounded-2xl shadow-lg px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/images/Jetour_logo.svg" alt="Jetour" className="h-7 object-contain" />
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Google Search</h1>
            <p className="text-xs text-gray-500">Performance por palavras-chave</p>
          </div>
        </div>
        <svg className="w-7 h-7" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      </div>

      {/* Big numbers */}
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "Investimento", value: fmtCurrency(totals.cost),       icon: <DollarSign className="w-4 h-4" /> },
          { label: "Impressões",   value: fmt(totals.impressions),         icon: <Eye className="w-4 h-4" /> },
          { label: "Cliques",      value: fmt(totals.clicks),              icon: <MousePointer className="w-4 h-4" /> },
          { label: "Conversões",   value: fmt(totals.conversions),         icon: <Target className="w-4 h-4" /> },
          { label: "CPM",          value: fmtCurrency(totals.cpm),         icon: <TrendingUp className="w-4 h-4" /> },
          { label: "CPC Médio",    value: fmtCurrency(totals.cpc),         icon: <DollarSign className="w-4 h-4" /> },
          { label: "CTR",          value: fmtPct(totals.ctr),              icon: <TrendingUp className="w-4 h-4" /> },
          { label: "Taxa Conv.",   value: fmtPct(totals.convRate),         icon: <Target className="w-4 h-4" /> },
        ].map((c) => (
          <div key={c.label} className="bg-slate-700/80 rounded-2xl px-3 py-3 flex flex-col gap-1 text-white">
            <div className="flex items-center gap-1.5 text-slate-300 text-xs">{c.icon}{c.label}</div>
            <div className="text-sm font-bold truncate">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Word Cloud + Filters side by side */}
      <div className="grid grid-cols-2 gap-4">

        {/* Word Cloud */}
        <div className="card-overlay rounded-2xl shadow-lg p-4">
          <p className="text-sm font-bold text-gray-800 mb-1">Nuvem de Palavras-chave</p>
          <p className="text-xs text-gray-400 mb-3">Tamanho proporcional às impressões</p>
          <WordCloud words={cloudWords} />
        </div>

        {/* Rankings + Filters */}
        <div className="card-overlay rounded-2xl shadow-lg p-4 flex flex-col gap-4">

          {/* Filtros */}
          <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Campanha", value: selectedCampaign, opts: availableCampaigns, set: (v: string) => { setSelectedCampaign(v); setCurrentPage(1) } },
            { label: "Correspondência", value: selectedMatchType, opts: availableMatchTypes, set: (v: string) => { setSelectedMatchType(v); setCurrentPage(1) } },
          ].map((f) => (
            <div key={f.label}>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1"><Filter className="w-3.5 h-3.5" />{f.label}</label>
              <div className="relative">
                <select value={f.value} onChange={(e) => f.set(e.target.value)}
                  className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-xl text-xs font-medium text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Todos</option>
                  {f.opts.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />De</label>
            <input type="date" value={dateRange.start} onChange={(e) => { setDateRange((p) => ({ ...p, start: e.target.value })); setCurrentPage(1) }}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Até</label>
            <input type="date" value={dateRange.end} onChange={(e) => { setDateRange((p) => ({ ...p, end: e.target.value })); setCurrentPage(1) }}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          </div>{/* fim grid filtros */}

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Top 10 lado a lado */}
          <div className="grid grid-cols-2 gap-3">
            {/* Top Cliques */}
            <div>
              <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
                <MousePointer className="w-3.5 h-3.5 text-blue-500" /> Top 10 — Cliques
              </p>
              <div className="space-y-1">
                {[...grouped].sort((a, b) => b.clicks - a.clicks).slice(0, 10).map((r, i) => {
                  const pct = grouped[0]?.clicks ? (r.clicks / [...grouped].sort((a,b)=>b.clicks-a.clicks)[0].clicks) * 100 : 0
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 w-4 text-right flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] text-gray-700 truncate font-medium">{r.keyword}</span>
                          <span className="text-[10px] font-bold text-blue-600 flex-shrink-0 ml-1">{fmt(r.clicks)}</span>
                        </div>
                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Top CTR */}
            <div>
              <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-green-500" /> Top 10 — CTR
              </p>
              <div className="space-y-1">
                {[...grouped].filter(r => r.impressions >= 10).sort((a, b) => b.ctr - a.ctr).slice(0, 10).map((r, i) => {
                  const maxCtr = [...grouped].filter(r => r.impressions >= 10).sort((a,b)=>b.ctr-a.ctr)[0]?.ctr || 1
                  const pct = (r.ctr / maxCtr) * 100
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 w-4 text-right flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] text-gray-700 truncate font-medium">{r.keyword}</span>
                          <span className="text-[10px] font-bold text-green-600 flex-shrink-0 ml-1">{fmtPct(r.ctr)}</span>
                        </div>
                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

        </div>{/* fim card rankings+filters */}

      </div>{/* fim grid word cloud + filters */}

      {/* Table */}
      <div className="card-overlay rounded-2xl shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-gray-800">Keywords ({grouped.length})</p>
          <button onClick={() => setSortOrder((o) => o === "desc" ? "asc" : "desc")}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 text-gray-700 transition-colors">
            <ArrowUpDown className="w-3.5 h-3.5" /> Ordenar
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-700 text-white">
                <th className="text-left py-2.5 px-3 font-semibold rounded-l-xl">Palavra-chave / Campanha</th>
                <th className="text-left py-2.5 px-3 font-semibold">Correspondência</th>
                <th className="text-right py-2.5 px-3 font-semibold cursor-pointer hover:text-blue-300" onClick={() => handleSort("cost")}>Invest. <SortArrow field="cost" /></th>
                <th className="text-right py-2.5 px-3 font-semibold cursor-pointer hover:text-blue-300" onClick={() => handleSort("clicks")}>Cliques <SortArrow field="clicks" /></th>
                <th className="text-right py-2.5 px-3 font-semibold cursor-pointer hover:text-blue-300" onClick={() => handleSort("impressions")}>Impressões <SortArrow field="impressions" /></th>
                <th className="text-right py-2.5 px-3 font-semibold cursor-pointer hover:text-blue-300" onClick={() => handleSort("ctr")}>CTR <SortArrow field="ctr" /></th>
                <th className="text-right py-2.5 px-3 font-semibold cursor-pointer hover:text-blue-300" onClick={() => handleSort("avgCpc")}>CPC Médio <SortArrow field="avgCpc" /></th>
                <th className="text-right py-2.5 px-3 font-semibold cursor-pointer hover:text-blue-300 rounded-r-xl" onClick={() => handleSort("conversions")}>Conversões <SortArrow field="conversions" /></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((r, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-slate-50/60" : "bg-white/40"}>
                  <td className="py-2.5 px-3 max-w-xs">
                    <p className="font-semibold text-gray-900 leading-tight line-clamp-2">{r.keyword || "—"}</p>
                    <p className="text-gray-400 text-xs mt-0.5 truncate">{r.campaignName}</p>
                  </td>
                  <td className="py-2.5 px-3">
                    {r.matchType ? (
                      <span className="px-2 py-0.5 rounded-full text-white text-xs font-semibold bg-blue-500">{r.matchType}</span>
                    ) : "—"}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-gray-800">{fmtCurrency(r.cost)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-700">{fmt(r.clicks)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-700">{fmt(r.impressions)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-700">{fmtPct(r.ctr)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-700">{fmtCurrency(r.avgCpc)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-700">{r.conversions > 0 ? fmt(r.conversions) : "—"}</td>
                </tr>
              ))}
              {grouped.length === 0 && (
                <tr><td colSpan={8} className="py-10 text-center text-gray-400">Nenhum dado disponível</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">{(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, grouped.length)} de {grouped.length}</p>
          <div className="flex gap-2">
            <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">← Anterior</button>
            <span className="px-3 py-1.5 text-xs text-gray-600">{currentPage}/{totalPages}</span>
            <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Próximo →</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GoogleSearch
