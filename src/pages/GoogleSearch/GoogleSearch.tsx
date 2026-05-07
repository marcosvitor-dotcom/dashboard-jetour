"use client"

import React, { useState, useMemo, useEffect, useRef } from "react"
import { Calendar, Filter, ArrowUpDown, DollarSign, Eye, MousePointer, TrendingUp, Target, Search } from "lucide-react"
import { useGoogleSearchAllData } from "../../services/consolidadoApi"
import Loading from "../../components/Loading/Loading"
import cloud from "d3-cloud"

// ─── Types ────────────────────────────────────────────────────────────────────

interface KeywordRow {
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
  // enriquecido de Search Keyword (lifetime)
  lifetimeClicks: number
  lifetimeImpressions: number
  lifetimeCost: number
  lifetimeConversions: number
  campaignStart: string
  campaignEnd: string
}

interface DailyRow {
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

interface TermRow {
  day: string
  searchTerm: string
  matchType: string
  addedExcluded: string
  clicks: number
  impressions: number
  ctr: number
  avgCpc: number
  cost: number
  conversions: number
  convRate: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const parseN  = (v: string | undefined) => parseFloat((v || "").replace(/[R$\s.]/g, "").replace(",", ".")) || 0
const parseI  = (v: string | undefined) => parseInt((v || "").replace(/[.\s]/g, "").replace(",", "")) || 0
const parsePct = (v: string | undefined) => parseFloat((v || "").replace("%", "").replace(",", ".")) || 0

const fmt = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".", ",")} mi`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)} mil`
  return v.toLocaleString("pt-BR")
}
const fmtCurrency = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtPct = (v: number) => `${v.toFixed(2)}%`

// ─── Word Cloud ───────────────────────────────────────────────────────────────

interface WordItem { text: string; value: number }

const CLOUD_COLORS = ["#2563eb","#16a34a","#d97706","#dc2626","#7c3aed","#0891b2","#ea580c","#db2777","#65a30d","#0d9488"]

type D3CloudWord = cloud.Word & { origValue: number }

const WordCloudSVG: React.FC<{ words: WordItem[] }> = ({ words }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null)
  const [laid, setLaid] = useState<D3CloudWord[]>([])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) setDims({ w: Math.floor(width), h: Math.floor(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!words.length || !dims) return
    const maxVal = Math.max(...words.map((w) => w.value))
    const minVal = Math.min(...words.map((w) => w.value))
    const range = maxVal - minVal || 1

    const layout = cloud<D3CloudWord>()
      .size([dims.w, dims.h])
      .words(words.map((w) => ({ text: w.text, origValue: w.value })))
      .padding(4)
      .rotate(() => (Math.random() > 0.75 ? -90 : 0))
      .font("Inter, sans-serif")
      .fontWeight("bold")
      .fontSize((w: D3CloudWord) => {
        const norm = (w.origValue - minVal) / range
        return Math.round(11 + Math.sqrt(norm) * 32)
      })
      .on("end", (out: D3CloudWord[]) => { setLaid(out) })

    layout.start()
    return () => { layout.stop() }
  }, [words, dims])

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      {dims && (
        <svg width={dims.w} height={dims.h}>
          <g transform={`translate(${dims.w / 2},${dims.h / 2})`}>
            {laid.map((w, i) => (
              <text
                key={w.text}
                textAnchor="middle"
                transform={`translate(${w.x ?? 0},${w.y ?? 0}) rotate(${w.rotate ?? 0})`}
                fontSize={w.size}
                fontFamily="Inter, sans-serif"
                fontWeight="bold"
                fill={CLOUD_COLORS[i % CLOUD_COLORS.length]}
                style={{ cursor: "default", userSelect: "none" }}
              >
                <title>{w.text}: {w.origValue?.toLocaleString("pt-BR")} impressões</title>
                {w.text}
              </text>
            ))}
          </g>
        </svg>
      )}
    </div>
  )
}

// ─── SortArrow ────────────────────────────────────────────────────────────────

const SortArrow = ({ field, sortField, sortOrder }: { field: string; sortField: string; sortOrder: "asc" | "desc" }) =>
  sortField === field
    ? <span className="ml-0.5">{sortOrder === "desc" ? "↓" : "↑"}</span>
    : <span className="ml-0.5 opacity-30">↕</span>

// ─── Main ────────────────────────────────────────────────────────────────────

