"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { useLinkedInOrganicData } from "../../services/consolidadoApi"
import Loading from "../../components/Loading/Loading"
import {
  Users, Eye, Heart, MessageCircle, Share2, TrendingUp, TrendingDown, MousePointer,
  ArrowUpDown, ExternalLink, BarChart2
} from "lucide-react"
import { ResponsiveLine } from "@nivo/line"

// ── Types ─────────────────────────────────────────────────────────────────────

interface LiPost {
  day: string
  postDate: string
  creatorName: string
  mediaCategory: string
  postText: string
  thumbnail: string
  postUrl: string
  clicks: number
  comments: number
  engagement: number
  impressions: number
  likes: number
  shares: number
  uniqueImpressions: number
  engagementRate: number
}

interface LiFollowerDay {
  date: string
  organicGain: number
  paidGain: number
}

interface LiRegion {
  region: string
  organicCount: number
}

interface LiSeniority {
  seniority: string
  allPageViews: number
}

interface LiPageRegion {
  region: string
  allPageViews: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const parseN = (v: string) => {
  if (!v || v === "-" || v === "") return 0
  const n = Number(v.replace(/\./g, "").replace(",", "."))
  return isNaN(n) ? 0 : n
}

const parseF = (v: string) => {
  if (!v || v === "-" || v === "") return 0
  const n = parseFloat(v.replace(",", "."))
  return isNaN(n) ? 0 : n
}

const fmt = (v: number) => v.toLocaleString("pt-BR")

const fmtPct = (v: number) => `${(v * 100).toFixed(2).replace(".", ",")}%`
const fmtPctRaw = (v: number) => `${v.toFixed(2).replace(".", ",")}%`

// ── Line Chart ────────────────────────────────────────────────────────────────

const LineChart: React.FC<{
  series: { id: string; color: string; data: { x: string; y: number }[] }[]
  label: string
}> = ({ series, label }) => {
  const allData = series.flatMap((s) => s.data)
  if (allData.length < 2) return null

  const sampleSeries = series.map((s) => ({
    ...s,
    data: s.data.filter((_, i) => i % Math.max(1, Math.floor(s.data.length / 40)) === 0 || i === s.data.length - 1),
  }))
  const tickStep = Math.max(1, Math.floor(sampleSeries[0].data.length / 6))
  const xTickValues = sampleSeries[0].data
    .filter((_, i) => i % tickStep === 0 || i === sampleSeries[0].data.length - 1)
    .map((d) => d.x)

  const fmtDate = (iso: string) => {
    const parts = iso.split("-")
    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : iso
  }

  return (
    <div>
      <p className="text-xs font-semibold text-gray-700 mb-1">{label}</p>
      <div style={{ height: 140 }}>
        <ResponsiveLine
          data={sampleSeries}
          margin={{ top: 8, right: 16, bottom: 32, left: 48 }}
          xScale={{ type: "point" }}
          yScale={{ type: "linear", min: "auto", max: "auto", stacked: false }}
          curve="monotoneX"
          axisTop={null}
          axisRight={null}
          axisBottom={{ tickSize: 3, tickPadding: 4, tickRotation: -30, tickValues: xTickValues, format: fmtDate }}
          axisLeft={{ tickSize: 3, tickPadding: 4, tickValues: 4, format: (v: number) => fmt(v) }}
          enableGridX={false}
          enableGridY
          gridYValues={4}
          theme={{ grid: { line: { stroke: "#e5e7eb", strokeWidth: 1 } }, axis: { ticks: { text: { fontSize: 9, fill: "#9ca3af" } } } }}
          colors={sampleSeries.map((s) => s.color)}
          lineWidth={2}
          pointSize={0}
          enableArea={sampleSeries.length === 1}
          areaOpacity={0.12}
          useMesh
          tooltip={({ point }) => (
            <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
              <p className="text-gray-500 mb-0.5">{fmtDate(point.data.x as string)} — {point.seriesId}</p>
              <p className="font-bold text-gray-900">{fmt(point.data.y as number)}</p>
            </div>
          )}
        />
      </div>
      {sampleSeries.length > 1 && (
        <div className="flex gap-4 mt-1 justify-end">
          {sampleSeries.map((s) => (
            <div key={s.id} className="flex items-center gap-1">
              <div className="w-3 h-0.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-[10px] text-gray-500">{s.id}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Bar Chart (horizontal) ────────────────────────────────────────────────────

const HBarChart: React.FC<{
  data: { label: string; value: number }[]
  color: string
  label: string
}> = ({ data, color, label }) => {
  if (data.length === 0) return null
  const max = Math.max(...data.map((d) => d.value), 1)

  return (
    <div>
      <p className="text-xs font-semibold text-gray-700 mb-2">{label}</p>
      <div className="flex flex-col gap-1.5">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2">
            <span className="text-[10px] text-gray-600 w-28 truncate text-right" title={d.label}>{d.label}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(d.value / max) * 100}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-[10px] text-gray-500 w-12">{fmt(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Post card (LinkedIn) ──────────────────────────────────────────────────────

const LiPostCard: React.FC<{ post: LiPost }> = ({ post }) => {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div
        className="card-overlay rounded-2xl shadow p-3 flex flex-col gap-2 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setOpen(true)}
      >
        {/* Thumbnail */}
        <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl h-28 flex items-center justify-center overflow-hidden relative">
          {post.thumbnail ? (
            <img src={post.thumbnail} alt="post" className="w-full h-full object-cover rounded-xl" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-[#0077b5]">
              <svg className="w-8 h-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" fill="currentColor">
                <path d="M41,4H9C6.24,4,4,6.24,4,9v32c0,2.76,2.24,5,5,5h32c2.76,0,5-2.24,5-5V9C46,6.24,43.76,4,41,4z M17,20v19h-6V20H17z M11,14.47c0-1.4,1.2-2.47,3-2.47s2.93,1.07,3,2.47c0,1.4-1.12,2.53-3,2.53C12.2,17,11,15.87,11,14.47z M39,39h-6c0,0,0-9.26,0-10c0-2-1-4-3.5-4.04h-0.08C27,24.96,26,27.02,26,29c0,0.91,0,10,0,10h-6V20h6v2.56c0,0,1.93-2.56,5.81-2.56c3.97,0,7.19,2.73,7.19,8.26V39z"/>
              </svg>
              <span className="text-xs font-medium">{post.mediaCategory || "POST"}</span>
            </div>
          )}
          {post.mediaCategory && (
            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-white text-[9px] font-semibold bg-[#0077b5]/80">
              {post.mediaCategory}
            </span>
          )}
        </div>

        {/* Texto */}
        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{post.postText || "—"}</p>

        {/* Métricas resumo */}
        <div className="grid grid-cols-3 gap-1">
          <div className="text-center">
            <p className="text-xs font-bold text-gray-900">{fmt(post.impressions)}</p>
            <p className="text-[10px] text-gray-400">Impressões</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-gray-900">{fmt(post.likes)}</p>
            <p className="text-[10px] text-gray-400">Curtidas</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-[#0077b5]">{fmtPct(post.engagementRate)}</p>
            <p className="text-[10px] text-gray-400">Engaj.</p>
          </div>
        </div>
      </div>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl overflow-auto max-h-[90vh] w-full max-w-lg p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-800">LinkedIn — {post.mediaCategory || "Post"}</p>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {post.thumbnail ? (
              <div className="rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center">
                <img src={post.thumbnail} alt="criativo" className="w-full object-contain max-h-72 rounded-xl" />
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 leading-relaxed">
                {post.postText || "Sem imagem disponível"}
              </div>
            )}

            {post.postText && (
              <p className="mt-3 text-xs text-gray-500 leading-relaxed line-clamp-3">{post.postText}</p>
            )}

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: "Impressões", value: fmt(post.impressions) },
                { label: "Únicas", value: fmt(post.uniqueImpressions) },
                { label: "Cliques", value: fmt(post.clicks) },
                { label: "Curtidas", value: fmt(post.likes) },
                { label: "Comentários", value: fmt(post.comments) },
                { label: "Compartilh.", value: fmt(post.shares) },
              ].map((m) => (
                <div key={m.label} className="bg-slate-700/80 rounded-xl px-3 py-2 text-white text-center">
                  <p className="text-xs text-slate-300">{m.label}</p>
                  <p className="text-sm font-bold">{m.value}</p>
                </div>
              ))}
            </div>
            {post.postUrl && (
              <a href={post.postUrl} target="_blank" rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#0077b5] hover:underline">
                <ExternalLink className="w-3.5 h-3.5" />
                Ver no LinkedIn
              </a>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

const OrganicoLinkedIn: React.FC = () => {
  const { liFollowers, liFollowerRegion, liPosts, liPageSeniority, liPageRegion, loading, error } = useLinkedInOrganicData()
  const [sortBy, setSortBy] = useState<"impressions" | "engagementRate" | "likes" | "comments" | "shares" | "clicks">("impressions")
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" })
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 10

  // ── Parse Followers ─────────────────────────────────────────────────────────
  const followerDays = useMemo<LiFollowerDay[]>(() => {
    if (!liFollowers?.data?.values || liFollowers.data.values.length < 2) return []
    const [headers, ...rows] = liFollowers.data.values
    const idx = (col: string) => headers.indexOf(col)
    return rows
      .map((r) => ({
        date: r[idx("Day")] || "",
        organicGain: parseN(r[idx("Organic Follower Gain")]),
        paidGain: parseN(r[idx("Paid Follower Gain")]),
      }))
      .filter((d) => d.date && d.date.match(/^\d{4}-\d{2}-\d{2}$/))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [liFollowers])

  // ── Parse Posts ─────────────────────────────────────────────────────────────
  const allPosts = useMemo<LiPost[]>(() => {
    if (!liPosts?.data?.values || liPosts.data.values.length < 2) return []
    const [headers, ...rows] = liPosts.data.values
    const idx = (col: string) => headers.indexOf(col)
    return rows.map((r) => {
      const impressions = parseN(r[idx("Impressions")])
      const engagement = parseF(r[idx("Engagement")])
      const engagementRate = engagement
      return {
        day: r[idx("Day")] || "",
        postDate: r[idx("Post Date")] || "",
        creatorName: r[idx("Post Creator Name")] || "",
        mediaCategory: r[idx("Post Media Category")] || "",
        postText: r[idx("Post Text")] || "",
        thumbnail: r[idx("Post Thumbnail")] || "",
        postUrl: r[idx("Post Url")] || "",
        clicks: parseN(r[idx("Clicks")]),
        comments: parseN(r[idx("Comments")]),
        engagement,
        impressions,
        likes: parseN(r[idx("Likes")]),
        shares: parseN(r[idx("Shares")]),
        uniqueImpressions: parseN(r[idx("Unique Impressions")]),
        engagementRate,
      }
    }).filter((p) => p.impressions > 0 || p.postUrl)
  }, [liPosts])

  // ── Parse Follower Region ───────────────────────────────────────────────────
  const followerRegions = useMemo<LiRegion[]>(() => {
    if (!liFollowerRegion?.data?.values || liFollowerRegion.data.values.length < 2) return []
    const [headers, ...rows] = liFollowerRegion.data.values
    const idx = (col: string) => headers.indexOf(col)
    return rows
      .map((r) => ({
        region: r[idx("Member Region")] || "",
        organicCount: parseN(r[idx("Organic Follower Count")]),
      }))
      .filter((r) => r.region && r.organicCount > 0)
      .sort((a, b) => b.organicCount - a.organicCount)
      .slice(0, 10)
  }, [liFollowerRegion])

  // ── Parse Page Seniority ────────────────────────────────────────────────────
  const seniorities = useMemo<LiSeniority[]>(() => {
    if (!liPageSeniority?.data?.values || liPageSeniority.data.values.length < 2) return []
    const [headers, ...rows] = liPageSeniority.data.values
    const idx = (col: string) => headers.indexOf(col)
    return rows
      .map((r) => ({
        seniority: r[idx("Member Seniority")] || "",
        allPageViews: parseN(r[idx("All Page Views")]),
      }))
      .filter((s) => s.seniority && s.allPageViews > 0)
      .sort((a, b) => b.allPageViews - a.allPageViews)
  }, [liPageSeniority])

  // ── Parse Page Region ───────────────────────────────────────────────────────
  const pageRegions = useMemo<LiPageRegion[]>(() => {
    if (!liPageRegion?.data?.values || liPageRegion.data.values.length < 2) return []
    const [headers, ...rows] = liPageRegion.data.values
    const idx = (col: string) => headers.indexOf(col)
    return rows
      .map((r) => ({
        region: r[idx("Member Region")] || "",
        allPageViews: parseN(r[idx("All Page Views")]),
      }))
      .filter((r) => r.region && r.allPageViews > 0)
      .sort((a, b) => b.allPageViews - a.allPageViews)
      .slice(0, 10)
  }, [liPageRegion])

  // ── Date range ──────────────────────────────────────────────────────────────
  const allDates = followerDays.map((d) => d.date)
  const minDate = allDates[0] ?? ""
  const maxDate = allDates[allDates.length - 1] ?? ""
  const start = dateRange.start || minDate
  const end = dateRange.end || maxDate

  const filteredDays = useMemo(() =>
    followerDays.filter((d) => (!start || d.date >= start) && (!end || d.date <= end)),
    [followerDays, start, end]
  )

  // ── Big numbers ─────────────────────────────────────────────────────────────
  const bigNumbers = useMemo(() => {
    const gainSeguidores = filteredDays.reduce((s, d) => s + d.organicGain, 0)
    const totalImpressions = allPosts.reduce((s, p) => s + p.impressions, 0)
    const totalUniqueImpressions = allPosts.reduce((s, p) => s + p.uniqueImpressions, 0)
    const totalClicks = allPosts.reduce((s, p) => s + p.clicks, 0)
    const totalLikes = allPosts.reduce((s, p) => s + p.likes, 0)
    const totalComments = allPosts.reduce((s, p) => s + p.comments, 0)
    const totalShares = allPosts.reduce((s, p) => s + p.shares, 0)
    const avgEngagement = allPosts.length > 0
      ? allPosts.reduce((s, p) => s + p.engagementRate, 0) / allPosts.length
      : 0
    return { gainSeguidores, totalImpressions, totalUniqueImpressions, totalClicks, totalLikes, totalComments, totalShares, avgEngagement }
  }, [filteredDays, allPosts])

  // ── Trend ────────────────────────────────────────────────────────────────────
  const liTrend = useMemo(() => {
    if (followerDays.length < 2) return 0
    const last7 = followerDays.slice(-7).reduce((s, d) => s + d.organicGain, 0)
    const prev7 = followerDays.slice(-14, -7).reduce((s, d) => s + d.organicGain, 0)
    if (prev7 === 0) return last7 > 0 ? 100 : 0
    return ((last7 - prev7) / prev7) * 100
  }, [followerDays])

  // ── Charts ──────────────────────────────────────────────────────────────────
  const followerChartData = useMemo(() =>
    filteredDays.map((d) => ({ x: d.date, y: d.organicGain })),
    [filteredDays]
  )

  const impressionsChartData = useMemo(() => {
    const byDate = new Map<string, number>()
    allPosts.forEach((p) => {
      const dateKey = p.day
      byDate.set(dateKey, (byDate.get(dateKey) ?? 0) + p.impressions)
    })
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([x, y]) => ({ x, y }))
  }, [allPosts])

  // ── Day-of-week activity ─────────────────────────────────────────────────────
  const dowActivity = useMemo(() => {
    const labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
    const sums = [0, 0, 0, 0, 0, 0, 0]
    const counts = [0, 0, 0, 0, 0, 0, 0]
    filteredDays.forEach((d) => {
      const dow = new Date(d.date + "T12:00:00").getDay()
      sums[dow] += d.organicGain
      counts[dow]++
    })
    return labels.map((label, i) => ({ label, avg: counts[i] > 0 ? sums[i] / counts[i] : 0 }))
  }, [filteredDays])
  const maxDow = Math.max(...dowActivity.map((d) => d.avg), 1)

  // ── Sorted posts ─────────────────────────────────────────────────────────────
  const sortedPosts = useMemo(() =>
    [...allPosts].sort((a, b) => b[sortBy] - a[sortBy]),
    [allPosts, sortBy]
  )

  const totalPages = Math.ceil(sortedPosts.length / PAGE_SIZE)
  const pagedPosts = sortedPosts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  if (loading) return <Loading message="Carregando dados do LinkedIn..." />
  if (error) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-red-500">Erro ao carregar dados: {error.message}</p>
    </div>
  )

  return (
    <div className="h-full flex flex-col space-y-4 overflow-auto">

      {/* Header */}
      <div className="card-overlay rounded-2xl shadow-lg px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 shrink-0 rounded-xl bg-[#0077b5] flex items-center justify-center">
            <svg className="w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" fill="currentColor">
              <path d="M41,4H9C6.24,4,4,6.24,4,9v32c0,2.76,2.24,5,5,5h32c2.76,0,5-2.24,5-5V9C46,6.24,43.76,4,41,4z M17,20v19h-6V20H17z M11,14.47c0-1.4,1.2-2.47,3-2.47s2.93,1.07,3,2.47c0,1.4-1.12,2.53-3,2.53C12.2,17,11,15.87,11,14.47z M39,39h-6c0,0,0-9.26,0-10 c0-2-1-4-3.5-4.04h-0.08C27,24.96,26,27.02,26,29c0,0.91,0,10,0,10h-6V20h6v2.56c0,0,1.93-2.56,5.81-2.56 c3.97,0,7.19,2.73,7.19,8.26V39z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 leading-tight">Orgânico — LinkedIn</h1>
            <p className="text-xs text-gray-500">Performance orgânica da página Jetour Brasil</p>
          </div>
          <div
            title="Comparado à semana anterior (novos seguidores orgânicos)"
            className="shrink-0 flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full cursor-default"
            style={{ backgroundColor: liTrend >= 0 ? "#dcfce7" : "#fee2e2", color: liTrend >= 0 ? "#16a34a" : "#dc2626" }}>
            {liTrend >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>{Math.abs(liTrend).toFixed(1)}%</span>
            <span className="hidden sm:inline text-[10px] opacity-70 font-normal">vs semana ant.</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="text-xs text-gray-400">Período:</span>
          <input type="date" value={start} min={minDate} max={end}
            onChange={(e) => setDateRange((p) => ({ ...p, start: e.target.value }))}
            className="flex-1 min-w-0 px-2 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0077b5]" />
          <span className="text-xs text-gray-400">até</span>
          <input type="date" value={end} min={start} max={maxDate}
            onChange={(e) => setDateRange((p) => ({ ...p, end: e.target.value }))}
            className="flex-1 min-w-0 px-2 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0077b5]" />
        </div>
      </div>

      {/* Big Numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "Ganho de seguidores",  value: fmt(bigNumbers.gainSeguidores),           icon: <Users className="w-4 h-4" /> },
          { label: "Impressões totais",    value: fmt(bigNumbers.totalImpressions),         icon: <Eye className="w-4 h-4" /> },
          { label: "Impressões únicas",    value: fmt(bigNumbers.totalUniqueImpressions),   icon: <BarChart2 className="w-4 h-4" /> },
          { label: "Cliques",              value: fmt(bigNumbers.totalClicks),              icon: <MousePointer className="w-4 h-4" /> },
          { label: "Curtidas",             value: fmt(bigNumbers.totalLikes),               icon: <Heart className="w-4 h-4" /> },
          { label: "Comentários",          value: fmt(bigNumbers.totalComments),            icon: <MessageCircle className="w-4 h-4" /> },
          { label: "Compartilhamentos",    value: fmt(bigNumbers.totalShares),              icon: <Share2 className="w-4 h-4" /> },
          { label: "Taxa de engajamento",  value: fmtPct(bigNumbers.avgEngagement),         icon: <TrendingUp className="w-4 h-4" /> },
        ].map((c) => (
          <div key={c.label} className="bg-slate-700/80 rounded-2xl px-3 py-3 flex flex-col gap-1 text-white">
            <div className="flex items-center gap-1.5 text-slate-300 text-xs">{c.icon}{c.label}</div>
            <div className="text-base md:text-sm font-bold">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-overlay rounded-2xl shadow-lg p-4">
          <LineChart
            series={[{ id: "Ganho orgânico", color: "#0077b5", data: followerChartData }]}
            label="Crescimento de seguidores"
          />
        </div>
        <div className="card-overlay rounded-2xl shadow-lg p-4">
          <LineChart
            series={[{ id: "Impressões por post", color: "#0096d6", data: impressionsChartData }]}
            label="Impressões ao longo do tempo"
          />
        </div>
      </div>

      {/* Layout: esquerda análises, direita posts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">

        {/* ── Coluna esquerda: análises empilhadas ── */}
        <div className="flex flex-col gap-4">

          {/* Atividade por dia da semana */}
          <div className="card-overlay rounded-2xl shadow-lg p-4">
            <p className="text-sm font-bold text-gray-900 mb-3">Atividade por dia da semana</p>
            <p className="text-[10px] text-gray-400 mb-3">Baseado em ganho de seguidores</p>
            <div className="flex flex-col gap-2">
              {dowActivity.map((d) => (
                <div key={d.label} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 w-8">{d.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(d.avg / maxDow) * 100}%`, backgroundColor: "#0077b5" }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-10 text-right">{fmt(Math.round(d.avg))}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top regiões por seguidores */}
          <div className="card-overlay rounded-2xl shadow-lg p-4">
            <HBarChart
              data={followerRegions.map((r) => ({ label: r.region, value: r.organicCount }))}
              color="#0077b5"
              label="Top 10 regiões — Seguidores"
            />
          </div>

          {/* Top regiões por visualizações */}
          <div className="card-overlay rounded-2xl shadow-lg p-4">
            <HBarChart
              data={pageRegions.map((r) => ({ label: r.region, value: r.allPageViews }))}
              color="#0096d6"
              label="Top 10 regiões — Visualizações da página"
            />
          </div>

          {/* Senioridade */}
          {seniorities.length > 0 && (
            <div className="card-overlay rounded-2xl shadow-lg p-4">
              <p className="text-sm font-bold text-gray-900 mb-3">Visualizações por senioridade</p>
              <div className="flex flex-col gap-2">
                {seniorities.map((s) => {
                  const maxSen = Math.max(...seniorities.map((x) => x.allPageViews), 1)
                  return (
                    <div key={s.seniority} className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 w-32">{s.seniority}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${(s.allPageViews / maxSen) * 100}%`, backgroundColor: "#0077b5" }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-14 text-right">{fmt(s.allPageViews)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Coluna direita: cards de posts ── */}
        <div className="card-overlay rounded-2xl shadow-lg p-4 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <p className="text-sm font-bold text-gray-900">Publicações ({allPosts.length})</p>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value as "impressions" | "engagementRate" | "likes" | "comments" | "shares" | "clicks"); setCurrentPage(1) }}
                className="flex-1 min-w-0 px-2 py-1 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0077b5]"
              >
                <option value="impressions">Impressões</option>
                <option value="engagementRate">Taxa de engajamento</option>
                <option value="likes">Curtidas</option>
                <option value="comments">Comentários</option>
                <option value="shares">Compartilhamentos</option>
                <option value="clicks">Cliques</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pr-1 flex-1 content-start">
            {pagedPosts.map((post, i) => (
              <LiPostCard key={i} post={post} />
            ))}
            {pagedPosts.length === 0 && (
              <p className="col-span-2 text-sm text-gray-400 text-center py-8">Nenhuma publicação encontrada</p>
            )}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, sortedPosts.length)} de {sortedPosts.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Anterior
                </button>
                <span className="text-xs text-gray-500">{currentPage}/{totalPages}</span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Próximo →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default OrganicoLinkedIn
