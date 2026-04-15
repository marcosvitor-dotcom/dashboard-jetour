"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { useOrganicData } from "../../services/consolidadoApi"
import { PostEmbed } from "../CriativosMetaAds/components/PostEmbed"
import Loading from "../../components/Loading/Loading"
import {
  Users, Eye, Heart, MessageCircle, Bookmark, TrendingUp, TrendingDown,
  ArrowUpDown, BarChart2, Link as LinkIcon, Play, Video, BookImage,
} from "lucide-react"
import { ResponsiveLine } from "@nivo/line"

// ── Constants ──────────────────────────────────────────────────────────────────

// A partir desta data, novos seguidores = variação diária de Total Followers
const VARIACAO_DESDE = "2026-04-01"

// ── Types ──────────────────────────────────────────────────────────────────────

interface IgPost {
  accountName: string
  mediaType: string
  mediaUrl: string
  permalink: string
  caption: string
  comments: number
  likes: number
  impressions: number
  reach: number
  saves: number
  shares: number
  plays: number
  totalWatchTime: number
  avgWatchTime: number
  totalInteractions: number
  engagementRate: number
  postDate: string // from Media sheet (ISO date)
  profileVisits: number
  follows: number
}

interface IgStory {
  mediaUrl: string
  permalink: string
  impressions: number
  reach: number
  exits: number
  replies: number
  tapsForward: number
  tapsBack: number
}

interface FollowDay {
  date: string
  followers: number
  newFollowers: number  // corrected value (computed from delta when >= VARIACAO_DESDE)
  impressions: number
  profileViews: number
  reach: number
  websiteClicks: number
}

// ── Helpers ────────────────────────────────────────────────────────────────────

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

const fmtDuration = (ms: number) => {
  // watch time comes as milliseconds
  const secs = Math.round(ms / 1000)
  if (secs >= 60) return `${Math.floor(secs / 60)}m${(secs % 60).toString().padStart(2, "0")}s`
  return `${secs}s`
}

const fmtPct = (v: number) => `${v.toFixed(2).replace(".", ",")}%`

const fmtDate = (iso: string) => {
  const parts = iso.split("-")
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : iso
}

// ── Mini line chart ────────────────────────────────────────────────────────────

const LineChart: React.FC<{
  series: { id: string; color: string; data: { x: string; y: number }[] }[]
  label: string
  height?: number
}> = ({ series, label, height = 140 }) => {
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

  return (
    <div>
      <p className="text-xs font-semibold text-gray-700 mb-1">{label}</p>
      <div style={{ height }}>
        <ResponsiveLine
          data={sampleSeries}
          margin={{ top: 8, right: 16, bottom: 32, left: 48 }}
          xScale={{ type: "point" }}
          yScale={{ type: "linear", min: "auto", max: "auto", stacked: false }}
          curve="monotoneX"
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 3,
            tickPadding: 4,
            tickRotation: -30,
            tickValues: xTickValues,
            format: fmtDate,
          }}
          axisLeft={{
            tickSize: 3,
            tickPadding: 4,
            tickValues: 4,
            format: (v: number) => fmt(v),
          }}
          enableGridX={false}
          enableGridY
          gridYValues={4}
          theme={{
            grid: { line: { stroke: "#e5e7eb", strokeWidth: 1 } },
            axis: { ticks: { text: { fontSize: 9, fill: "#9ca3af" } } },
          }}
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

// ── Post card ──────────────────────────────────────────────────────────────────

