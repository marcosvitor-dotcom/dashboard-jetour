"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { useOrganicData } from "../../services/consolidadoApi"
import { PostEmbed } from "../CriativosMetaAds/components/PostEmbed"
import Loading from "../../components/Loading/Loading"
import {
  Users, Eye, Heart, MessageCircle, Share2, TrendingUp, TrendingDown,
  ArrowUpDown, BarChart2, Play,
} from "lucide-react"
import { ResponsiveLine } from "@nivo/line"

// ── Types ─────────────────────────────────────────────────────────────────────

interface FbPost {
  pageName: string
  postId: string
  permalink: string
  message: string
  postType: string
  publishTime: string
  publishDate: string
  totalLikes: number
  totalComments: number
  totalShares: number
  totalReactions: number
  // aba Video Post (enriquecimento)
  reach: number
  videoViews: number
  views30s: number
  engagementRate: number
}

interface FbFollowDay {
  date: string
  totalFollows: number
  newFollows: number
  newUnfollows: number
}

interface FbPageDay {
  date: string
  totalReach: number
  totalImpressions: number
  totalVideoViews: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const parseN = (v: string | undefined) => {
  if (!v || v === "-" || v === "") return 0
  const n = Number(v.replace(/\./g, "").replace(",", "."))
  return isNaN(n) ? 0 : n
}

const fmt = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".", ",")} mi`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1).replace(".", ",")} mil`
  return v.toLocaleString("pt-BR")
}

const fmtPct = (v: number) => `${v.toFixed(2).replace(".", ",")}%`

const fmtDate = (iso: string) => {
  const p = iso.split("-")
  return p.length === 3 ? `${p[2]}/${p[1]}` : iso
}

// ── Chart ─────────────────────────────────────────────────────────────────────

