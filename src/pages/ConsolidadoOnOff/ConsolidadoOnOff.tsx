"use client"

import type React from "react"
import { useMemo } from "react"
import { Link } from "react-router-dom"
import {
  DollarSign,
  Eye,
  MousePointerClick,
  Users,
  Globe,
  Radio,
  TrendingUp,
  Layers,
  Wifi,
  WifiOff,
  ArrowUpRight,
} from "lucide-react"
import {
  parseBrazilianCurrency,
  parseBrazilianNumber,
} from "../../services/consolidadoApi"
import { useData } from "../../contexts/DataContext"
import Loading from "../../components/Loading/Loading"

const parseOfflineNumero = (numero: string): number => {
  if (!numero || numero === "-" || numero === "") return 0
  const cleanValue = numero.replace(/\./g, "").replace(/,/g, ".").trim()
  const parsed = Number.parseFloat(cleanValue)
  return isNaN(parsed) ? 0 : parsed
}

const parseOfflineCurrency = (valor: string): number => {
  if (!valor || valor === "-" || valor === "") return 0
  const cleanValue = valor
    .replace(/R\$\s?/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .trim()
  const parsed = Number.parseFloat(cleanValue)
  return isNaN(parsed) ? 0 : parsed
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

const formatNumber = (v: number) => v.toLocaleString("pt-BR")

const formatCurrencyCompact = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace(".", ",")} mi`
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)} mil`
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
}

interface DonutChartProps {
  online: number
  offline: number
  total: number
}

const DonutChart: React.FC<DonutChartProps> = ({ online, offline, total }) => {
  const size = 180
  const stroke = 26
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const onlineShare = total > 0 ? online / total : 0
  const onlineDash = circumference * onlineShare
  const offlineDash = circumference - onlineDash

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* Track de fundo */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={stroke}
        />
        {total > 0 && (
          <>
            {/* Online */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#2563eb"
              strokeWidth={stroke}
              strokeDasharray={`${onlineDash} ${circumference - onlineDash}`}
              strokeDashoffset={0}
              strokeLinecap="butt"
            />
            {/* Offline */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#f59e0b"
              strokeWidth={stroke}
              strokeDasharray={`${offlineDash} ${circumference - offlineDash}`}
              strokeDashoffset={-onlineDash}
              strokeLinecap="butt"
            />
          </>
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
        <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">
          Total
        </p>
        <p className="text-base font-bold text-gray-900 leading-tight">
          {formatCurrencyCompact(total)}
        </p>
      </div>
    </div>
  )
}

const ConsolidadoOnOff: React.FC = () => {
  const {
    data: consolidadoData,
    searchData,
    ga4Data,
    ga4LeadsData,
    offlineData,
    loadingConsolidado,
    loadingSearch,
    loadingGA4,
    loadingGA4Leads,
    loadingOffline,
    error,
  } = useData()

  const loading =
    loadingConsolidado || loadingSearch || loadingGA4 || loadingGA4Leads || loadingOffline

  // ── Totais Online (consolidado + Google Search) ───────────────────────────
  const totaisOnline = useMemo(() => {
    const base = { spent: 0, impressions: 0, clicks: 0, videoViews: 0, leads: 0 }

    if (consolidadoData?.success && consolidadoData?.data?.values) {
      const headers = consolidadoData.data.values[0]
      const rows = consolidadoData.data.values.slice(1)
      const spentIdx = headers.indexOf("Total spent")
      const impressionsIdx = headers.indexOf("Impressions")
      const clicksIdx = headers.indexOf("Clicks")
      const videoViewsIdx = headers.indexOf("Video views")
      const leadsIdx = headers.indexOf("Leads")
      rows.forEach((row) => {
        base.spent += parseBrazilianCurrency(row[spentIdx] || "0")
        base.impressions += parseBrazilianNumber(row[impressionsIdx] || "0")
        base.clicks += parseBrazilianNumber(row[clicksIdx] || "0")
        base.videoViews += parseBrazilianNumber(row[videoViewsIdx] || "0")
        base.leads += parseBrazilianNumber(row[leadsIdx] || "0")
      })
    }

    if (searchData?.success && searchData?.data?.values && searchData.data.values.length > 1) {
      const headers = searchData.data.values[0]
      const rows = searchData.data.values.slice(1)
      const costIdx = headers.indexOf("Cost (Spend)")
      const clicksIdx = headers.indexOf("Clicks")
      const impressionsIdx = headers.indexOf("Impressions")
      const parseN = (v: string) =>
        parseFloat((v || "").replace(/[R$\s.]/g, "").replace(",", ".")) || 0
      const parseI = (v: string) =>
        parseInt((v || "").replace(/[.\s]/g, "").replace(",", "")) || 0
      rows.forEach((row) => {
        base.spent += parseN(row[costIdx] || "0")
        base.clicks += parseI(row[clicksIdx] || "0")
        base.impressions += parseI(row[impressionsIdx] || "0")
      })
    }

    return base
  }, [consolidadoData, searchData])

  // ── Sessões GA4 ───────────────────────────────────────────────────────────
  const totalSessoesGA = useMemo(() => {
    if (!ga4Data?.success || !ga4Data?.data?.values || ga4Data.data.values.length < 2) return 0
    const headers = ga4Data.data.values[0]
    const sessionsIdx = headers.indexOf("Sessions")
    if (sessionsIdx === -1) return 0
    return ga4Data.data.values.slice(1).reduce((acc, row) => {
      const val = row[sessionsIdx] || "0"
      return acc + (parseFloat(val.replace(/\./g, "").replace(",", ".")) || 0)
    }, 0)
  }, [ga4Data])

  // ── Leads cruzados (mesma lógica da Capa) ─────────────────────────────────
  const totalLeadsCruzado = useMemo(() => {
    const trackedPlatforms = new Set<string>()
    if (
      consolidadoData?.success &&
      consolidadoData?.data?.values &&
      consolidadoData.data.values.length > 1
    ) {
      const headers = consolidadoData.data.values[0]
      const veiculoIdx = headers.indexOf("Veículo")
      const leadsIdx = headers.indexOf("Leads")
      consolidadoData.data.values.slice(1).forEach((row) => {
        const leads = parseBrazilianNumber(row[leadsIdx] || "0")
        if (leads > 0 && row[veiculoIdx])
          trackedPlatforms.add(row[veiculoIdx].trim().toLowerCase())
      })
    }

    const normalizeSource = (src: string): string => {
      const s = src.toLowerCase()
      if (["ig", "l.instagram.com", "instagram.com", "instagram"].includes(s)) return "instagram"
      if (
        [
          "fb",
          "l.facebook.com",
          "m.facebook.com",
          "facebook.com",
          "meta",
          "facebook",
        ].includes(s)
      )
        return "meta"
      if (["google", "google ads", "cpc"].includes(s)) return "google"
      if (s === "linkedin-traf" || s === "linkedin") return "linkedin"
      if (s === "kwai.com" || s === "kwai") return "kwai"
      if (s === "ads.tiktok.com" || s === "tiktok") return "tiktok"
      if (["tagassistant.google.com", "gtm_teste"].includes(s)) return "testes"
      return s
    }

    let extra = 0
    if (
      ga4LeadsData?.success &&
      ga4LeadsData?.data?.values &&
      ga4LeadsData.data.values.length > 1
    ) {
      const headers = ga4LeadsData.data.values[0]
      const srcIdx = headers.indexOf("Session source")
      const cntIdx = headers.indexOf("Event count")
      ga4LeadsData.data.values.slice(1).forEach((row) => {
        const normalized = normalizeSource(row[srcIdx] || "")
        if (normalized === "testes") return
        if (trackedPlatforms.has(normalized)) return
        extra += parseInt(row[cntIdx] || "0", 10) || 0
      })
    }

    return totaisOnline.leads + extra
  }, [consolidadoData, ga4LeadsData, totaisOnline.leads])

  // ── Totais Offline ─────────────────────────────────────────────────────────
  const totaisOffline = useMemo(() => {
    const base = {
      spent: 0,
      entrega: 0,
      campanhas: 0,
      veiculos: 0,
      meios: 0,
    }
    if (!offlineData?.data?.values || offlineData.data.values.length <= 1) return base

    const headers = offlineData.data.values[0]
    const rows = offlineData.data.values.slice(1)
    const campanhaIdx = headers.indexOf("CAMPANHA")
    const meioIdx = headers.indexOf("MEIO")
    const veiculoIdx = headers.indexOf("VEÍCULO")
    const impressoesIdx = headers.indexOf("IMPRESSÕES / CLIQUES / DIÁRIAS")
    const valorIdx = headers.indexOf("VALOR DESEMBOLSO")

    const campanhasSet = new Set<string>()
    const veiculosSet = new Set<string>()
    const meiosSet = new Set<string>()

    rows.forEach((row: string[]) => {
      const meio = row[meioIdx] || ""
      const veiculo = row[veiculoIdx] || ""
      if (!meio || !veiculo) return
      if (meio.toLowerCase() === "internet") return

      base.spent += parseOfflineCurrency(row[valorIdx] || "0")
      base.entrega += parseOfflineNumero(row[impressoesIdx] || "0")
      if (row[campanhaIdx]) campanhasSet.add(row[campanhaIdx])
      veiculosSet.add(veiculo)
      meiosSet.add(meio)
    })

    base.campanhas = campanhasSet.size
    base.veiculos = veiculosSet.size
    base.meios = meiosSet.size
    return base
  }, [offlineData])

  // ── Totais Consolidados (ON + OFF) ────────────────────────────────────────
  const investimentoTotal = totaisOnline.spent + totaisOffline.spent
  const entregaTotal = totaisOnline.impressions + totaisOffline.entrega
  const shareOnline =
    investimentoTotal > 0 ? (totaisOnline.spent / investimentoTotal) * 100 : 0
  const shareOffline =
    investimentoTotal > 0 ? (totaisOffline.spent / investimentoTotal) * 100 : 0

  if (loading) return <Loading message="Carregando dashboard consolidado..." />

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">Erro ao carregar dados do dashboard</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col space-y-4 overflow-auto">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative rounded-2xl shadow-2xl h-32 md:h-44">
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          <video
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
          >
            <source src="/images/jetour-hero.mp4" media="(min-width: 768px)" type="video/mp4" />
            <source src="/images/Jetour_Hero_Mobile.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/40" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg max-w-2xl flex items-center gap-4">
            <img src="/images/LOGO_JETOUR.png" alt="Jetour" className="h-8 object-contain" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                Consolidado ON + OFF
              </h1>
              <p className="text-sm text-gray-600">
                Visão unificada de toda a veiculação desde o início
              </p>
            </div>
            <div className="ml-auto">
              <img
                src="/images/W+E_logo.png"
                alt="W+E"
                className="h-7 object-contain opacity-70"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Big Numbers — Total Geral ────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          Totais Consolidados (Online + Offline)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            {
              label: "Investimento Total",
              value: formatCurrency(investimentoTotal),
              icon: <DollarSign className="w-4 h-4" />,
            },
            {
              label: "Entrega Total",
              value: formatNumber(entregaTotal),
              icon: <TrendingUp className="w-4 h-4" />,
              hint: "Impressões online + entregas offline",
            },
            {
              label: "Cliques Totais",
              value: formatNumber(totaisOnline.clicks),
              icon: <MousePointerClick className="w-4 h-4" />,
            },
            {
              label: "Sessões na LP",
              value: formatNumber(totalSessoesGA),
              icon: <Globe className="w-4 h-4" />,
            },
            {
              label: "Leads",
              value: formatNumber(totalLeadsCruzado),
              icon: <Users className="w-4 h-4" />,
            },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-slate-700/80 rounded-2xl px-3 py-3 flex flex-col gap-1 text-white"
            >
              <div className="flex items-center gap-1.5 text-slate-300 text-xs">
                {card.icon}
                {card.label}
              </div>
              <div className="text-base font-bold truncate" title={card.hint}>
                {card.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3 cards lado a lado: Distribuição + Online + Offline ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card Distribuição de Investimento (donut) */}
        <div className="card-overlay rounded-2xl shadow-lg p-5 flex flex-col">
          <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-blue-600" />
            Distribuição de investimento
          </h2>
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <DonutChart
              online={totaisOnline.spent}
              offline={totaisOffline.spent}
              total={investimentoTotal}
            />
            <div className="w-full grid grid-cols-2 gap-2">
              <div className="flex flex-col items-start rounded-xl bg-blue-50 border border-blue-100 px-3 py-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  Online
                </div>
                <p className="text-sm font-bold text-blue-900 leading-tight mt-1">
                  {formatCurrency(totaisOnline.spent)}
                </p>
                <p className="text-[11px] text-blue-700">{shareOnline.toFixed(1)}%</p>
              </div>
              <div className="flex flex-col items-start rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Offline
                </div>
                <p className="text-sm font-bold text-amber-900 leading-tight mt-1">
                  {formatCurrency(totaisOffline.spent)}
                </p>
                <p className="text-[11px] text-amber-700">{shareOffline.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card ONLINE */}
        <Link
          to="/visao-online"
          className="card-overlay rounded-2xl shadow-lg p-5 flex flex-col group transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 hover:ring-2 hover:ring-blue-300 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Wifi className="w-4 h-4 text-blue-600" />
              Online
            </h2>
            <ArrowUpRight className="w-4 h-4 text-blue-600 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
          <div className="flex-1 grid grid-cols-2 gap-3">
            {[
              {
                label: "Investimento",
                value: formatCurrency(totaisOnline.spent),
                icon: <DollarSign className="w-4 h-4" />,
              },
              {
                label: "Impressões",
                value: formatNumber(totaisOnline.impressions),
                icon: <Eye className="w-4 h-4" />,
              },
              {
                label: "Cliques",
                value: formatNumber(totaisOnline.clicks),
                icon: <MousePointerClick className="w-4 h-4" />,
              },
              {
                label: "Leads",
                value: formatNumber(totalLeadsCruzado),
                icon: <Users className="w-4 h-4" />,
              },
            ].map((card) => (
              <div
                key={card.label}
                className="bg-slate-700/80 rounded-2xl px-3 py-3 flex flex-col gap-1 text-white"
              >
                <div className="flex items-center gap-1.5 text-slate-300 text-xs">
                  {card.icon}
                  {card.label}
                </div>
                <div className="text-base font-bold truncate">{card.value}</div>
              </div>
            ))}
          </div>
        </Link>

        {/* Card OFFLINE */}
        <Link
          to="/visao-offline"
          className="card-overlay rounded-2xl shadow-lg p-5 flex flex-col group transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 hover:ring-2 hover:ring-amber-300 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-600" />
              Offline
            </h2>
            <ArrowUpRight className="w-4 h-4 text-amber-600 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
          <div className="flex-1 grid grid-cols-2 gap-3">
            {[
              {
                label: "Investimento",
                value: formatCurrency(totaisOffline.spent),
                icon: <DollarSign className="w-4 h-4" />,
              },
              {
                label: "Entrega",
                value: formatNumber(totaisOffline.entrega),
                icon: <TrendingUp className="w-4 h-4" />,
              },
              {
                label: "Meios",
                value: formatNumber(totaisOffline.meios),
                icon: <Radio className="w-4 h-4" />,
              },
              {
                label: "Veículos",
                value: formatNumber(totaisOffline.veiculos),
                icon: <Radio className="w-4 h-4" />,
              },
            ].map((card) => (
              <div
                key={card.label}
                className="bg-slate-700/80 rounded-2xl px-3 py-3 flex flex-col gap-1 text-white"
              >
                <div className="flex items-center gap-1.5 text-slate-300 text-xs">
                  {card.icon}
                  {card.label}
                </div>
                <div className="text-base font-bold truncate">{card.value}</div>
              </div>
            ))}
          </div>
        </Link>
      </div>
    </div>
  )
}

export default ConsolidadoOnOff