const IgPostCard: React.FC<{ post: IgPost }> = ({ post }) => {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div
        className="card-overlay rounded-2xl shadow p-3 flex flex-col gap-2 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setOpen(true)}
      >
        <div className="bg-gradient-to-br from-pink-100 to-purple-100 rounded-xl h-28 flex items-center justify-center overflow-hidden relative">
          {post.mediaUrl && post.mediaType === "IMAGE" ? (
            <img src={post.mediaUrl} alt="post" className="w-full h-full object-cover rounded-xl" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-pink-400">
              {post.mediaType === "VIDEO" ? (
                <Play className="w-8 h-8" />
              ) : (
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              )}
              <span className="text-xs font-medium capitalize">{post.mediaType.toLowerCase()}</span>
            </div>
          )}
          {/* type badge */}
          <span className="absolute top-1.5 right-1.5 text-[9px] bg-black/50 text-white px-1.5 py-0.5 rounded-full">
            {post.mediaType}
          </span>
        </div>
        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{post.caption || "—"}</p>
        <div className="grid grid-cols-3 gap-1">
          <div className="text-center">
            <p className="text-xs font-bold text-gray-900">{fmt(post.likes)}</p>
            <p className="text-[10px] text-gray-400">Curtidas</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-gray-900">{fmt(post.reach)}</p>
            <p className="text-[10px] text-gray-400">Alcance</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-pink-600">{fmtPct(post.engagementRate)}</p>
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
              <p className="text-sm font-bold text-gray-800">Instagram — {post.mediaType}</p>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <PostEmbed url={post.permalink} />
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: "Curtidas",       value: fmt(post.likes) },
                { label: "Alcance",        value: fmt(post.reach) },
                { label: "Impressões",     value: fmt(post.impressions) },
                { label: "Comentários",    value: fmt(post.comments) },
                { label: "Salvos",         value: fmt(post.saves) },
                { label: "Compartilhados", value: fmt(post.shares) },
                ...(post.plays > 0 ? [{ label: "Reproduções", value: fmt(post.plays) }] : []),
                ...(post.totalWatchTime > 0 ? [{ label: "Tempo assistido", value: fmtDuration(post.totalWatchTime) }] : []),
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

// ── Main ───────────────────────────────────────────────────────────────────────

type SortKey = "engagementRate" | "impressions" | "likes" | "comments" | "saves" | "shares" | "plays"

