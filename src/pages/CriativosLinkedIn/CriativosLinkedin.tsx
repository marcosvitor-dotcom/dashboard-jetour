"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { Calendar, Filter, ArrowUpDown, DollarSign, Eye, MousePointer, TrendingUp, Play } from "lucide-react"
import { useLinkedInCreatives } from "../../services/consolidadoApi"
import Loading from "../../components/Loading/Loading"

interface CreativeData {
  date: string
  campaignGroupName: string
  campaignName: string
  creativeTitle: string
  creativeText: string
  creativeThumbnail: string
  impressions: number
  clicks: number
  totalSpent: number
  videoViews: number
  videoViews25: number
  videoViews50: number
  videoViews75: number
  videoCompletions: number
  totalEngagements: number
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

const CriativosLinkedIn: React.FC = () => {
  const { data: apiData, loading, error } = useLinkedInCreatives()
  const [processedData, setProcessedData] = useState<CreativeData[]>([])
  const [dateRange, setDateRange] = useState<{start:string;end:string}>({start:"",end:""})
  const [selectedCampaign, setSelectedCampaign] = useState("")
  const [availableCampaigns, setAvailableCampaigns] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [sortOrder, setSortOrder] = useState<"desc"|"asc">("desc")
  const itemsPerPage = 10

  useEffect(() => {
    if (!apiData?.success || !apiData?.data?.values || apiData.data.values.length < 2) return
    const headers = apiData.data.values[0]
    const rows = apiData.data.values.slice(1)
    const parseN = (v:string) => Number.parseFloat((v||"").replace(/[R$\s.]/g,"").replace(",",".")) || 0
    const parseI = (v:string) => Number.parseInt((v||"").replace(/[.\s]/g,"").replace(",","")) || 0
    const cSet = new Set<string>()

    const processed: CreativeData[] = rows.map((row:string[]) => {
      const campaignName = row[headers.indexOf("Campaign Name")] || ""
      if (campaignName) cSet.add(campaignName)
      return {
        date: row[headers.indexOf("Day")] || "",
        campaignGroupName: row[headers.indexOf("Campaign Group Name")] || "",
        campaignName,
        creativeTitle: (row[headers.indexOf("Ad Name")] || "").trim(),
        creativeText: row[headers.indexOf("Ad Text")] || "",
        creativeThumbnail: row[headers.indexOf("Ad Thumbnail")] || "",
        impressions: parseI(row[headers.indexOf("Impressions")]),
        clicks: parseI(row[headers.indexOf("Landing Page Clicks")]),
        totalSpent: parseN(row[headers.indexOf("Cost In Local Currency (Spend)")]),
        videoViews: parseI(row[headers.indexOf("Video Views")]),
        videoViews25: parseI(row[headers.indexOf("Video First Quartile Completions")]),
        videoViews50: parseI(row[headers.indexOf("Video Midpoint Completions")]),
        videoViews75: parseI(row[headers.indexOf("Video Third Quartile Completions")]),
        videoCompletions: parseI(row[headers.indexOf("Video Completions")]),
        totalEngagements: parseI(row[headers.indexOf("Total Engagements")]),
      }
    }).filter((r) => r.date && r.impressions > 0)

    setProcessedData(processed)
    setAvailableCampaigns(Array.from(cSet).sort())
    if (processed.length > 0) {
      const dates = processed.map((r) => isoDate(r.date)).filter(Boolean).sort()
      setDateRange({start:dates[0],end:dates[dates.length-1]})
    }
  }, [apiData])

  const filtered = useMemo(() => processedData.filter((r) => {
    const iso = isoDate(r.date)
    if (dateRange.start && iso < dateRange.start) return false
    if (dateRange.end && iso > dateRange.end) return false
    if (selectedCampaign && r.campaignName !== selectedCampaign) return false
    return true
  }), [processedData, dateRange, selectedCampaign])

  const grouped = useMemo(() => {
    const map = new Map<string, CreativeData>()
    filtered.forEach((r) => {
      const key = `${r.creativeTitle}||${r.campaignName}`
      if (!map.has(key)) { map.set(key,{...r}) } else {
        const g = map.get(key)!
        g.impressions += r.impressions; g.clicks += r.clicks; g.totalSpent += r.totalSpent
        g.videoViews += r.videoViews; g.videoViews25 += r.videoViews25
        g.videoViews50 += r.videoViews50; g.videoViews75 += r.videoViews75
        g.videoCompletions += r.videoCompletions; g.totalEngagements += r.totalEngagements
      }
    })
    return Array.from(map.values()).sort((a,b) => sortOrder==="desc" ? b.impressions-a.impressions : a.impressions-b.impressions)
  }, [filtered, sortOrder])

  const totals = useMemo(() => {
    const investment = filtered.reduce((s,r)=>s+r.totalSpent,0)
    const impressions = filtered.reduce((s,r)=>s+r.impressions,0)
    const clicks = filtered.reduce((s,r)=>s+r.clicks,0)
    const videoViews = filtered.reduce((s,r)=>s+r.videoViews,0)
    const videoComp = filtered.reduce((s,r)=>s+r.videoCompletions,0)
    return {
      investment, impressions, clicks, videoViews,
      cpm: impressions>0 ? investment/(impressions/1000) : 0,
      cpc: clicks>0 ? investment/clicks : 0,
      ctr: impressions>0 ? (clicks/impressions)*100 : 0,
      vtr: videoViews>0 ? (videoComp/videoViews)*100 : 0,
    }
  }, [filtered])

  const totalPages = Math.ceil(grouped.length/itemsPerPage)
  const paginated = grouped.slice((currentPage-1)*itemsPerPage, currentPage*itemsPerPage)

  if (loading) return <Loading message="Carregando criativos LinkedIn..." />
  if (error) return <div className="bg-red-50/90 border border-red-200 rounded-2xl p-4"><p className="text-red-600">Erro: {error.message}</p></div>

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card-overlay rounded-2xl shadow-lg px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/images/Jetour_logo.svg" alt="Jetour" className="h-7 object-contain" />
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Criativos — LinkedIn</h1>
            <p className="text-xs text-gray-500">Performance por criativo no LinkedIn Ads</p>
          </div>
        </div>
        <svg className="w-7 h-7 text-blue-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" fill="currentColor">
          <path d="M41,4H9C6.24,4,4,6.24,4,9v32c0,2.76,2.24,5,5,5h32c2.76,0,5-2.24,5-5V9C46,6.24,43.76,4,41,4z M17,20v19h-6V20H17z M11,14.47c0-1.4,1.2-2.47,3-2.47s2.93,1.07,3,2.47c0,1.4-1.12,2.53-3,2.53C12.2,17,11,15.87,11,14.47z M39,39h-6c0,0,0-9.26,0-10c0-2-1-4-3.5-4.04h-0.08C27,24.96,26,27.02,26,29c0,0.91,0,10,0,10h-6V20h6v2.56c0,0,1.93-2.56,5.81-2.56c3.97,0,7.19,2.73,7.19,8.26V39z"/>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                <th className="text-left py-2.5 px-3 font-semibold rounded-l-xl w-16">Thumb</th>
                <th className="text-left py-2.5 px-3 font-semibold">Criativo / Campanha</th>
                <th className="text-right py-2.5 px-3 font-semibold">Investimento</th>
                <th className="text-right py-2.5 px-3 font-semibold">Impressões</th>
                <th className="text-right py-2.5 px-3 font-semibold">Cliques</th>
                <th className="text-right py-2.5 px-3 font-semibold">CTR</th>
                <th className="text-right py-2.5 px-3 font-semibold">Video Views</th>
                <th className="text-right py-2.5 px-3 font-semibold">VTR</th>
                <th className="text-right py-2.5 px-3 font-semibold">CPM</th>
                <th className="text-right py-2.5 px-3 font-semibold rounded-r-xl">Engajamentos</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((c,i) => {
                const ctr = c.impressions>0 ? (c.clicks/c.impressions)*100 : 0
                const vtr = c.videoViews>0 ? (c.videoCompletions/c.videoViews)*100 : 0
                const cpm = c.impressions>0 ? c.totalSpent/(c.impressions/1000) : 0
                return (
                  <tr key={i} className={i%2===0?"bg-slate-50/60":"bg-white/40"}>
                    <td className="py-2.5 px-3">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
                        {c.creativeThumbnail ? (
                          <img src={c.creativeThumbnail} alt="Thumb" className="w-full h-full object-cover"
                            onError={(e)=>{(e.target as HTMLImageElement).style.display="none"}}/>
                        ) : <Eye className="w-5 h-5 text-gray-300"/>}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 max-w-xs">
                      <p className="font-semibold text-gray-900 leading-tight line-clamp-2">{c.creativeTitle||"—"}</p>
                      <p className="text-gray-400 text-xs mt-0.5 truncate">{c.campaignName}</p>
                      {c.creativeText && <p className="text-gray-400 text-xs mt-0.5 line-clamp-1 italic">{c.creativeText}</p>}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-gray-800">{fmtCurrency(c.totalSpent)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-700">{fmt(c.impressions)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-700">{fmt(c.clicks)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-700">{fmtPct(ctr)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-700">{fmt(c.videoViews)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-700">{fmtPct(vtr)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-700">{fmtCurrency(cpm)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-700">{fmt(c.totalEngagements)}</td>
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

export default CriativosLinkedIn
