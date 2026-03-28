"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { Calendar, Filter, ArrowUpDown, DollarSign, Eye, MousePointer, TrendingUp, Play } from "lucide-react"
import { useGoogleAdsCreatives } from "../../services/consolidadoApi"
import Loading from "../../components/Loading/Loading"

interface CreativeData {
  date: string
  campaign: string
  adGroup: string
  ad: string
  impressions: number
  clicks: number
  cost: number
  videoViews: number
  videoViews25: number
  videoViews50: number
  videoViews75: number
  videoViews100: number
  engagements: number
  tipoCompra: string
}

const fmt = (v: number) => {
  if (v >= 1_000_000) return `${(v/1_000_000).toFixed(1).replace(".","," )} mi`
  if (v >= 1_000) return `${(v/1_000).toFixed(0)} mil`
  return v.toLocaleString("pt-BR")
}
const fmtCurrency = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`
const fmtPct = (v: number) => `${v.toFixed(2)}%`
const isoDate = (s: string) => {
  if (!s) return ""
  const p = s.split("/")
  if (p.length===3) return `${p[2]}-${p[1].padStart(2,"0")}-${p[0].padStart(2,"0")}`
  return s
}

const CriativosGoogleAds: React.FC = () => {
  const { data: apiData, loading, error } = useGoogleAdsCreatives()
  const [processedData, setProcessedData] = useState<CreativeData[]>([])
  const [dateRange, setDateRange] = useState<{start:string;end:string}>({start:"",end:""})
  const [selectedCampaign, setSelectedCampaign] = useState("")
  const [selectedTipoCompra, setSelectedTipoCompra] = useState("")
  const [availableCampaigns, setAvailableCampaigns] = useState<string[]>([])
  const [availableTiposCompra, setAvailableTiposCompra] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [sortOrder, setSortOrder] = useState<"desc"|"asc">("desc")
  const itemsPerPage = 10

  useEffect(() => {
    if (!apiData?.success || !apiData?.data?.values || apiData.data.values.length < 2) return
    const headers = apiData.data.values[0]
    const rows = apiData.data.values.slice(1)
    const parseN = (v:string) => Number.parseFloat((v||"").replace(/[R$\s.]/g,"").replace(",",".")) || 0
    const parseI = (v:string) => Number.parseInt((v||"").replace(/[.\s]/g,"").replace(",","")) || 0
    const cSet = new Set<string>(), tSet = new Set<string>()

    const processed: CreativeData[] = rows.map((row:string[]) => {
      const campaign = row[headers.indexOf("Campaign Name")] || ""
      const tipoCompra = row[headers.indexOf("Tipo de Compra")] || ""
      if (campaign) cSet.add(campaign)
      if (tipoCompra) tSet.add(tipoCompra)
      return {
        date: row[headers.indexOf("Day")] || "",
        campaign,
        adGroup: row[headers.indexOf("Ad Group Name")] || "",
        ad: (row[headers.indexOf("Ad Name")] || "").trim(),
        impressions: parseI(row[headers.indexOf("Impressions")]),
        clicks: parseI(row[headers.indexOf("Clicks")]),
        cost: parseN(row[headers.indexOf("Cost (Spend)")]),
        videoViews: parseI(row[headers.indexOf("Video Views")]),
        videoViews25: parseI(row[headers.indexOf("Video played to 25%")]),
        videoViews50: parseI(row[headers.indexOf("Video played to 50%")]),
        videoViews75: parseI(row[headers.indexOf("Video played to 75%")]),
        videoViews100: parseI(row[headers.indexOf("Video played to 100%")]),
        engagements: parseI(row[headers.indexOf("Engagements")]),
        tipoCompra,
      }
    }).filter((r) => r.date && r.impressions > 0)

    setProcessedData(processed)
    setAvailableCampaigns(Array.from(cSet).sort())
    setAvailableTiposCompra(Array.from(tSet).sort())
    if (processed.length > 0) {
      const dates = processed.map((r) => isoDate(r.date)).filter(Boolean).sort()
      setDateRange({start:dates[0],end:dates[dates.length-1]})
    }
  }, [apiData])

  const filtered = useMemo(() => processedData.filter((r) => {
    const iso = isoDate(r.date)
    if (dateRange.start && iso < dateRange.start) return false
    if (dateRange.end && iso > dateRange.end) return false
    if (selectedCampaign && r.campaign !== selectedCampaign) return false
    if (selectedTipoCompra && r.tipoCompra !== selectedTipoCompra) return false
    return true
  }), [processedData, dateRange, selectedCampaign, selectedTipoCompra])

  const grouped = useMemo(() => {
    const map = new Map<string, CreativeData>()
    filtered.forEach((r) => {
      const key = `${r.ad}||${r.campaign}`
      if (!map.has(key)) { map.set(key,{...r}) } else {
        const g = map.get(key)!
        g.impressions += r.impressions; g.clicks += r.clicks; g.cost += r.cost
        g.videoViews += r.videoViews; g.videoViews25 += r.videoViews25
        g.videoViews50 += r.videoViews50; g.videoViews75 += r.videoViews75
        g.videoViews100 += r.videoViews100; g.engagements += r.engagements
      }
    })
    return Array.from(map.values()).sort((a,b) => sortOrder==="desc" ? b.impressions-a.impressions : a.impressions-b.impressions)
  }, [filtered, sortOrder])

  const totals = useMemo(() => {
    const investment = filtered.reduce((s,r)=>s+r.cost,0)
    const impressions = filtered.reduce((s,r)=>s+r.impressions,0)
    const clicks = filtered.reduce((s,r)=>s+r.clicks,0)
    const videoViews = filtered.reduce((s,r)=>s+r.videoViews,0)
    const video100 = filtered.reduce((s,r)=>s+r.videoViews100,0)
    return {
      investment, impressions, clicks, videoViews,
      cpm: impressions>0 ? investment/(impressions/1000) : 0,
      cpc: clicks>0 ? investment/clicks : 0,
      ctr: impressions>0 ? (clicks/impressions)*100 : 0,
      vtr: videoViews>0 ? (video100/videoViews)*100 : 0,
    }
  }, [filtered])

  const totalPages = Math.ceil(grouped.length/itemsPerPage)
  const paginated = grouped.slice((currentPage-1)*itemsPerPage, currentPage*itemsPerPage)

  if (loading) return <Loading message="Carregando criativos Google Ads..." />
  if (error) return <div className="bg-red-50/90 border border-red-200 rounded-2xl p-4"><p className="text-red-600">Erro: {error.message}</p></div>

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card-overlay rounded-2xl shadow-lg px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/images/Jetour_logo.svg" alt="Jetour" className="h-7 object-contain" />
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Criativos — Google Ads</h1>
            <p className="text-xs text-gray-500">Performance por criativo no Google (Search + PMAX)</p>
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
          { label:"Investimento", value:fmtCurrency(totals.investment), icon:<DollarSign className="w-4 h-4"/> },
          { label:"Impressões",   value:fmt(totals.impressions),         icon:<Eye className="w-4 h-4"/> },
          { label:"Cliques",      value:fmt(totals.clicks),              icon:<MousePointer className="w-4 h-4"/> },
          { label:"Video Views",  value:fmt(totals.videoViews),          icon:<Play className="w-4 h-4"/> },
          { label:"CPM",          value:fmtCurrency(totals.cpm),         icon:<TrendingUp className="w-4 h-4"/> },
          { label:"CPC",          value:totals.clicks>0?fmtCurrency(totals.cpc):"—", icon:<DollarSign className="w-4 h-4"/> },
          { label:"CTR",          value:fmtPct(totals.ctr),              icon:<TrendingUp className="w-4 h-4"/> },
          { label:"VTR",          value:fmtPct(totals.vtr),              icon:<Play className="w-4 h-4"/> },
        ].map((c) => (
          <div key={c.label} className="bg-slate-700/80 rounded-2xl px-3 py-3 flex flex-col gap-1 text-white">
            <div className="flex items-center gap-1.5 text-slate-300 text-xs">{c.icon}{c.label}</div>
            <div className="text-sm font-bold truncate">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card-overlay rounded-2xl shadow-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1"><Filter className="w-3.5 h-3.5"/>Campanha</label>
            <div className="relative">
              <select value={selectedCampaign} onChange={(e)=>{setSelectedCampaign(e.target.value);setCurrentPage(1)}}
                className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-xl text-xs font-medium text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todas</option>
                {availableCampaigns.map((c)=><option key={c} value={c}>{c}</option>)}
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tipo de Compra</label>
            <div className="relative">
              <select value={selectedTipoCompra} onChange={(e)=>{setSelectedTipoCompra(e.target.value);setCurrentPage(1)}}
                className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-xl text-xs font-medium text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todos</option>
                {availableTiposCompra.map((t)=><option key={t} value={t}>{t}</option>)}
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1"><Calendar className="w-3.5 h-3.5"/>De</label>
            <input type="date" value={dateRange.start} onChange={(e)=>{setDateRange(p=>({...p,start:e.target.value}));setCurrentPage(1)}}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1"><Calendar className="w-3.5 h-3.5"/>Até</label>
            <input type="date" value={dateRange.end} onChange={(e)=>{setDateRange(p=>({...p,end:e.target.value}));setCurrentPage(1)}}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card-overlay rounded-2xl shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-gray-800">Criativos ({grouped.length})</p>
          <button onClick={()=>setSortOrder(o=>o==="desc"?"asc":"desc")}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 text-gray-700 transition-colors">
            <ArrowUpDown className="w-3.5 h-3.5"/> Ordenar
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-700 text-white">
                <th className="text-left py-2.5 px-3 font-semibold rounded-l-xl">Anúncio / Campanha</th>
                <th className="text-left py-2.5 px-3 font-semibold">Grupo</th>
                <th className="text-right py-2.5 px-3 font-semibold">Investimento</th>
                <th className="text-right py-2.5 px-3 font-semibold">Impressões</th>
                <th className="text-right py-2.5 px-3 font-semibold">Cliques</th>
                <th className="text-right py-2.5 px-3 font-semibold">CTR</th>
                <th className="text-right py-2.5 px-3 font-semibold">Video Views</th>
                <th className="text-right py-2.5 px-3 font-semibold">VTR</th>
                <th className="text-right py-2.5 px-3 font-semibold">CPM</th>
                <th className="text-right py-2.5 px-3 font-semibold rounded-r-xl">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((c,i) => {
                const ctr = c.impressions>0 ? (c.clicks/c.impressions)*100 : 0
                const vtr = c.videoViews>0 ? (c.videoViews100/c.videoViews)*100 : 0
                const cpm = c.impressions>0 ? c.cost/(c.impressions/1000) : 0
                return (
                  <tr key={i} className={i%2===0?"bg-slate-50/60":"bg-white/40"}>
                    <td className="py-2.5 px-3 max-w-[200px]">
                      <p className="font-semibold text-gray-900 leading-tight line-clamp-2">{c.ad||"—"}</p>
                      <p className="text-gray-400 text-xs mt-0.5 truncate">{c.campaign}</p>
                    </td>
                    <td className="py-2.5 px-3 text-gray-500 max-w-[120px] truncate">{c.adGroup}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-gray-800">{fmtCurrency(c.cost)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-700">{fmt(c.impressions)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-700">{fmt(c.clicks)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-700">{fmtPct(ctr)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-700">{fmt(c.videoViews)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-700">{fmtPct(vtr)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-700">{fmtCurrency(cpm)}</td>
                    <td className="py-2.5 px-3 text-right">
                      {c.tipoCompra ? <span className="px-2 py-0.5 rounded-full text-white text-xs font-semibold bg-blue-500">{c.tipoCompra}</span> : "—"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">{(currentPage-1)*itemsPerPage+1}–{Math.min(currentPage*itemsPerPage,grouped.length)} de {grouped.length}</p>
          <div className="flex gap-2">
            <button onClick={()=>setCurrentPage(p=>Math.max(p-1,1))} disabled={currentPage===1}
              className="px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">← Anterior</button>
            <span className="px-3 py-1.5 text-xs text-gray-600">{currentPage}/{totalPages}</span>
            <button onClick={()=>setCurrentPage(p=>Math.min(p+1,totalPages))} disabled={currentPage===totalPages}
              className="px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Próximo →</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CriativosGoogleAds