const OrganicoInstagram: React.FC = () => {
  const { igPosts, igFollows, igMedia, igStory, igVideo, loading, error } = useOrganicData()
  const [sortBy, setSortBy] = useState<SortKey>("engagementRate")
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" })
  const [activeTab, setActiveTab] = useState<"posts" | "videos" | "stories">("posts")

  // ── Parse Follows (with delta logic from VARIACAO_DESDE) ───────────────────
  const followDays = useMemo<FollowDay[]>(() => {
    if (!igFollows?.data?.values || igFollows.data.values.length < 1) return []
    const rows = igFollows.data.values
    const headerIdx = rows.findIndex((r: string[]) => r.some((cell: string) => cell === "Day" || cell === "Total Followers"))
    let headers: string[]
    let dataRows: string[][]
    if (headerIdx >= 0) {
      headers = rows[headerIdx]
      dataRows = rows.filter((_: string[], i: number) => i !== headerIdx)
    } else {
      headers = ["Day", "Total Followers", "New Followers", "Impressions", "Page Name", "Profile Views", "Reach", "Website", "Website Clicks"]
      dataRows = rows
    }
    const idx = (col: string) => headers.indexOf(col)

    const sorted = dataRows
      .map((r: string[]) => ({
        date: r[idx("Day")] || "",
        followers: parseN(r[idx("Total Followers")]),
        rawNewFollowers: parseN(r[idx("New Followers")]),
        impressions: parseN(r[idx("Impressions")]),
        profileViews: parseN(r[idx("Profile Views")]),
        reach: parseN(r[idx("Reach")]),
        websiteClicks: parseN(r[idx("Website Clicks")]),
      }))
      .filter((d) => d.date && d.date.match(/^\d{4}-\d{2}-\d{2}$/))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Compute corrected newFollowers:
    // Before VARIACAO_DESDE → use rawNewFollowers from API
    // From VARIACAO_DESDE onward → delta = Total Followers[i] - Total Followers[i-1]
    return sorted.map((d, i) => {
      let newFollowers = d.rawNewFollowers
      if (d.date >= VARIACAO_DESDE && i > 0) {
        const delta = d.followers - sorted[i - 1].followers
        newFollowers = Math.max(0, delta)
      }
      return {
        date: d.date,
        followers: d.followers,
        newFollowers,
        impressions: d.impressions,
        profileViews: d.profileViews,
        reach: d.reach,
        websiteClicks: d.websiteClicks,
      }
    })
  }, [igFollows])

  // ── Auto date range ────────────────────────────────────────────────────────
  const allDates = followDays.map((d) => d.date)
  const minDate = allDates[0] ?? ""
  const maxDate = allDates[allDates.length - 1] ?? ""
  const start = dateRange.start || minDate
  const end = dateRange.end || maxDate

  // ── Filtered follows ───────────────────────────────────────────────────────
  const filteredDays = useMemo(() =>
    followDays.filter((d) => (!start || d.date >= start) && (!end || d.date <= end)),
    [followDays, start, end]
  )

  // ── Parse Media (enrich with extra fields: shares, plays, watchTime, date, profileVisits) ──
  const mediaMap = useMemo<Map<string, Partial<IgPost>>>(() => {
    const map = new Map<string, Partial<IgPost>>()
    if (!igMedia?.data?.values || igMedia.data.values.length < 2) return map
    const [headers, ...rows] = igMedia.data.values
    const idx = (col: string) => headers.indexOf(col)
    rows.forEach((r: string[]) => {
      const permalink = r[idx("Media Permalink")] || ""
      if (!permalink) return
      const postTimeRaw = r[idx("Media Post Time")] || ""
      // Format: "2026-04-14T17:00:25+0000" → take first 10 chars
      const postDate = postTimeRaw.substring(0, 10)
      map.set(permalink, {
        shares: parseN(r[idx("Media Shares")]),
        plays: parseN(r[idx("Media Plays")]),
        totalWatchTime: parseN(r[idx("Total Watch Time")]),
        avgWatchTime: parseN(r[idx("Avg Reel Watch Time")]),
        profileVisits: parseN(r[idx("Profile Visits")]),
        follows: parseN(r[idx("Follows")]),
        postDate,
      })
    })
    return map
  }, [igMedia])

  // ── Parse Posts (merged with media data) ──────────────────────────────────
  const allPosts = useMemo<IgPost[]>(() => {
    if (!igPosts?.data?.values || igPosts.data.values.length < 2) return []
    const [headers, ...rows] = igPosts.data.values
    const idx = (col: string) => headers.indexOf(col)
    return rows.map((r: string[]) => {
      const reach = parseN(r[idx("Reach")])
      const totalInteractions = parseN(r[idx("Media Total Interactions")])
      const engagementRate = reach > 0 ? (totalInteractions / reach) * 100 : 0
      const permalink = r[idx("Media Permalink")] || ""
      const extra = mediaMap.get(permalink) ?? {}
      return {
        accountName: r[idx("Account Name")] || "",
        mediaType: r[idx("Media Type")] || "",
        mediaUrl: r[idx("Media URL")] || "",
        permalink,
        caption: r[idx("Media Caption")] || "",
        comments: parseN(r[idx("Media Comments")]),
        likes: parseN(r[idx("Media Likes")]),
        impressions: parseN(r[idx("Impressions")]),
        reach,
        saves: parseN(r[idx("Saves")]),
        shares: extra.shares ?? 0,
        plays: extra.plays ?? 0,
        totalWatchTime: extra.totalWatchTime ?? 0,
        avgWatchTime: extra.avgWatchTime ?? 0,
        totalInteractions,
        engagementRate,
        postDate: extra.postDate ?? "",
        profileVisits: extra.profileVisits ?? 0,
        follows: extra.follows ?? 0,
      }
    }).filter((p) => p.permalink)
  }, [igPosts, mediaMap])

  // ── Parse Videos ──────────────────────────────────────────────────────────
  const allVideos = useMemo<IgPost[]>(() => {
    if (!igVideo?.data?.values || igVideo.data.values.length < 2) return []
    const [headers, ...rows] = igVideo.data.values
    const idx = (col: string) => headers.indexOf(col)
    return rows.map((r: string[]) => {
      const reach = parseN(r[idx("Reach")])
      const totalInteractions = parseN(r[idx("Media Total Interactions")])
      const engagementRate = reach > 0 ? (totalInteractions / reach) * 100 : 0
      const permalink = r[idx("Media Permalink")] || ""
      const extra = mediaMap.get(permalink) ?? {}
      return {
        accountName: r[idx("Account Name")] || "",
        mediaType: "VIDEO",
        mediaUrl: r[idx("Media URL")] || "",
        permalink,
        caption: r[idx("Media Caption")] || "",
        comments: parseN(r[idx("Media Comments")]),
        likes: parseN(r[idx("Media Likes")]),
        impressions: parseN(r[idx("Impressions")]),
        reach,
        saves: parseN(r[idx("Saves")]),
        shares: parseN(r[idx("Media Shares")]),
        plays: parseN(r[idx("Media Plays")]),
        totalWatchTime: parseN(r[idx("Total Watch Time")]),
        avgWatchTime: parseN(r[idx("Avg Reel Watch Time")]),
        totalInteractions,
        engagementRate,
        postDate: extra.postDate ?? "",
        profileVisits: extra.profileVisits ?? 0,
        follows: extra.follows ?? 0,
      }
    }).filter((p) => p.permalink)
  }, [igVideo, mediaMap])

  // ── Parse Stories ─────────────────────────────────────────────────────────
  const allStories = useMemo<IgStory[]>(() => {
    if (!igStory?.data?.values || igStory.data.values.length < 2) return []
    const [headers, ...rows] = igStory.data.values
    const idx = (col: string) => headers.indexOf(col)
    return rows.map((r: string[]) => ({
      mediaUrl: r[idx("Media URL")] || "",
      permalink: r[idx("Media Permalink")] || "",
      impressions: parseN(r[idx("Impressions")]),
      reach: parseN(r[idx("Reach")]),
      exits: parseN(r[idx("Exits")]),
      replies: parseN(r[idx("Replies")]),
      tapsForward: parseN(r[idx("Taps Forward")]),
      tapsBack: parseN(r[idx("Taps Back")]),
    })).filter((s) => s.permalink)
  }, [igStory])

  // ── Big numbers ────────────────────────────────────────────────────────────
  const bigNumbers = useMemo(() => {
    const latest = filteredDays[filteredDays.length - 1]
    const gainSeguidores = filteredDays.reduce((s, d) => s + d.newFollowers, 0)
    const totalImpressions = allPosts.reduce((s, p) => s + p.impressions, 0)
    const totalReach = allPosts.reduce((s, p) => s + p.reach, 0)
    const totalInteractions = allPosts.reduce((s, p) => s + p.totalInteractions, 0)
    const totalLikes = allPosts.reduce((s, p) => s + p.likes, 0)
    const totalComments = allPosts.reduce((s, p) => s + p.comments, 0)
    const totalSaves = allPosts.reduce((s, p) => s + p.saves, 0)
    const totalShares = allPosts.reduce((s, p) => s + p.shares, 0)
    const totalPlays = allVideos.reduce((s, p) => s + p.plays, 0)
    const totalWatchTime = allVideos.reduce((s, p) => s + p.totalWatchTime, 0)
    const avgEngagement = allPosts.length > 0
      ? allPosts.reduce((s, p) => s + p.engagementRate, 0) / allPosts.length
      : 0
    const profileViews = filteredDays.reduce((s, d) => s + d.profileViews, 0)
    const websiteClicks = filteredDays.reduce((s, d) => s + d.websiteClicks, 0)
    const storyImpressions = allStories.reduce((s, st) => s + st.impressions, 0)
    const storyReach = allStories.reduce((s, st) => s + st.reach, 0)
    return {
      followers: latest?.followers ?? 0,
      gainSeguidores,
      totalImpressions,
      totalReach,
      totalInteractions,
      totalLikes,
      totalComments,
      totalSaves,
      totalShares,
      totalPlays,
      totalWatchTime,
      avgEngagement,
      profileViews,
      websiteClicks,
      storyImpressions,
      storyReach,
    }
  }, [filteredDays, allPosts, allVideos, allStories])

  // ── Trend ──────────────────────────────────────────────────────────────────
  const igTrend = useMemo(() => {
    if (filteredDays.length < 2) return 0
    const half = Math.floor(filteredDays.length / 2)
    const first = filteredDays.slice(0, half).reduce((s, d) => s + d.newFollowers, 0)
    const second = filteredDays.slice(half).reduce((s, d) => s + d.newFollowers, 0)
    if (first === 0) return second > 0 ? 100 : 0
    return ((second - first) / first) * 100
  }, [filteredDays])

  // ── Chart series ───────────────────────────────────────────────────────────
  const followerChartData = useMemo(() =>
    filteredDays.map((d) => ({ x: d.date, y: d.newFollowers })),
    [filteredDays]
  )

  const viewsReachChartSeries = useMemo(() => [
    { id: "Impressões", color: "#ec4899", data: filteredDays.map((d) => ({ x: d.date, y: d.impressions })) },
    { id: "Alcance", color: "#8b5cf6", data: filteredDays.map((d) => ({ x: d.date, y: d.reach })) },
  ], [filteredDays])

  const profileViewsChartData = useMemo(() =>
    filteredDays.map((d) => ({ x: d.date, y: d.profileViews })),
    [filteredDays]
  )

  // ── Day-of-week activity ───────────────────────────────────────────────────
  const dowActivity = useMemo(() => {
    const labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
    const sums = [0, 0, 0, 0, 0, 0, 0]
    const counts = [0, 0, 0, 0, 0, 0, 0]
    filteredDays.forEach((d) => {
      const dow = new Date(d.date + "T12:00:00").getDay()
      sums[dow] += d.newFollowers + d.reach
      counts[dow]++
    })
    return labels.map((label, i) => ({ label, avg: counts[i] > 0 ? sums[i] / counts[i] : 0 }))
  }, [filteredDays])
  const maxDow = Math.max(...dowActivity.map((d) => d.avg), 1)

  // ── Sorted posts / videos ─────────────────────────────────────────────────
  const currentList = activeTab === "videos" ? allVideos : allPosts
  const sortedPosts = useMemo(() =>
    [...currentList].sort((a, b) => b[sortBy] - a[sortBy]),
    [currentList, sortBy]
  )

  // ── Stories stats ──────────────────────────────────────────────────────────
  const storiesStats = useMemo(() => {
    const totalImpressoes = allStories.reduce((s, st) => s + st.impressions, 0)
    const totalAlcance = allStories.reduce((s, st) => s + st.reach, 0)
    const totalExits = allStories.reduce((s, st) => s + st.exits, 0)
    const totalReplies = allStories.reduce((s, st) => s + st.replies, 0)
    const totalTapsForward = allStories.reduce((s, st) => s + st.tapsForward, 0)
    const totalTapsBack = allStories.reduce((s, st) => s + st.tapsBack, 0)
    const exitRate = totalImpressoes > 0 ? (totalExits / totalImpressoes) * 100 : 0
    return { totalImpressoes, totalAlcance, totalExits, totalReplies, totalTapsForward, totalTapsBack, exitRate }
  }, [allStories])

  if (loading) return <Loading message="Carregando dados do Instagram..." />
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
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Orgânico — Instagram</h1>
            <p className="text-xs text-gray-500">Performance orgânica da página Jetour Brasil</p>
          </div>
          <div className="ml-4 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ backgroundColor: igTrend >= 0 ? "#dcfce7" : "#fee2e2", color: igTrend >= 0 ? "#16a34a" : "#dc2626" }}>
            {igTrend >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {Math.abs(igTrend).toFixed(1)}%
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Período:</span>
          <input type="date" value={start} min={minDate} max={end}
            onChange={(e) => setDateRange((p) => ({ ...p, start: e.target.value }))}
            className="px-2 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-pink-400" />
          <span className="text-xs text-gray-400">até</span>
          <input type="date" value={end} min={start} max={maxDate}
            onChange={(e) => setDateRange((p) => ({ ...p, end: e.target.value }))}
            className="px-2 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-pink-400" />
        </div>
      </div>

      {/* Big Numbers */}
      <div className="grid grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: "Seguidores totais",   value: fmt(bigNumbers.followers),         icon: <Users className="w-4 h-4" /> },
          { label: "Ganho de seguidores", value: fmt(bigNumbers.gainSeguidores),    icon: <TrendingUp className="w-4 h-4" /> },
          { label: "Visualizações",       value: fmt(bigNumbers.totalImpressions),  icon: <Eye className="w-4 h-4" /> },
          { label: "Alcance",             value: fmt(bigNumbers.totalReach),        icon: <BarChart2 className="w-4 h-4" /> },
          { label: "Interações totais",   value: fmt(bigNumbers.totalInteractions), icon: <Heart className="w-4 h-4" /> },
          { label: "Curtidas",            value: fmt(bigNumbers.totalLikes),        icon: <Heart className="w-4 h-4" /> },
          { label: "Comentários",         value: fmt(bigNumbers.totalComments),     icon: <MessageCircle className="w-4 h-4" /> },
          { label: "Salvos",              value: fmt(bigNumbers.totalSaves),        icon: <Bookmark className="w-4 h-4" /> },
          { label: "Compartilhados",      value: fmt(bigNumbers.totalShares),       icon: <ArrowUpDown className="w-4 h-4" /> },
          { label: "Reproduções (Reels)", value: fmt(bigNumbers.totalPlays),        icon: <Play className="w-4 h-4" /> },
          { label: "Visitas ao perfil",   value: fmt(bigNumbers.profileViews),      icon: <Users className="w-4 h-4" /> },
          { label: "Cliques no link",     value: fmt(bigNumbers.websiteClicks),     icon: <LinkIcon className="w-4 h-4" /> },
          { label: "Story — Impressões",  value: fmt(bigNumbers.storyImpressions),  icon: <Video className="w-4 h-4" /> },
          { label: "Story — Alcance",     value: fmt(bigNumbers.storyReach),        icon: <BookImage className="w-4 h-4" /> },
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
            series={[{ id: "Novos seguidores", color: "#ec4899", data: followerChartData }]}
            label="Crescimento de seguidores"
          />
        </div>
        <div className="card-overlay rounded-2xl shadow-lg p-4">
          <LineChart
            series={viewsReachChartSeries}
            label="Visualizações e Alcance"
          />
        </div>
        <div className="card-overlay rounded-2xl shadow-lg p-4">
          <LineChart
            series={[{ id: "Visitas ao perfil", color: "#f59e0b", data: profileViewsChartData }]}
            label="Visitas ao perfil"
          />
        </div>
      </div>

      {/* Análise + Stories + Posts */}
      <div className="grid grid-cols-3 gap-4">

        {/* Dias mais ativos + Stories resumo */}
        <div className="flex flex-col gap-4">
          {/* Dia da semana */}
          <div className="card-overlay rounded-2xl shadow-lg p-4">
            <p className="text-sm font-bold text-gray-900 mb-1">Atividade por dia da semana</p>
            <p className="text-[10px] text-gray-400 mb-3">Baseado em novos seguidores + alcance</p>
            <div className="flex flex-col gap-2">
              {dowActivity.map((d) => (
                <div key={d.label} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 w-8">{d.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all"
                      style={{ width: `${(d.avg / maxDow) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-12 text-right">{fmt(Math.round(d.avg))}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stories */}
          {allStories.length > 0 && (
            <div className="card-overlay rounded-2xl shadow-lg p-4">
              <p className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Video className="w-4 h-4 text-pink-500" />
                Stories ({allStories.length})
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Impressões",    value: fmt(storiesStats.totalImpressoes) },
                  { label: "Alcance",       value: fmt(storiesStats.totalAlcance) },
                  { label: "Respostas",     value: fmt(storiesStats.totalReplies) },
                  { label: "Saídas",        value: fmt(storiesStats.totalExits) },
                  { label: "Taps →",        value: fmt(storiesStats.totalTapsForward) },
                  { label: "Taps ←",        value: fmt(storiesStats.totalTapsBack) },
                ].map((m) => (
                  <div key={m.label} className="bg-slate-700/80 rounded-xl px-2 py-2 text-white text-center">
                    <p className="text-[10px] text-slate-300">{m.label}</p>
                    <p className="text-xs font-bold">{m.value}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-2 text-center">
                Taxa de saída: {fmtPct(storiesStats.exitRate)}
              </p>
            </div>
          )}
        </div>

        {/* Posts / Videos com tabs */}
        <div className="col-span-2 card-overlay rounded-2xl shadow-lg p-4">
          <div className="flex items-center justify-between mb-3">
            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setActiveTab("posts")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${activeTab === "posts" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
              >
                Posts ({allPosts.length})
              </button>
              <button
                onClick={() => setActiveTab("videos")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${activeTab === "videos" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
              >
                <Play className="w-3 h-3" /> Reels ({allVideos.length})
              </button>
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-500">Ordenar por:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="px-2 py-1 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-pink-400"
              >
                <option value="engagementRate">Taxa de engajamento</option>
                <option value="impressions">Visualizações</option>
                <option value="likes">Curtidas</option>
                <option value="comments">Comentários</option>
                <option value="saves">Salvos</option>
                <option value="shares">Compartilhados</option>
                <option value="plays">Reproduções</option>
              </select>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Eye className="w-3.5 h-3.5" />
                Clique para detalhes
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 max-h-[560px] overflow-y-auto pr-1">
            {sortedPosts.map((post, i) => (
              <IgPostCard key={i} post={post} />
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

export default OrganicoInstagram