const GoogleSearch: React.FC = () => {
  const { search, search2, searchKeyword, loading, error } = useGoogleSearchAllData()

  const [dateRange, setDateRange]           = useState<{ start: string; end: string }>({ start: "", end: "" })
  const [selectedCampaign, setSelectedCampaign] = useState("")
  const [selectedMatchType, setSelectedMatchType] = useState("")
  const [activeTab, setActiveTab]           = useState<"keywords" | "terms">("keywords")
  const [kwPage, setKwPage]                 = useState(1)
  const [termPage, setTermPage]             = useState(1)
  const [kwSort, setKwSort]                 = useState<{ field: keyof KeywordRow; order: "desc" | "asc" }>({ field: "cost", order: "desc" })
  const [termSort, setTermSort]             = useState<{ field: keyof TermRow; order: "desc" | "asc" }>({ field: "clicks", order: "desc" })
  const PAGE = 15

  // ── Parse Google - Search (por dia) ────────────────────────────────────────
  const dailyRows = useMemo<DailyRow[]>(() => {
    if (!search?.data?.values || search.data.values.length < 2) return []
    const [headers, ...rows] = search.data.values
    const idx = (c: string) => headers.indexOf(c)
    return rows
      .filter((r: string[]) => r[idx("Search keyword")])
      .map((r: string[]): DailyRow => ({
        day:          r[idx("Day")] || "",
        keyword:      r[idx("Search keyword")] || "",
        matchType:    r[idx("Search keyword match type")] || "",
        campaignName: r[idx("Campaign Name")] || "",
        adGroupName:  r[idx("Ad Group Name")] || "",
        clicks:       parseI(r[idx("Clicks")]),
        impressions:  parseI(r[idx("Impressions")]),
        ctr:          parsePct(r[idx("CTR")]),
        avgCpc:       parseN(r[idx("Avg. CPC")]),
        cost:         parseN(r[idx("Cost (Spend)")]),
        conversions:  parseN(r[idx("Conversions")]),
        convRate:     parsePct(r[idx("Conv. rate")]),
      }))
  }, [search])

  // ── Parse Google - Search Search Keyword (lifetime acumulado) ──────────────
  const lifetimeMap = useMemo<Map<string, Partial<KeywordRow>>>(() => {
    const map = new Map<string, Partial<KeywordRow>>()
    if (!searchKeyword?.data?.values || searchKeyword.data.values.length < 2) return map
    const [headers, ...rows] = searchKeyword.data.values
    const idx = (c: string) => headers.indexOf(c)
    rows.forEach((r: string[]) => {
      const kw = (r[idx("Display Search keyword")] || "").toLowerCase().trim()
      if (!kw) return
      const existing = map.get(kw) ?? { lifetimeClicks: 0, lifetimeImpressions: 0, lifetimeCost: 0, lifetimeConversions: 0 }
      map.set(kw, {
        lifetimeClicks:       (existing.lifetimeClicks      ?? 0) + parseI(r[idx("Clicks")]),
        lifetimeImpressions:  (existing.lifetimeImpressions ?? 0) + parseI(r[idx("Impressions")]),
        lifetimeCost:         (existing.lifetimeCost        ?? 0) + parseN(r[idx("Cost (Spend)")]),
        lifetimeConversions:  (existing.lifetimeConversions ?? 0) + parseN(r[idx("Conversions")]),
        campaignStart:        r[idx("Campaign Start Date")] || "",
        campaignEnd:          r[idx("Campaign End Date")] || "",
      })
    })
    return map
  }, [searchKeyword])

  // ── Parse Google - Search 2 (termos reais) ─────────────────────────────────
  const allTerms = useMemo<TermRow[]>(() => {
    if (!search2?.data?.values || search2.data.values.length < 2) return []
    const [headers, ...rows] = search2.data.values
    const idx = (c: string) => headers.indexOf(c)
    return rows
      .filter((r: string[]) => r[idx("Search term")])
      .map((r: string[]): TermRow => ({
        day:           r[idx("Day")] || "",
        searchTerm:    r[idx("Search term")] || "",
        matchType:     r[idx("Match type")] || "",
        addedExcluded: r[idx("Added/Excluded")] || "",
        clicks:        parseI(r[idx("Clicks")]),
        impressions:   parseI(r[idx("Impressions")]),
        ctr:           parsePct(r[idx("CTR")]),
        avgCpc:        parseN(r[idx("Avg. CPC")]),
        cost:          parseN(r[idx("Cost (Spend)")]),
        conversions:   parseN(r[idx("Conversions")]),
        convRate:      parsePct(r[idx("Conv. rate")]),
      }))
  }, [search2])

  // ── Date range auto (de dailyRows) ─────────────────────────────────────────
  const { minDate, maxDate } = useMemo(() => {
    const dates = dailyRows.map((r) => r.day).filter(Boolean).sort()
    return { minDate: dates[0] ?? "", maxDate: dates[dates.length - 1] ?? "" }
  }, [dailyRows])
  const start = dateRange.start || minDate
  const end   = dateRange.end   || maxDate

  // ── Filtros disponíveis ────────────────────────────────────────────────────
  const { campaigns, matchTypes } = useMemo(() => {
    const cSet = new Set<string>()
    const mSet = new Set<string>()
    dailyRows.forEach((r) => { if (r.campaignName) cSet.add(r.campaignName); if (r.matchType) mSet.add(r.matchType) })
    return { campaigns: Array.from(cSet).sort(), matchTypes: Array.from(mSet).sort() }
  }, [dailyRows])

  // ── dailyRows filtrados ────────────────────────────────────────────────────
  const filteredDaily = useMemo(() => dailyRows.filter((r) => {
    if (start && r.day < start) return false
    if (end   && r.day > end)   return false
    if (selectedCampaign  && r.campaignName !== selectedCampaign)  return false
    if (selectedMatchType && r.matchType    !== selectedMatchType) return false
    return true
  }), [dailyRows, start, end, selectedCampaign, selectedMatchType])

  // ── allTerms filtrados por data ────────────────────────────────────────────
  const filteredTerms = useMemo(() => allTerms.filter((r) => {
    if (start && r.day < start) return false
    if (end   && r.day > end)   return false
    return true
  }), [allTerms, start, end])

  // ── Agrupa por keyword e enriquece com lifetime ────────────────────────────
  const groupedKeywords = useMemo<KeywordRow[]>(() => {
    const map = new Map<string, KeywordRow>()
    filteredDaily.forEach((r) => {
      const key = `${r.keyword.toLowerCase()}||${r.campaignName}||${r.matchType}`
      if (!map.has(key)) {
        const lifetime = lifetimeMap.get(r.keyword.toLowerCase()) ?? {}
        map.set(key, {
          keyword: r.keyword, matchType: r.matchType, campaignName: r.campaignName,
          adGroupName: r.adGroupName,
          clicks: 0, impressions: 0, ctr: 0, avgCpc: 0, cost: 0, conversions: 0, convRate: 0,
          lifetimeClicks:      lifetime.lifetimeClicks      ?? 0,
          lifetimeImpressions: lifetime.lifetimeImpressions ?? 0,
          lifetimeCost:        lifetime.lifetimeCost        ?? 0,
          lifetimeConversions: lifetime.lifetimeConversions ?? 0,
          campaignStart:       lifetime.campaignStart       ?? "",
          campaignEnd:         lifetime.campaignEnd         ?? "",
        })
      }
      const g = map.get(key)!
      g.clicks      += r.clicks
      g.impressions += r.impressions
      g.cost        += r.cost
      g.conversions += r.conversions
    })
    return Array.from(map.values()).map((r) => ({
      ...r,
      ctr:     r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0,
      avgCpc:  r.clicks > 0      ? r.cost / r.clicks : 0,
      convRate: r.clicks > 0     ? (r.conversions / r.clicks) * 100 : 0,
    })).sort((a, b) => {
      const va = a[kwSort.field] as number; const vb = b[kwSort.field] as number
      return kwSort.order === "desc" ? vb - va : va - vb
    })
  }, [filteredDaily, lifetimeMap, kwSort])

  // ── Agrupa por search term ─────────────────────────────────────────────────
  const groupedTerms = useMemo<TermRow[]>(() => {
    const map = new Map<string, TermRow>()
    filteredTerms.forEach((r) => {
      const key = `${r.searchTerm.toLowerCase()}||${r.matchType}||${r.addedExcluded}`
      if (!map.has(key)) { map.set(key, { ...r, clicks: 0, impressions: 0, cost: 0, conversions: 0, ctr: 0, avgCpc: 0, convRate: 0 }) }
      const g = map.get(key)!
      g.clicks      += r.clicks
      g.impressions += r.impressions
      g.cost        += r.cost
      g.conversions += r.conversions
    })
    return Array.from(map.values()).map((r) => ({
      ...r,
      ctr:     r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0,
      avgCpc:  r.clicks > 0      ? r.cost / r.clicks : 0,
      convRate: r.clicks > 0     ? (r.conversions / r.clicks) * 100 : 0,
    })).sort((a, b) => {
      const va = a[termSort.field] as number; const vb = b[termSort.field] as number
      return termSort.order === "desc" ? vb - va : va - vb
    })
  }, [filteredTerms, termSort])

  // ── Totais (Search + Search 2 combinados) ─────────────────────────────────
  const totals = useMemo(() => {
    const clicks      = groupedKeywords.reduce((s, r) => s + r.clicks, 0)
    const impressions = groupedKeywords.reduce((s, r) => s + r.impressions, 0)
    const cost        = groupedKeywords.reduce((s, r) => s + r.cost, 0)
    const conversions = groupedKeywords.reduce((s, r) => s + r.conversions, 0)
    // termos reais (Search 2) — sem duplic com keywords
    const termClicks      = groupedTerms.reduce((s, r) => s + r.clicks, 0)
    const termImpressions = groupedTerms.reduce((s, r) => s + r.impressions, 0)
    return {
      cost, clicks, impressions, conversions,
      termClicks, termImpressions,
      ctr:      impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpc:      clicks > 0      ? cost / clicks : 0,
      cpm:      impressions > 0 ? cost / (impressions / 1000) : 0,
      convRate: clicks > 0      ? (conversions / clicks) * 100 : 0,
    }
  }, [groupedKeywords, groupedTerms])

  // ── Nuvem de palavras — termos reais (Search 2) ────────────────────────────
  const cloudWords = useMemo<WordItem[]>(() => {
    const map = new Map<string, number>()
    filteredTerms.forEach((r) => {
      const term = r.searchTerm.toLowerCase().trim()
      if (!term || term === "(other)") return
      term.split(/\s+/).forEach((w) => { if (w.length >= 3) map.set(w, (map.get(w) ?? 0) + r.impressions) })
      map.set(term, (map.get(term) ?? 0) + r.impressions * 2)
    })
    return Array.from(map.entries())
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 60)
  }, [filteredTerms])

  // ── Paginação ──────────────────────────────────────────────────────────────
  const kwTotalPages   = Math.ceil(groupedKeywords.length / PAGE)
  const termTotalPages = Math.ceil(groupedTerms.length / PAGE)
  const kwPaginated    = groupedKeywords.slice((kwPage - 1) * PAGE, kwPage * PAGE)
  const termPaginated  = groupedTerms.slice((termPage - 1) * PAGE, termPage * PAGE)

  const handleKwSort = (field: keyof KeywordRow) => {
    setKwSort((s) => ({ field, order: s.field === field && s.order === "desc" ? "asc" : "desc" }))
    setKwPage(1)
  }
  const handleTermSort = (field: keyof TermRow) => {
    setTermSort((s) => ({ field, order: s.field === field && s.order === "desc" ? "asc" : "desc" }))
    setTermPage(1)
  }

  if (loading) return <Loading message="Carregando Google Search..." />
  if (error)   return <div className="bg-red-50/90 border border-red-200 rounded-2xl p-4"><p className="text-red-600">Erro: {error.message}</p></div>

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="card-overlay rounded-2xl shadow-lg px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/images/LOGO_JETOUR.png" alt="Jetour" className="h-7 object-contain" />
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Google Search</h1>
            <p className="text-xs text-gray-500">Keywords · Termos reais · Performance por período</p>
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
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "Investimento",  value: fmtCurrency(totals.cost),                          icon: <DollarSign className="w-4 h-4" /> },
          { label: "Impressões",    value: totals.impressions.toLocaleString("pt-BR"),         icon: <Eye className="w-4 h-4" /> },
          { label: "Cliques",       value: totals.clicks.toLocaleString("pt-BR"),              icon: <MousePointer className="w-4 h-4" /> },
          { label: "Conversões",    value: totals.conversions.toLocaleString("pt-BR"),         icon: <Target className="w-4 h-4" /> },
          { label: "CPM",           value: fmtCurrency(totals.cpm),                            icon: <TrendingUp className="w-4 h-4" /> },
          { label: "CPC Médio",     value: fmtCurrency(totals.cpc),                            icon: <DollarSign className="w-4 h-4" /> },
          { label: "CTR",           value: fmtPct(totals.ctr),                                 icon: <TrendingUp className="w-4 h-4" /> },
          { label: "Taxa de Conv.", value: fmtPct(totals.convRate),                            icon: <Target className="w-4 h-4" /> },
        ].map((c) => (
          <div key={c.label} className="bg-slate-700/80 rounded-2xl px-3 py-3 flex flex-col gap-1 text-white">
            <div className="flex items-center gap-1.5 text-slate-300 text-xs">{c.icon}{c.label}</div>
            <div className="text-base md:text-sm font-bold">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Nuvem + Filtros + Top rankings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Filtros + Top rankings — primeiro no mobile */}
        <div className="card-overlay rounded-2xl shadow-lg p-4 flex flex-col gap-4 order-1 md:order-2">

          {/* Filtros */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Campanha", value: selectedCampaign, opts: campaigns,
                set: (v: string) => { setSelectedCampaign(v); setKwPage(1); setTermPage(1) } },
              { label: "Correspondência", value: selectedMatchType, opts: matchTypes,
                set: (v: string) => { setSelectedMatchType(v); setKwPage(1); setTermPage(1) } },
            ].map((f) => (
              <div key={f.label}>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" />{f.label}
                </label>
                <div className="relative">
                  <select value={f.value} onChange={(e) => f.set(e.target.value)}
                    className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-xl text-xs font-medium text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Todos</option>
                    {f.opts.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />De</label>
              <input type="date" value={start} onChange={(e) => { setDateRange((p) => ({ ...p, start: e.target.value })); setKwPage(1); setTermPage(1) }}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Até</label>
              <input type="date" value={end} onChange={(e) => { setDateRange((p) => ({ ...p, end: e.target.value })); setKwPage(1); setTermPage(1) }}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Top 10 lado a lado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
                <MousePointer className="w-3.5 h-3.5 text-blue-500" /> Top Keywords — Cliques
              </p>
              <div className="space-y-1">
                {[...groupedKeywords].sort((a, b) => b.clicks - a.clicks).slice(0, 10).map((r, i) => {
                  const max = [...groupedKeywords].sort((a,b)=>b.clicks-a.clicks)[0]?.clicks || 1
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 w-4 text-right shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] text-gray-700 truncate font-medium">{r.keyword}</span>
                          <span className="text-[10px] font-bold text-blue-600 shrink-0 ml-1">{r.clicks.toLocaleString("pt-BR")}</span>
                        </div>
                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(r.clicks/max)*100}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
                <Search className="w-3.5 h-3.5 text-purple-500" /> Top Termos Reais — Cliques
              </p>
              <div className="space-y-1">
                {[...groupedTerms].sort((a, b) => b.clicks - a.clicks).slice(0, 10).map((r, i) => {
                  const max = [...groupedTerms].sort((a,b)=>b.clicks-a.clicks)[0]?.clicks || 1
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 w-4 text-right shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] text-gray-700 truncate font-medium">{r.searchTerm}</span>
                          <span className="text-[10px] font-bold text-purple-600 shrink-0 ml-1">{r.clicks.toLocaleString("pt-BR")}</span>
                        </div>
                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(r.clicks/max)*100}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

        </div>

        {/* Nuvem de termos reais — segundo no mobile */}
        <div className="card-overlay rounded-2xl shadow-lg p-4 order-2 md:order-1">
          <p className="text-sm font-bold text-gray-800 mb-0.5">Nuvem de Termos de Busca</p>
          <p className="text-xs text-gray-400 mb-3">Termos reais pesquisados · tamanho proporcional às impressões</p>
          {cloudWords.length > 0 ? (
            <div style={{ height: 300, width: "100%" }}>
              <WordCloudSVG words={cloudWords} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              Sem dados para nuvem de palavras
            </div>
          )}
          <div className="mt-3 flex items-center justify-between text-[10px] text-gray-400 border-t border-gray-100 pt-2">
            <span>{groupedTerms.length} termos únicos</span>
            <span>{totals.termImpressions.toLocaleString("pt-BR")} impressões · {totals.termClicks.toLocaleString("pt-BR")} cliques</span>
          </div>
        </div>

      </div>

      {/* Tabs + Tabelas */}
      <div className="card-overlay rounded-2xl shadow p-4">

        {/* Tabs */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            <button onClick={() => setActiveTab("keywords")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${activeTab === "keywords" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
              Keywords ({groupedKeywords.length})
            </button>
            <button onClick={() => setActiveTab("terms")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${activeTab === "terms" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
              <Search className="w-3 h-3" /> Termos Reais ({groupedTerms.length})
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
            {activeTab === "keywords"
              ? <span>Fonte: Google - Search · enriquecido com Search Keyword (lifetime)</span>
              : <span>Fonte: Google - Search 2 · termos digitados pelos usuários</span>}
          </div>
        </div>

        {/* Tabela Keywords */}
        {activeTab === "keywords" && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-700 text-white">
                    <th className="text-left py-2.5 px-3 font-semibold rounded-l-xl">Palavra-chave / Campanha</th>
                    <th className="text-left py-2.5 px-3 font-semibold">Tipo</th>
                    <th className="text-right py-2.5 px-3 font-semibold cursor-pointer hover:text-blue-300" onClick={() => handleKwSort("cost")}>Invest. <SortArrow field="cost" sortField={kwSort.field} sortOrder={kwSort.order} /></th>
                    <th className="text-right py-2.5 px-3 font-semibold cursor-pointer hover:text-blue-300" onClick={() => handleKwSort("clicks")}>Cliques <SortArrow field="clicks" sortField={kwSort.field} sortOrder={kwSort.order} /></th>
                    <th className="text-right py-2.5 px-3 font-semibold cursor-pointer hover:text-blue-300" onClick={() => handleKwSort("impressions")}>Impressões <SortArrow field="impressions" sortField={kwSort.field} sortOrder={kwSort.order} /></th>
                    <th className="text-right py-2.5 px-3 font-semibold cursor-pointer hover:text-blue-300" onClick={() => handleKwSort("ctr")}>CTR <SortArrow field="ctr" sortField={kwSort.field} sortOrder={kwSort.order} /></th>
                    <th className="text-right py-2.5 px-3 font-semibold cursor-pointer hover:text-blue-300" onClick={() => handleKwSort("avgCpc")}>CPC <SortArrow field="avgCpc" sortField={kwSort.field} sortOrder={kwSort.order} /></th>
                    <th className="text-right py-2.5 px-3 font-semibold cursor-pointer hover:text-blue-300" onClick={() => handleKwSort("conversions")}>Conv. <SortArrow field="conversions" sortField={kwSort.field} sortOrder={kwSort.order} /></th>
                    <th className="text-right py-2.5 px-3 font-semibold rounded-r-xl" title="Cliques acumulados no lifetime da keyword (Search Keyword)">Lifetime ↗</th>
                  </tr>
                </thead>
                <tbody>
                  {kwPaginated.map((r, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-slate-50/60" : "bg-white/40"}>
                      <td className="py-2.5 px-3 max-w-xs">
                        <p className="font-semibold text-gray-900 leading-tight">{r.keyword || "—"}</p>
                        <p className="text-gray-400 text-[10px] mt-0.5 truncate">{r.campaignName}</p>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-white text-[10px] font-semibold bg-blue-500">{r.matchType || "—"}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-gray-800">{fmtCurrency(r.cost)}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700">{r.clicks.toLocaleString("pt-BR")}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700">{r.impressions.toLocaleString("pt-BR")}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700">{fmtPct(r.ctr)}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700">{fmtCurrency(r.avgCpc)}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700">{r.conversions > 0 ? r.conversions.toLocaleString("pt-BR") : "—"}</td>
                      <td className="py-2.5 px-3 text-right">
                        {r.lifetimeClicks > 0
                          ? <span className="text-[10px] text-indigo-600 font-semibold">{r.lifetimeClicks.toLocaleString("pt-BR")} cliques</span>
                          : <span className="text-[10px] text-gray-300">—</span>}
                      </td>
                    </tr>
                  ))}
                  {groupedKeywords.length === 0 && (
                    <tr><td colSpan={9} className="py-10 text-center text-gray-400">Nenhum dado disponível</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">{(kwPage - 1) * PAGE + 1}–{Math.min(kwPage * PAGE, groupedKeywords.length)} de {groupedKeywords.length}</p>
              <div className="flex gap-2">
                <button onClick={() => setKwPage((p) => Math.max(p - 1, 1))} disabled={kwPage === 1}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-200 hover:bg-gray-50 disabled:opacity-40">← Anterior</button>
                <span className="px-3 py-1.5 text-xs text-gray-600">{kwPage}/{kwTotalPages}</span>
                <button onClick={() => setKwPage((p) => Math.min(p + 1, kwTotalPages))} disabled={kwPage === kwTotalPages}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-200 hover:bg-gray-50 disabled:opacity-40">Próximo →</button>
              </div>
            </div>
          </>
        )}

        {/* Tabela Termos Reais */}
        {activeTab === "terms" && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-700 text-white">
                    <th className="text-left py-2.5 px-3 font-semibold rounded-l-xl">Termo de Busca Real</th>
                    <th className="text-left py-2.5 px-3 font-semibold">Status</th>
                    <th className="text-right py-2.5 px-3 font-semibold cursor-pointer hover:text-blue-300" onClick={() => handleTermSort("cost")}>Invest. <SortArrow field="cost" sortField={termSort.field} sortOrder={termSort.order} /></th>
                    <th className="text-right py-2.5 px-3 font-semibold cursor-pointer hover:text-blue-300" onClick={() => handleTermSort("clicks")}>Cliques <SortArrow field="clicks" sortField={termSort.field} sortOrder={termSort.order} /></th>
                    <th className="text-right py-2.5 px-3 font-semibold cursor-pointer hover:text-blue-300" onClick={() => handleTermSort("impressions")}>Impressões <SortArrow field="impressions" sortField={termSort.field} sortOrder={termSort.order} /></th>
                    <th className="text-right py-2.5 px-3 font-semibold cursor-pointer hover:text-blue-300" onClick={() => handleTermSort("ctr")}>CTR <SortArrow field="ctr" sortField={termSort.field} sortOrder={termSort.order} /></th>
                    <th className="text-right py-2.5 px-3 font-semibold cursor-pointer hover:text-blue-300" onClick={() => handleTermSort("avgCpc")}>CPC <SortArrow field="avgCpc" sortField={termSort.field} sortOrder={termSort.order} /></th>
                    <th className="text-right py-2.5 px-3 font-semibold cursor-pointer hover:text-blue-300 rounded-r-xl" onClick={() => handleTermSort("conversions")}>Conv. <SortArrow field="conversions" sortField={termSort.field} sortOrder={termSort.order} /></th>
                  </tr>
                </thead>
                <tbody>
                  {termPaginated.map((r, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-slate-50/60" : "bg-white/40"}>
                      <td className="py-2.5 px-3 max-w-xs">
                        <p className="font-semibold text-gray-900 leading-tight">{r.searchTerm || "—"}</p>
                        <p className="text-gray-400 text-[10px] mt-0.5">{r.matchType}</p>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-white text-[10px] font-semibold ${r.addedExcluded === "ADDED" ? "bg-green-500" : r.addedExcluded === "EXCLUDED" ? "bg-red-500" : "bg-gray-400"}`}>
                          {r.addedExcluded || "—"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-gray-800">{fmtCurrency(r.cost)}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700">{r.clicks.toLocaleString("pt-BR")}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700">{r.impressions.toLocaleString("pt-BR")}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700">{fmtPct(r.ctr)}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700">{fmtCurrency(r.avgCpc)}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700">{r.conversions > 0 ? r.conversions.toLocaleString("pt-BR") : "—"}</td>
                    </tr>
                  ))}
                  {groupedTerms.length === 0 && (
                    <tr><td colSpan={8} className="py-10 text-center text-gray-400">Nenhum dado disponível</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">{(termPage - 1) * PAGE + 1}–{Math.min(termPage * PAGE, groupedTerms.length)} de {groupedTerms.length}</p>
              <div className="flex gap-2">
                <button onClick={() => setTermPage((p) => Math.max(p - 1, 1))} disabled={termPage === 1}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-200 hover:bg-gray-50 disabled:opacity-40">← Anterior</button>
                <span className="px-3 py-1.5 text-xs text-gray-600">{termPage}/{termTotalPages}</span>
                <button onClick={() => setTermPage((p) => Math.min(p + 1, termTotalPages))} disabled={termPage === termTotalPages}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-200 hover:bg-gray-50 disabled:opacity-40">Próximo →</button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  )
}

export default GoogleSearch
