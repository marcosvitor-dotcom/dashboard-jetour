"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { TrendingUp, Users, Eye, MousePointerClick, Activity, Zap, Globe } from "lucide-react"
import Loading from "../../components/Loading/Loading"
import { useGA4, useGA4Eventos, useGA4Mapa, parseBrazilianNumber } from "../../services/consolidadoApi"
import BrazilMap from "../../components/BrazilMap/BrazilMap"

// ─── Helpers ─────────────────────────────────────────────────────────────────

const parseNum = (val: string): number => {
  if (!val || val === "-") return 0
  if (val.endsWith("%")) return parseFloat(val.replace("%", "").replace(",", ".")) || 0
  if (val.includes(":")) return 0
  return parseBrazilianNumber(val)
}

const fmt = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".", ",")} mi`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)} mil`
  return v.toLocaleString("pt-BR")
}
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`

// State name mapping from GA4 to GeoJSON-compatible Portuguese names
const GA4_TO_PT: { [key: string]: string } = {
  "State of São Paulo": "São Paulo",
  "State of Sao Paulo": "São Paulo",
  "State of Rio de Janeiro": "Rio de Janeiro",
  "State of Minas Gerais": "Minas Gerais",
  "State of Bahia": "Bahia",
  "State of Rio Grande do Sul": "Rio Grande do Sul",
  "State of Parana": "Paraná",
  "State of Paraná": "Paraná",
  "State of Santa Catarina": "Santa Catarina",
  "State of Goias": "Goiás",
  "State of Goiás": "Goiás",
  "State of Pernambuco": "Pernambuco",
  "State of Ceara": "Ceará",
  "State of Ceará": "Ceará",
  "State of Amazonas": "Amazonas",
  "State of Para": "Pará",
  "State of Pará": "Pará",
  "State of Espirito Santo": "Espírito Santo",
  "State of Espírito Santo": "Espírito Santo",
  "State of Mato Grosso": "Mato Grosso",
  "State of Mato Grosso do Sul": "Mato Grosso do Sul",
  "State of Maranhao": "Maranhão",
  "State of Maranhão": "Maranhão",
  "State of Rio Grande do Norte": "Rio Grande do Norte",
  "State of Paraiba": "Paraíba",
  "State of Paraíba": "Paraíba",
  "State of Piaui": "Piauí",
  "State of Piauí": "Piauí",
  "State of Alagoas": "Alagoas",
  "State of Sergipe": "Sergipe",
  "State of Rondonia": "Rondônia",
  "State of Rondônia": "Rondônia",
  "State of Tocantins": "Tocantins",
  "State of Acre": "Acre",
  "State of Amapa": "Amapá",
  "State of Amapá": "Amapá",
  "State of Roraima": "Roraima",
  "Federal District": "Distrito Federal",
  "Ceara": "Ceará",
}

const normalizeName = (name: string): string => GA4_TO_PT[name] || name

// ─── Component ────────────────────────────────────────────────────────────────

const TrafegoEngajamento: React.FC = () => {
  const { data: ga4Data, loading: l1, error: e1, refetch: r1 } = useGA4()
  const { data: eventosData, loading: l2, error: e2, refetch: r2 } = useGA4Eventos()
  const { data: mapaData, loading: l3, error: e3, refetch: r3 } = useGA4Mapa()

  const [activeTab, setActiveTab] = useState<"overview" | "eventos" | "mapa">("overview")

  const refetch = () => { r1(); r2(); r3() }

  // ─── Parse GA4 overview ────────────────────────────────────────────────────
  const ga4Rows = useMemo(() => {
    if (!ga4Data?.success || !ga4Data.data?.values || ga4Data.data.values.length < 2) return []
    const headers = ga4Data.data.values[0]
    const idx = (n: string) => headers.indexOf(n)
    return ga4Data.data.values.slice(1).map((row) => ({
      date: row[idx("Date")] || "",
      newUsers: parseNum(row[idx("New users")] || "0"),
      sessions: parseNum(row[idx("Sessions")] || "0"),
      views: parseNum(row[idx("Views")] || "0"),
      engagedSessions: parseNum(row[idx("Engaged sessions")] || "0"),
      eventCount: parseNum(row[idx("Event count")] || "0"),
      bounceRate: parseNum(row[idx("Bounce rate")] || "0"),
    }))
  }, [ga4Data])

  // ─── Parse Eventos ─────────────────────────────────────────────────────────
  const eventAgg = useMemo(() => {
    if (!eventosData?.success || !eventosData.data?.values || eventosData.data.values.length < 2) return []
    const headers = eventosData.data.values[0]
    const idx = (n: string) => headers.indexOf(n)
    const map = new Map<string, { eventCount: number; conversions: number }>()
    eventosData.data.values.slice(1).forEach((row) => {
      const name = row[idx("Event name")]
      if (!name) return
      const existing = map.get(name) || { eventCount: 0, conversions: 0 }
      existing.eventCount += parseNum(row[idx("Event count")] || "0")
      existing.conversions += parseNum(row[idx("Conversions")] || "0")
      map.set(name, existing)
    })
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.eventCount - a.eventCount)
  }, [eventosData])

  // ─── Parse Mapa ────────────────────────────────────────────────────────────
  const regionAgg = useMemo(() => {
    if (!mapaData?.success || !mapaData.data?.values || mapaData.data.values.length < 2) return []
    const headers = mapaData.data.values[0]
    const idx = (n: string) => headers.indexOf(n)
    const map = new Map<string, { sessions: number; eventCount: number; conversions: number }>()
    mapaData.data.values.slice(1).forEach((row) => {
      const rawRegion = row[idx("Region")] || row[idx("Country")] || ""
      if (!rawRegion) return
      const region = normalizeName(rawRegion)
      const existing = map.get(region) || { sessions: 0, eventCount: 0, conversions: 0 }
      existing.sessions += parseNum(row[idx("Sessions")] || "0")
      existing.eventCount += parseNum(row[idx("Event count")] || "0")
      existing.conversions += parseNum(row[idx("Conversions")] || "0")
      map.set(region, existing)
    })
    return Array.from(map.entries())
      .map(([region, v]) => ({ region, ...v }))
      .sort((a, b) => b.sessions - a.sessions)
  }, [mapaData])

  // ─── Map data for BrazilMap ───────────────────────────────────────────────
  const regionDataForMap = useMemo(() => {
    const obj: { [key: string]: number } = {}
    regionAgg.forEach((r) => { obj[r.region] = r.sessions })
    return obj
  }, [regionAgg])

  const maxSessions = regionAgg[0]?.sessions || 1
  const getIntensityColor = (sessions: number): string => {
    if (sessions === 0) return "#e2e8f0"
    const intensity = Math.min(sessions / maxSessions, 1)
    // Blue gradient: light → dark
    const r = Math.round(219 - intensity * 170)
    const g = Math.round(234 - intensity * 140)
    const b = Math.round(254 - intensity * 50)
    return `rgb(${r},${g},${b})`
  }

  // ─── Totals ────────────────────────────────────────────────────────────────
  const totals = useMemo(() => ({
    newUsers: ga4Rows.reduce((s, r) => s + r.newUsers, 0),
    sessions: ga4Rows.reduce((s, r) => s + r.sessions, 0),
    views: ga4Rows.reduce((s, r) => s + r.views, 0),
    engagedSessions: ga4Rows.reduce((s, r) => s + r.engagedSessions, 0),
    eventCount: ga4Rows.reduce((s, r) => s + r.eventCount, 0),
    avgBounceRate: ga4Rows.length > 0
      ? ga4Rows.reduce((s, r) => s + r.bounceRate, 0) / ga4Rows.length
      : 0,
  }), [ga4Rows])

  // ─── Daily sorted ─────────────────────────────────────────────────────────
  const dailySorted = useMemo(() => {
    const map = new Map<string, typeof ga4Rows[0]>()
    ga4Rows.forEach((r) => {
      if (!r.date) return
      const ex = map.get(r.date)
      if (!ex) { map.set(r.date, { ...r }) } else {
        ex.sessions += r.sessions; ex.newUsers += r.newUsers
        ex.views += r.views; ex.engagedSessions += r.engagedSessions
        ex.eventCount += r.eventCount
      }
    })
    return Array.from(map.values()).sort((a, b) => {
      const parseD = (s: string) => { const p = s.split("/"); return p.length === 3 ? new Date(+p[2], +p[1] - 1, +p[0]).getTime() : new Date(s).getTime() }
      return parseD(b.date) - parseD(a.date)
    })
  }, [ga4Rows])

  const barMax = Math.max(...dailySorted.slice(0, 14).map((r) => r.sessions), 1)

  const loading = l1 || l2 || l3
  const error = e1 || e2 || e3

  if (loading) return <Loading message="Carregando dados de tráfego..." />
  if (error)
    return (
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
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Site</h1>
            <p className="text-xs text-gray-500">Google Analytics 4 — dados do site</p>
          </div>
        </div>
        <TrendingUp className="w-7 h-7 text-gray-400" />
      </div>

      {/* Big numbers */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Novos Usuários",   value: fmt(totals.newUsers),         icon: <Users className="w-4 h-4" /> },
          { label: "Sessões",          value: fmt(totals.sessions),          icon: <Activity className="w-4 h-4" /> },
          { label: "Visualizações",    value: fmt(totals.views),             icon: <Eye className="w-4 h-4" /> },
          { label: "Sess. Engajadas",  value: fmt(totals.engagedSessions),   icon: <MousePointerClick className="w-4 h-4" /> },
          { label: "Eventos",          value: fmt(totals.eventCount),        icon: <Zap className="w-4 h-4" /> },
          { label: "Taxa de Rejeição", value: fmtPct(totals.avgBounceRate),  icon: <Globe className="w-4 h-4" /> },
        ].map((c) => (
          <div key={c.label} className="bg-slate-700/80 rounded-2xl px-3 py-3 flex flex-col gap-1 text-white">
            <div className="flex items-center gap-1.5 text-slate-300 text-xs">{c.icon}{c.label}</div>
            <div className="text-sm font-bold truncate">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["overview", "eventos", "mapa"] as const).map((tab) => {
          const labels = { overview: "Visão Geral", eventos: "Eventos", mapa: "Mapa do Brasil" }
          return (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === tab
                  ? "bg-slate-700 text-white shadow"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {labels[tab]}
            </button>
          )
        })}
      </div>

      {/* ── Overview ──────────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* Bar chart: last 14 days */}
          <div className="card-overlay rounded-2xl shadow-lg p-4">
            <p className="text-sm font-bold text-gray-800 mb-4">Sessões por dia (últimos 14 dias)</p>
            {dailySorted.length === 0 ? (
              <div className="text-gray-400 text-sm text-center py-8">Sem dados disponíveis</div>
            ) : (
              <div className="flex items-end gap-1.5" style={{ height: 160 }}>
                {dailySorted.slice(0, 14).reverse().map((row) => {
                  const pct = (row.sessions / barMax) * 100
                  const label = row.date.slice(0, 5)
                  return (
                    <div key={row.date} className="flex-1 flex flex-col items-center gap-1 group">
                      <div className="text-xs text-transparent group-hover:text-gray-500 transition-colors whitespace-nowrap font-semibold">
                        {fmt(row.sessions)}
                      </div>
                      <div className="w-full relative" style={{ height: 120 }}>
                        <div className="absolute bottom-0 left-0 right-0 bg-blue-200 rounded-t" style={{ height: "100%" }} />
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-blue-500 rounded-t transition-all"
                          style={{ height: `${pct}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-400 whitespace-nowrap">{label}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Data table */}
          <div className="card-overlay rounded-2xl shadow p-4">
            <p className="text-sm font-bold text-gray-800 mb-3">Dados por Dia</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-700 text-white">
                    <th className="text-left py-2.5 px-3 font-semibold rounded-l-xl">Data</th>
                    <th className="text-right py-2.5 px-3 font-semibold">Novos Usuários</th>
                    <th className="text-right py-2.5 px-3 font-semibold">Sessões</th>
                    <th className="text-right py-2.5 px-3 font-semibold">Visualizações</th>
                    <th className="text-right py-2.5 px-3 font-semibold">Sess. Engajadas</th>
                    <th className="text-right py-2.5 px-3 font-semibold">Eventos</th>
                    <th className="text-right py-2.5 px-3 font-semibold rounded-r-xl">Tx. Rejeição</th>
                  </tr>
                </thead>
                <tbody>
                  {dailySorted.map((row, i) => (
                    <tr key={row.date} className={i % 2 === 0 ? "bg-slate-50/60" : "bg-white/40"}>
                      <td className="py-2.5 px-3 font-semibold text-gray-700">{row.date}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700">{fmt(row.newUsers)}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700">{fmt(row.sessions)}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700">{fmt(row.views)}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700">{fmt(row.engagedSessions)}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700">{fmt(row.eventCount)}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700">{fmtPct(row.bounceRate)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-700 text-white font-bold border-t-2 border-slate-600">
                    <td className="py-2.5 px-3 rounded-l-xl">Total</td>
                    <td className="py-2.5 px-3 text-right">{fmt(totals.newUsers)}</td>
                    <td className="py-2.5 px-3 text-right">{fmt(totals.sessions)}</td>
                    <td className="py-2.5 px-3 text-right">{fmt(totals.views)}</td>
                    <td className="py-2.5 px-3 text-right">{fmt(totals.engagedSessions)}</td>
                    <td className="py-2.5 px-3 text-right">{fmt(totals.eventCount)}</td>
                    <td className="py-2.5 px-3 text-right rounded-r-xl">{fmtPct(totals.avgBounceRate)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Eventos ───────────────────────────────────────────────────────── */}
      {activeTab === "eventos" && (
        <div className="space-y-4">
          {/* Horizontal bars */}
          <div className="card-overlay rounded-2xl shadow-lg p-4">
            <p className="text-sm font-bold text-gray-800 mb-4">Principais eventos</p>
            {eventAgg.length === 0 ? (
              <div className="text-gray-400 text-sm text-center py-8">Sem dados de eventos</div>
            ) : (
              <div className="space-y-2.5">
                {eventAgg.slice(0, 20).map((ev) => {
                  const maxEvt = eventAgg[0]?.eventCount || 1
                  const pct = (ev.eventCount / maxEvt) * 100
                  return (
                    <div key={ev.name} className="flex items-center gap-3">
                      <div className="w-44 text-xs text-gray-700 font-medium truncate" title={ev.name}>{ev.name}</div>
                      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="w-16 text-right text-xs font-bold text-gray-800">{fmt(ev.eventCount)}</div>
                      {ev.conversions > 0 && (
                        <div className="w-20 text-right text-xs text-emerald-600 font-semibold">{fmt(ev.conversions)} conv.</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Events table */}
          <div className="card-overlay rounded-2xl shadow p-4">
            <p className="text-sm font-bold text-gray-800 mb-3">Todos os eventos ({eventAgg.length})</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-700 text-white">
                    <th className="text-left py-2.5 px-3 font-semibold rounded-l-xl">#</th>
                    <th className="text-left py-2.5 px-3 font-semibold">Evento</th>
                    <th className="text-right py-2.5 px-3 font-semibold">Contagem</th>
                    <th className="text-right py-2.5 px-3 font-semibold rounded-r-xl">Conversões</th>
                  </tr>
                </thead>
                <tbody>
                  {eventAgg.map((ev, i) => (
                    <tr key={ev.name} className={i % 2 === 0 ? "bg-slate-50/60" : "bg-white/40"}>
                      <td className="py-2.5 px-3 text-gray-400">{i + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-gray-900">{ev.name}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700">{fmt(ev.eventCount)}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700">{ev.conversions > 0 ? fmt(ev.conversions) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Mapa ──────────────────────────────────────────────────────────── */}
      {activeTab === "mapa" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Map */}
            <div className="card-overlay rounded-2xl shadow-lg p-4">
              <p className="text-sm font-bold text-gray-800 mb-3">Sessões por estado</p>
              <BrazilMap regionData={regionDataForMap} getIntensityColor={getIntensityColor} />
              {/* Legend */}
              <div className="flex items-center gap-2 mt-3 justify-center">
                <span className="text-xs text-gray-500">Menos</span>
                <div className="flex h-3 rounded overflow-hidden" style={{ width: 120 }}>
                  {[0.1, 0.3, 0.5, 0.7, 0.9, 1.0].map((v) => (
                    <div key={v} className="flex-1" style={{ background: getIntensityColor(v * maxSessions) }} />
                  ))}
                </div>
                <span className="text-xs text-gray-500">Mais</span>
              </div>
            </div>

            {/* Top regions list */}
            <div className="card-overlay rounded-2xl shadow-lg p-4">
              <p className="text-sm font-bold text-gray-800 mb-4">Sessões por região (Top 15)</p>
              {regionAgg.length === 0 ? (
                <div className="text-gray-400 text-sm text-center py-8">Sem dados de regiões</div>
              ) : (
                <div className="space-y-2.5">
                  {regionAgg.slice(0, 15).map((reg) => {
                    const pct = (reg.sessions / (regionAgg[0]?.sessions || 1)) * 100
                    return (
                      <div key={reg.region} className="flex items-center gap-3">
                        <div className="w-36 text-xs text-gray-700 font-medium truncate" title={reg.region}>{reg.region}</div>
                        <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="w-12 text-right text-xs font-bold text-gray-800">{fmt(reg.sessions)}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Regions table */}
          <div className="card-overlay rounded-2xl shadow p-4">
            <p className="text-sm font-bold text-gray-800 mb-3">Dados por região ({regionAgg.length})</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-700 text-white">
                    <th className="text-left py-2.5 px-3 font-semibold rounded-l-xl">#</th>
                    <th className="text-left py-2.5 px-3 font-semibold">Região / Estado</th>
                    <th className="text-right py-2.5 px-3 font-semibold">Sessões</th>
                    <th className="text-right py-2.5 px-3 font-semibold">Eventos</th>
                    <th className="text-right py-2.5 px-3 font-semibold rounded-r-xl">Conversões</th>
                  </tr>
                </thead>
                <tbody>
                  {regionAgg.map((reg, i) => (
                    <tr key={reg.region} className={i % 2 === 0 ? "bg-slate-50/60" : "bg-white/40"}>
                      <td className="py-2.5 px-3 text-gray-400">{i + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-gray-900">{reg.region}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700">{fmt(reg.sessions)}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700">{fmt(reg.eventCount)}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700">{reg.conversions > 0 ? fmt(reg.conversions) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TrafegoEngajamento