const LineChart: React.FC<{
  series: { id: string; color: string; data: { x: string; y: number }[] }[]
  label: string
}> = ({ series, label }) => {
  const allData = series.flatMap((s) => s.data)
  if (allData.length < 2) return <div className="flex items-center justify-center h-[172px]"><p className="text-xs text-gray-400">Sem dados suficientes</p></div>

  const sampleSeries = series.map((s) => ({
    ...s,
    data: s.data.filter((_, i) => i % Math.max(1, Math.floor(s.data.length / 40)) === 0 || i === s.data.length - 1),
  }))
  const tickStep = Math.max(1, Math.floor(sampleSeries[0].data.length / 6))
  const xTickValues = sampleSeries[0].data
    .filter((_, i) => i % tickStep === 0 || i === sampleSeries[0].data.length - 1)
    .map((d) => d.x)

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

// ── Post card ─────────────────────────────────────────────────────────────────

const FbPostCard: React.FC<{ post: FbPost }> = ({ post }) => {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div
        className="card-overlay rounded-2xl shadow p-3 flex flex-col gap-2 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setOpen(true)}
      >
        <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl h-28 flex items-center justify-center">
          <div className="flex flex-col items-center gap-1 text-blue-400">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span className="text-xs font-medium capitalize">{post.postType.replace(/_/g, " ")}</span>
          </div>
        </div>
        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{post.message || "—"}</p>
        <div className="grid grid-cols-3 gap-1">
          <div className="text-center">
            <p className="text-xs font-bold text-gray-900">{fmt(post.totalReactions)}</p>
            <p className="text-[10px] text-gray-400">Reações</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-gray-900">{fmt(post.reach)}</p>
            <p className="text-[10px] text-gray-400">Alcance</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-blue-600">{fmtPct(post.engagementRate)}</p>
            <p className="text-[10px] text-gray-400">Engaj.</p>
          </div>
        </div>
      </div>

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
              <p className="text-sm font-bold text-gray-800">Facebook — {post.postType.replace(/_/g, " ")}</p>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <PostEmbed url={post.permalink} />
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: "Curtidas",       value: fmt(post.totalLikes) },
                { label: "Reações",        value: fmt(post.totalReactions) },
                { label: "Comentários",    value: fmt(post.totalComments) },
                { label: "Compartilh.",    value: fmt(post.totalShares) },
                { label: "Alcance",        value: fmt(post.reach) },
                ...(post.videoViews > 0 ? [{ label: "Video Views", value: fmt(post.videoViews) }] : []),
                ...(post.views30s > 0    ? [{ label: "Views 30s",  value: fmt(post.views30s) }]   : []),
                { label: "Engajamento",    value: fmtPct(post.engagementRate) },
              ].map((m) => (
                <div key={m.label} className="bg-slate-700/80 rounded-xl px-3 py-2 text-white text-center">
                  <p className="text-xs text-slate-300">{m.label}</p>
                  <p className="text-sm font-bold">{m.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

type SortKey = "totalReactions" | "totalLikes" | "totalComments" | "totalShares" | "reach" | "videoViews"

const OrganicoFacebook: React.FC = () => {
  const { fbPosts, fbFollows, fbPage, fbVideoPost, loading, error } = useOrganicData()
  const [sortBy, setSortBy] = useState<SortKey>("totalReactions")
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" })

  // ── Parse Video Post (enriquecimento por postId) ────────────────────────────
  const videoPostMap = useMemo<Map<string, Partial<FbPost>>>(() => {
    const map = new Map<string, Partial<FbPost>>()
    if (!fbVideoPost?.data?.values || fbVideoPost.data.values.length < 2) return map
    const [headers, ...rows] = fbVideoPost.data.values
    const idx = (col: string) => headers.indexOf(col)
    rows.forEach((r: string[]) => {
      const postId = r[idx("Post ID")] || ""
      if (!postId) return
      // "Lifetime Post Total Impressions" está corrompido no Sheets (retorna timestamp 1899-12-30)
      // Usamos "Lifetime Post Total Reach" como base de alcance e "Unique Video Views" como visualizações únicas
      map.set(postId, {
        reach:      parseN(r[idx("Lifetime Post Total Reach (Unique)")]),
        videoViews: parseN(r[idx("Unique Video Views")]),
        views30s:   parseN(r[idx("Total 30-Second Views")]),
      })
    })
    return map
  }, [fbVideoPost])

  // ── Parse Posts ─────────────────────────────────────────────────────────────
  const allPosts = useMemo<FbPost[]>(() => {
    if (!fbPosts?.data?.values || fbPosts.data.values.length < 2) return []
    const [headers, ...rows] = fbPosts.data.values
    const idx = (col: string) => headers.indexOf(col)
    return rows.map((r: string[]) => {
      const postId       = r[idx("Post ID")] || ""
      const totalReactions = parseN(r[idx("Post Total Reactions")])
      const totalComments  = parseN(r[idx("Post Total Comments")])
      const totalShares    = parseN(r[idx("Post Total Shares")])
      const extra          = videoPostMap.get(postId) ?? {}
      const reach          = extra.reach ?? 0
      // Engajamento = (reações + comentários + compartilhamentos) / alcance
      const totalEngaged   = totalReactions + totalComments + totalShares
      const engagementRate = reach > 0 ? (totalEngaged / reach) * 100 : 0
      const publishTime    = r[idx("Post Publish Time")] || ""
      return {
        pageName:        r[idx("Page Name")] || "",
        postId,
        permalink:       r[idx("Post Permalink")] || "",
        message:         r[idx("Post Message")] || "",
        postType:        r[idx("Post Type")] || "",
        publishTime,
        publishDate:     publishTime.substring(0, 10),
        totalLikes:      parseN(r[idx("Post Total Likes")]),
        totalComments,
        totalShares,
        totalReactions,
        reach,
        videoViews:      extra.videoViews ?? 0,
        views30s:        extra.views30s   ?? 0,
        engagementRate,
      }
    }).filter((p) => p.permalink)
  }, [fbPosts, videoPostMap])

  // ── Parse Follows ───────────────────────────────────────────────────────────
  const followDays = useMemo<FbFollowDay[]>(() => {
    if (!fbFollows?.data?.values || fbFollows.data.values.length < 2) return []
    const [headers, ...rows] = fbFollows.data.values
    const idx = (col: string) => headers.indexOf(col)
    return rows
      .map((r: string[]) => ({
        date:         r[idx("Day")] || "",
        totalFollows: parseN(r[idx("Total Follows")]),
        newFollows:   parseN(r[idx("New Follows")]),
        newUnfollows: parseN(r[idx("New Unfollows")]),
      }))
      .filter((d) => d.date.match(/^\d{4}-\d{2}-\d{2}$/))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [fbFollows])

  // ── Parse Page (alcance e impressões diários) ───────────────────────────────
  const pageDays = useMemo<FbPageDay[]>(() => {
    if (!fbPage?.data?.values || fbPage.data.values.length < 2) return []
    const [headers, ...rows] = fbPage.data.values
    const idx = (col: string) => headers.indexOf(col)
    return rows
      .map((r: string[]) => ({
        date:             r[idx("Day")] || "",
        totalReach:       parseN(r[idx("Total Reach (Unique)")]),
        totalImpressions: parseN(r[idx("Total Impressions of your posts")]),
        totalVideoViews:  parseN(r[idx("Total Video Views")]),
      }))
      .filter((d) => d.date.match(/^\d{4}-\d{2}-\d{2}$/))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [fbPage])

  // ── Date range — baseado em followDays ──────────────────────────────────────
  const allDates = followDays.map((d) => d.date)
  const minDate  = allDates[0] ?? ""
  const maxDate  = allDates[allDates.length - 1] ?? ""
  const start    = dateRange.start || minDate
  const end      = dateRange.end   || maxDate

  const filteredDays = useMemo(() =>
    followDays.filter((d) => (!start || d.date >= start) && (!end || d.date <= end)),
    [followDays, start, end]
  )

  const filteredPageDays = useMemo(() =>
    pageDays.filter((d) => (!start || d.date >= start) && (!end || d.date <= end)),
    [pageDays, start, end]
  )

  // ── Big numbers ─────────────────────────────────────────────────────────────
  const bigNumbers = useMemo(() => {
    const latest         = filteredDays[filteredDays.length - 1]
    const gainSeguidores = filteredDays.reduce((s, d) => s + d.newFollows - d.newUnfollows, 0)
    const totalReach        = filteredPageDays.reduce((s, d) => s + d.totalReach, 0)
    const totalImpressions  = filteredPageDays.reduce((s, d) => s + d.totalImpressions, 0)
    const totalVideoViews   = filteredPageDays.reduce((s, d) => s + d.totalVideoViews, 0)
    const totalReactions    = allPosts.reduce((s, p) => s + p.totalReactions, 0)
    const totalLikes        = allPosts.reduce((s, p) => s + p.totalLikes, 0)
    const totalComments     = allPosts.reduce((s, p) => s + p.totalComments, 0)
    const totalShares       = allPosts.reduce((s, p) => s + p.totalShares, 0)
    const totalViews30s     = allPosts.reduce((s, p) => s + p.views30s, 0)
    // Engajamento médio sobre posts que têm alcance (reach) da aba Video Post
    const postsWithReach  = allPosts.filter((p) => p.reach > 0)
    const avgEngagement   = postsWithReach.length > 0
      ? postsWithReach.reduce((s, p) => s + p.engagementRate, 0) / postsWithReach.length
      : 0
    return {
      followers: latest?.totalFollows ?? 0,
      gainSeguidores,
      totalReach,
      totalImpressions,
      totalVideoViews,
      totalReactions,
      totalLikes,
      totalComments,
      totalShares,
      totalViews30s,
      avgEngagement,
    }
  }, [filteredDays, filteredPageDays, allPosts])

  // ── Trend: últimos 7 dias vs. 7 dias anteriores (sobre dados completos) ──────
  const fbTrend = useMemo(() => {
    if (followDays.length < 2) return 0
    const last7 = followDays.slice(-7).reduce((s, d) => s + d.newFollows, 0)
    const prev7 = followDays.slice(-14, -7).reduce((s, d) => s + d.newFollows, 0)
    if (prev7 === 0) return last7 > 0 ? 100 : 0
    return ((last7 - prev7) / prev7) * 100
  }, [followDays])

  // ── Charts ──────────────────────────────────────────────────────────────────
  const followerChartData = useMemo(() =>
    filteredDays.map((d) => ({ x: d.date, y: d.newFollows })),
    [filteredDays]
  )

  const reachChartData = useMemo(() =>
    filteredPageDays.map((d) => ({ x: d.date, y: d.totalReach })),
    [filteredPageDays]
  )

  // Postagens por dia via Post Publish Time
  const postsByDayChartData = useMemo(() => {
    const byDate = new Map<string, number>()
    allPosts.forEach((p) => {
      if (!p.publishDate) return
      byDate.set(p.publishDate, (byDate.get(p.publishDate) ?? 0) + 1)
    })
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([x, y]) => ({ x, y }))
  }, [allPosts])

  // ── Day of week activity ─────────────────────────────────────────────────────
  const dowActivity = useMemo(() => {
    const labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
    const sums   = [0, 0, 0, 0, 0, 0, 0]
    const counts = [0, 0, 0, 0, 0, 0, 0]
    filteredDays.forEach((d) => {
      const dow = new Date(d.date + "T12:00:00").getDay()
      sums[dow]   += d.newFollows
      counts[dow] += 1
    })
    return labels.map((label, i) => ({ label, avg: counts[i] > 0 ? sums[i] / counts[i] : 0 }))
  }, [filteredDays])
  const maxDow = Math.max(...dowActivity.map((d) => d.avg), 1)

  // ── Sorted posts ─────────────────────────────────────────────────────────────
  const sortedPosts = useMemo(() =>
    [...allPosts].sort((a, b) => b[sortBy] - a[sortBy]),
    [allPosts, sortBy]
  )

  if (loading) return <Loading message="Carregando dados do Facebook..." />
  if (error) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-red-500">Erro ao carregar dados: {error.message}</p>
    </div>
  )

  return (
    <div className="h-full flex flex-col space-y-4 overflow-auto">

      {/* Header */}
      <div className="card-overlay rounded-2xl shadow-lg px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Orgânico — Facebook</h1>
            <p className="text-xs text-gray-500">Performance orgânica da página Jetour Brasil</p>
          </div>
          <div
            title="Comparado à semana anterior (novos seguidores)"
            className="ml-4 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full cursor-default"
            style={{ backgroundColor: fbTrend >= 0 ? "#dcfce7" : "#fee2e2", color: fbTrend >= 0 ? "#16a34a" : "#dc2626" }}>
            {fbTrend >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {Math.abs(fbTrend).toFixed(1)}%
            <span className="text-[10px] opacity-70 font-normal">vs semana ant.</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Período:</span>
          <input type="date" value={start} min={minDate} max={end}
            onChange={(e) => setDateRange((p) => ({ ...p, start: e.target.value }))}
            className="px-2 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <span className="text-xs text-gray-400">até</span>
          <input type="date" value={end} min={start} max={maxDate}
            onChange={(e) => setDateRange((p) => ({ ...p, end: e.target.value }))}
            className="px-2 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
      </div>

      {/* Big Numbers */}
      <div className="grid grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: "Seguidores totais",   value: fmt(bigNumbers.followers),         icon: <Users className="w-4 h-4" /> },
          { label: "Ganho de seguidores", value: fmt(bigNumbers.gainSeguidores),    icon: <TrendingUp className="w-4 h-4" /> },
          { label: "Alcance total",       value: fmt(bigNumbers.totalReach),        icon: <BarChart2 className="w-4 h-4" /> },
          { label: "Impressões",          value: fmt(bigNumbers.totalImpressions),  icon: <Eye className="w-4 h-4" /> },
          { label: "Video Views",         value: fmt(bigNumbers.totalVideoViews),   icon: <Play className="w-4 h-4" /> },
          { label: "Reações",             value: fmt(bigNumbers.totalReactions),    icon: <Heart className="w-4 h-4" /> },
          { label: "Curtidas",            value: fmt(bigNumbers.totalLikes),        icon: <Heart className="w-4 h-4" /> },
          { label: "Comentários",         value: fmt(bigNumbers.totalComments),     icon: <MessageCircle className="w-4 h-4" /> },
          { label: "Compartilhamentos",   value: fmt(bigNumbers.totalShares),       icon: <Share2 className="w-4 h-4" /> },
          { label: "Views 30s",           value: fmt(bigNumbers.totalViews30s),     icon: <Play className="w-4 h-4" /> },
          { label: "Taxa de engajamento", value: fmtPct(bigNumbers.avgEngagement),  icon: <TrendingUp className="w-4 h-4" /> },
        ].map((c) => (
          <div key={c.label} className="bg-slate-700/80 rounded-2xl px-3 py-3 flex flex-col gap-1 text-white">
            <div className="flex items-center gap-1.5 text-slate-300 text-xs">{c.icon}{c.label}</div>
            <div className="text-sm font-bold truncate">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card-overlay rounded-2xl shadow-lg p-4">
          <LineChart
            series={[{ id: "Novos seguidores", color: "#3b82f6", data: followerChartData }]}
            label="Crescimento de seguidores"
          />
        </div>
        <div className="card-overlay rounded-2xl shadow-lg p-4">
          <LineChart
            series={[{ id: "Alcance", color: "#6366f1", data: reachChartData }]}
            label="Alcance por dia"
          />
        </div>
        <div className="card-overlay rounded-2xl shadow-lg p-4">
          <LineChart
            series={[{ id: "Postagens", color: "#3b82f6", data: postsByDayChartData }]}
            label="Postagens por dia"
          />
        </div>
      </div>

      {/* Atividade + Posts */}
      <div className="grid grid-cols-3 gap-4">

        {/* Dias mais ativos */}
        <div className="card-overlay rounded-2xl shadow-lg p-4">
          <p className="text-sm font-bold text-gray-900 mb-1">Atividade por dia da semana</p>
          <p className="text-[10px] text-gray-400 mb-3">Baseado em novos seguidores por dia</p>
          <div className="flex flex-col gap-2">
            {dowActivity.map((d) => (
              <div key={d.label} className="flex items-center gap-2">
                <span className="text-xs text-gray-600 w-8">{d.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
                    style={{ width: `${(d.avg / maxDow) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-10 text-right">{fmt(Math.round(d.avg))}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Posts */}
        <div className="col-span-2 card-overlay rounded-2xl shadow-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-900">Publicações ({sortedPosts.length})</p>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-500">Ordenar por:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="px-2 py-1 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="totalReactions">Reações</option>
                <option value="totalLikes">Curtidas</option>
                <option value="totalComments">Comentários</option>
                <option value="totalShares">Compartilhamentos</option>
                <option value="reach">Alcance</option>
                <option value="videoViews">Video Views</option>
              </select>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Eye className="w-3.5 h-3.5" />
                Clique para detalhes
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 max-h-[480px] overflow-y-auto pr-1">
            {sortedPosts.map((post, i) => (
              <FbPostCard key={i} post={post} />
            ))}
            {sortedPosts.length === 0 && (
              <p className="col-span-3 text-sm text-gray-400 text-center py-8">Nenhuma publicação encontrada</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrganicoFacebook
