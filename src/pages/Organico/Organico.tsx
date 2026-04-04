"use client"

import type React from "react"
import { useState, useMemo, useEffect } from "react"
import { useOrganicData } from "../../services/consolidadoApi"
import { PostEmbed } from "../CriativosMetaAds/components/PostEmbed"
import Loading from "../../components/Loading/Loading"
import { Users, Eye, Heart, MessageCircle, Share2, TrendingUp, TrendingDown } from "lucide-react"
import { ResponsiveLine } from "@nivo/line"

// ── Types ─────────────────────────────────────────────────────────────────────

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
  totalInteractions: number
}

interface FbPost {
  pageName: string
  postId: string
  permalink: string
  message: string
  postType: string
  publishTime: string
  totalLikes: number
  totalComments: number
  totalShares: number
  totalReactions: number
  engagedFans: number
  organicImpressions: number
}

interface FollowDay {
  date: string
  followers: number
  newFollowers: number
  reach: number
}

interface FbFollowDay {
  date: string
  lifetimeLikes: number
  totalFollows: number
  newFollows: number
  newUnfollows: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const parseN = (v: string) => {
  if (!v || v === "-" || v === "") return 0
  const n = Number(v.replace(/\./g, "").replace(",", "."))
  return isNaN(n) ? 0 : n
}

const fmt = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".", ",")} mi`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1).replace(".", ",")} mil`
  return v.toLocaleString("pt-BR")
}

// ── Mini line chart ───────────────────────────────────────────────────────────

const MiniChart: React.FC<{
  data: { x: string; y: number }[]
  color: string
  label: string
}> = ({ data, color, label }) => {
  if (data.length < 2) return null

  // Limitar a ~40 pontos para não poluir o eixo X
  const step = Math.max(1, Math.floor(data.length / 40))
  const sampled = data.filter((_, i) => i % step === 0 || i === data.length - 1)

  // Ticks do eixo X — mostrar ~6 datas espaçadas
  const tickStep = Math.max(1, Math.floor(sampled.length / 6))
  const xTickValues = sampled
    .filter((_, i) => i % tickStep === 0 || i === sampled.length - 1)
    .map((d) => d.x)

  // Formatar data ISO yyyy-mm-dd → dd/mm
  const fmtDate = (iso: string) => {
    const parts = iso.split("-")
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`
    return iso
  }

  return (
    <div>
      <p className="text-xs font-semibold text-gray-700 mb-1">{label}</p>
      <div style={{ height: 130 }}>
        <ResponsiveLine
          data={[{ id: label, data: sampled }]}
          margin={{ top: 8, right: 8, bottom: 32, left: 44 }}
          xScale={{ type: "point" }}
          yScale={{ type: "linear", min: "auto", max: "auto" }}
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
          colors={[color]}
          lineWidth={2}
          pointSize={0}
          enableArea
          areaOpacity={0.12}
          useMesh
          tooltip={({ point }) => (
            <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
              <p className="text-gray-500 mb-0.5">{fmtDate(point.data.x as string)}</p>
              <p className="font-bold text-gray-900">{fmt(point.data.y as number)}</p>
            </div>
          )}
        />
      </div>
    </div>
  )
}

// ── Post card ─────────────────────────────────────────────────────────────────

const IgPostCard: React.FC<{ post: IgPost }> = ({ post }) => {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div
        className="card-overlay rounded-2xl shadow p-3 flex flex-col gap-2 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setOpen(true)}
      >
        {/* Thumbnail / tipo */}
        <div className="bg-gradient-to-br from-pink-100 to-purple-100 rounded-xl h-28 flex items-center justify-center overflow-hidden relative">
          {post.mediaUrl && post.mediaType === "IMAGE" ? (
            <img src={post.mediaUrl} alt="post" className="w-full h-full object-cover rounded-xl" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-pink-400">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              <span className="text-xs font-medium capitalize">{post.mediaType.toLowerCase()}</span>
            </div>
          )}
        </div>
        {/* Caption */}
        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{post.caption || "—"}</p>
        {/* Métricas */}
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
            <p className="text-xs font-bold text-gray-900">{fmt(post.totalInteractions)}</p>
            <p className="text-[10px] text-gray-400">Interações</p>
          </div>
        </div>
      </div>

      {/* Modal embed */}
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
                { label: "Curtidas", value: fmt(post.likes) },
                { label: "Alcance", value: fmt(post.reach) },
                { label: "Impressões", value: fmt(post.impressions) },
                { label: "Comentários", value: fmt(post.comments) },
                { label: "Salvos", value: fmt(post.saves) },
                { label: "Interações", value: fmt(post.totalInteractions) },
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
            <span className="text-xs font-medium capitalize">{post.postType.replace("_", " ")}</span>
          </div>
        </div>
        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{post.message || "—"}</p>
        <div className="grid grid-cols-3 gap-1">
          <div className="text-center">
            <p className="text-xs font-bold text-gray-900">{fmt(post.totalReactions)}</p>
            <p className="text-[10px] text-gray-400">Reações</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-gray-900">{fmt(post.organicImpressions)}</p>
            <p className="text-[10px] text-gray-400">Impressões</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-gray-900">{fmt(post.engagedFans)}</p>
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
              <p className="text-sm font-bold text-gray-800">Facebook — {post.postType}</p>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <PostEmbed url={post.permalink} />
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: "Curtidas", value: fmt(post.totalLikes) },
                { label: "Reações", value: fmt(post.totalReactions) },
                { label: "Impressões", value: fmt(post.organicImpressions) },
                { label: "Comentários", value: fmt(post.totalComments) },
                { label: "Compartilh.", value: fmt(post.totalShares) },
                { label: "Fãs Engaj.", value: fmt(post.engagedFans) },
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

// ── Main component ─────────────────────────────────────────────────────────────

const Organico: React.FC = () => {
  const { igPosts, igFollows, fbPosts, fbFollows, loading, error } = useOrganicData()

  // ── Parse Instagram Posts ───────────────────────────────────────────────────
  const instagramPosts = useMemo<IgPost[]>(() => {
    if (!igPosts?.data?.values || igPosts.data.values.length < 2) return []
    const [headers, ...rows] = igPosts.data.values
    const idx = (col: string) => headers.indexOf(col)
    return rows.map((r) => ({
      accountName: r[idx("Account Name")] || "",
      mediaType: r[idx("Media Type")] || "",
      mediaUrl: r[idx("Media URL")] || "",
      permalink: r[idx("Media Permalink")] || "",
      caption: r[idx("Media Caption")] || "",
      comments: parseN(r[idx("Media Comments")]),
      likes: parseN(r[idx("Media Likes")]),
      impressions: parseN(r[idx("Impressions")]),
      reach: parseN(r[idx("Reach")]),
      saves: parseN(r[idx("Saves")]),
      totalInteractions: parseN(r[idx("Media Total Interactions")]),
    })).filter((p) => p.permalink)
  }, [igPosts])

  // ── Parse Instagram Follows ─────────────────────────────────────────────────
  // O header pode estar na última linha (API invertida)
  const igFollowDays = useMemo<FollowDay[]>(() => {
    if (!igFollows?.data?.values || igFollows.data.values.length < 1) return []
    const rows = igFollows.data.values

    // Encontrar a linha de header (contém "Day" ou "Total Followers")
    const headerIdx = rows.findIndex((r) =>
      r.some((cell) => cell === "Day" || cell === "Total Followers")
    )

    let headers: string[]
    let dataRows: string[][]

    if (headerIdx >= 0) {
      headers = rows[headerIdx]
      // Dados são todas as linhas EXCETO o header
      dataRows = rows.filter((_, i) => i !== headerIdx)
    } else {
      // Fallback: sem header encontrado, usar posições fixas
      headers = ["Day", "Total Followers", "New Followers", "Impressions", "Page Name", "Profile Views", "Reach", "Website", "Website Clicks"]
      dataRows = rows
    }

    const idx = (col: string) => headers.indexOf(col)
    const dayIdx = idx("Day")
    const followersIdx = idx("Total Followers")
    const newFollIdx = idx("New Followers")
    const reachIdx = idx("Reach")

    return dataRows
      .map((r) => ({
        date: r[dayIdx] || "",
        followers: parseN(r[followersIdx]),
        newFollowers: parseN(r[newFollIdx]),
        reach: parseN(r[reachIdx]),
      }))
      .filter((d) => d.date && d.date.match(/^\d{4}-\d{2}-\d{2}$/))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [igFollows])

  // ── Parse Facebook Posts ────────────────────────────────────────────────────
  const facebookPosts = useMemo<FbPost[]>(() => {
    if (!fbPosts?.data?.values || fbPosts.data.values.length < 2) return []
    const [headers, ...rows] = fbPosts.data.values
    const idx = (col: string) => headers.indexOf(col)
    return rows.map((r) => ({
      pageName: r[idx("Page Name")] || "",
      postId: r[idx("Post ID")] || "",
      permalink: r[idx("Post Permalink")] || "",
      message: r[idx("Post Message")] || "",
      postType: r[idx("Post Type")] || "",
      publishTime: r[idx("Post Publish Time")] || "",
      totalLikes: parseN(r[idx("Post Total Likes")]),
      totalComments: parseN(r[idx("Post Total Comments")]),
      totalShares: parseN(r[idx("Post Total Shares")]),
      totalReactions: parseN(r[idx("Post Total Reactions")]),
      engagedFans: parseN(r[idx("Post Engaged Fans")]),
      organicImpressions: parseN(r[idx("Post Organic Impressions")]),
    })).filter((p) => p.permalink)
  }, [fbPosts])

  // ── Parse Facebook Follows ──────────────────────────────────────────────────
  const fbFollowDays = useMemo<FbFollowDay[]>(() => {
    if (!fbFollows?.data?.values || fbFollows.data.values.length < 2) return []
    const [headers, ...rows] = fbFollows.data.values
    const idx = (col: string) => headers.indexOf(col)
    return rows
      .map((r) => ({
        date: r[idx("Day")] || "",
        lifetimeLikes: parseN(r[idx("Lifetime Likes")]),
        totalFollows: parseN(r[idx("Total Follows")]),
        newFollows: parseN(r[idx("New Follows")]),
        newUnfollows: parseN(r[idx("New Unfollows")]),
      }))
      .filter((d) => d.date)
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [fbFollows])

  // ── Totals ──────────────────────────────────────────────────────────────────
  const igTotals = useMemo(() => {
    const latest = igFollowDays[igFollowDays.length - 1]
    const totalReach = igFollowDays.reduce((s, d) => s + d.reach, 0)
    const totalNewFollowers = igFollowDays.reduce((s, d) => s + d.newFollowers, 0)
    const totalLikes = instagramPosts.reduce((s, p) => s + p.likes, 0)
    const totalInteractions = instagramPosts.reduce((s, p) => s + p.totalInteractions, 0)
    return {
      followers: latest?.followers ?? 0,
      reach: totalReach,
      newFollowers: totalNewFollowers,
      totalLikes,
      totalInteractions,
    }
  }, [igFollowDays, instagramPosts])

  const fbTotals = useMemo(() => {
    const latest = fbFollowDays[fbFollowDays.length - 1]
    const totalNewFollows = fbFollowDays.reduce((s, d) => s + d.newFollows, 0)
    const totalReactions = facebookPosts.reduce((s, p) => s + p.totalReactions, 0)
    const totalImpressions = facebookPosts.reduce((s, p) => s + p.organicImpressions, 0)
    return {
      follows: latest?.totalFollows ?? 0,
      lifetimeLikes: latest?.lifetimeLikes ?? 0,
      newFollows: totalNewFollows,
      totalReactions,
      totalImpressions,
    }
  }, [fbFollowDays, facebookPosts])

  // ── Chart data ──────────────────────────────────────────────────────────────
  const igChartData = useMemo(() =>
    igFollowDays.map((d) => ({ x: d.date, y: d.newFollowers })),
    [igFollowDays]
  )

  const fbChartData = useMemo(() =>
    fbFollowDays.map((d) => ({ x: d.date, y: d.totalFollows })),
    [fbFollowDays]
  )

  // ── Trend helpers ────────────────────────────────────────────────────────────
  const trend = (days: { newFollowers?: number; newFollows?: number }[], key: "newFollowers" | "newFollows") => {
    if (days.length < 2) return 0
    const half = Math.floor(days.length / 2)
    const first = days.slice(0, half).reduce((s, d) => s + ((d as any)[key] ?? 0), 0)
    const second = days.slice(half).reduce((s, d) => s + ((d as any)[key] ?? 0), 0)
    if (first === 0) return second > 0 ? 100 : 0
    return ((second - first) / first) * 100
  }

  const igTrend = trend(igFollowDays as any[], "newFollowers")
  const fbTrend = trend(fbFollowDays as any[], "newFollows")

  if (loading) return <Loading message="Carregando dados orgânicos..." />
  if (error) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-red-500">Erro ao carregar dados: {error.message}</p>
    </div>
  )

  return (
    <div className="h-full flex flex-col space-y-4 overflow-auto">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="card-overlay rounded-2xl shadow-lg px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/images/Jetour_logo.svg" alt="Jetour" className="h-7 object-contain" />
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Orgânico</h1>
            <p className="text-xs text-gray-500">Performance das páginas Instagram e Facebook</p>
          </div>
        </div>
        <span className="text-xs text-gray-400">Atualizado: {new Date().toLocaleString("pt-BR")}</span>
      </div>

      {/* ── Split layout: Instagram (esq) | Facebook (dir) ──────────────────── */}
      <div className="grid grid-cols-2 gap-4">

        {/* ══════════════ INSTAGRAM ══════════════ */}
        <div className="flex flex-col gap-4">

          {/* Perfil card */}
          <div className="card-overlay rounded-2xl shadow-lg p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Instagram</p>
                <p className="text-xs text-gray-500">Jetour Brasil</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                style={{ backgroundColor: igTrend >= 0 ? "#dcfce7" : "#fee2e2", color: igTrend >= 0 ? "#16a34a" : "#dc2626" }}>
                {igTrend >= 0
                  ? <TrendingUp className="w-3.5 h-3.5" />
                  : <TrendingDown className="w-3.5 h-3.5" />}
                {Math.abs(igTrend).toFixed(1)}%
              </div>
            </div>

            {/* Big numbers */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: "Seguidores", value: fmt(igTotals.followers), icon: <Users className="w-4 h-4" /> },
                { label: "Novos seguid.", value: fmt(igTotals.newFollowers), icon: <TrendingUp className="w-4 h-4" /> },
                { label: "Curtidas", value: fmt(igTotals.totalLikes), icon: <Heart className="w-4 h-4" /> },
              ].map((c) => (
                <div key={c.label} className="bg-slate-700/80 rounded-2xl px-3 py-2.5 flex flex-col gap-1 text-white">
                  <div className="flex items-center gap-1.5 text-slate-300 text-xs">{c.icon}{c.label}</div>
                  <div className="text-base font-bold truncate">{c.value}</div>
                </div>
              ))}
            </div>

            {/* Gráfico seguidores */}
            <MiniChart data={igChartData} color="#ec4899" label="Novos seguidores por dia" />
          </div>

          {/* Posts */}
          <div className="card-overlay rounded-2xl shadow-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-900">Publicações ({instagramPosts.length})</p>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Eye className="w-3.5 h-3.5" />
                Clique para ver detalhes
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
              {instagramPosts.map((post, i) => (
                <IgPostCard key={i} post={post} />
              ))}
              {instagramPosts.length === 0 && (
                <p className="col-span-2 text-sm text-gray-400 text-center py-8">Nenhuma publicação encontrada</p>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════ FACEBOOK ══════════════ */}
        <div className="flex flex-col gap-4">

          {/* Perfil card */}
          <div className="card-overlay rounded-2xl shadow-lg p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Facebook</p>
                <p className="text-xs text-gray-500">Jetour Brasil</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                style={{ backgroundColor: fbTrend >= 0 ? "#dcfce7" : "#fee2e2", color: fbTrend >= 0 ? "#16a34a" : "#dc2626" }}>
                {fbTrend >= 0
                  ? <TrendingUp className="w-3.5 h-3.5" />
                  : <TrendingDown className="w-3.5 h-3.5" />}
                {Math.abs(fbTrend).toFixed(1)}%
              </div>
            </div>

            {/* Big numbers */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: "Seguidores", value: fmt(fbTotals.follows), icon: <Users className="w-4 h-4" /> },
                { label: "Novos seguid.", value: fmt(fbTotals.newFollows), icon: <TrendingUp className="w-4 h-4" /> },
                { label: "Reações", value: fmt(fbTotals.totalReactions), icon: <Heart className="w-4 h-4" /> },
              ].map((c) => (
                <div key={c.label} className="bg-slate-700/80 rounded-2xl px-3 py-2.5 flex flex-col gap-1 text-white">
                  <div className="flex items-center gap-1.5 text-slate-300 text-xs">{c.icon}{c.label}</div>
                  <div className="text-base font-bold truncate">{c.value}</div>
                </div>
              ))}
            </div>

            {/* Gráfico seguidores */}
            <MiniChart data={fbChartData} color="#3b82f6" label="Seguidores ao longo do tempo" />
          </div>

          {/* Posts */}
          <div className="card-overlay rounded-2xl shadow-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-900">Publicações ({facebookPosts.length})</p>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Eye className="w-3.5 h-3.5" />
                Clique para ver detalhes
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
              {facebookPosts.map((post, i) => (
                <FbPostCard key={i} post={post} />
              ))}
              {facebookPosts.length === 0 && (
                <p className="col-span-2 text-sm text-gray-400 text-center py-8">Nenhuma publicação encontrada</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Organico
