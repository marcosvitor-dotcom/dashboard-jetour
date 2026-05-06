import React, { useEffect, useRef, useState } from "react"
import {
  generateCapaInsight,
  PeriodTotals,
  GeneralTotals,
  VehicleMetric,
  SessionsData,
  CapaInsightResult,
} from "../../services/geminiCapa"

interface Props {
  last7Totals: PeriodTotals
  prev7Totals: PeriodTotals
  generalTotals: GeneralTotals
  vehicleData: VehicleMetric[]
  sessionsData: SessionsData
}

const EMPTY: CapaInsightResult = { metricas: "", veiculos: "", sessoes: "" }

const Skeleton = () => (
  <div className="flex flex-col gap-2 w-full">
    {[80, 100, 65].map((w, i) => (
      <div key={i} className="flex gap-2">
        <div className="h-3 bg-current rounded-full opacity-20 animate-pulse" style={{ width: `${w}%`, animationDelay: `${i * 0.12}s` }} />
      </div>
    ))}
  </div>
)

const Section = ({
  icon,
  label,
  text,
  loading,
  accentClass,
  bgClass,
  borderClass,
  textClass,
}: {
  icon: React.ReactNode
  label: string
  text: string
  loading: boolean
  accentClass: string
  bgClass: string
  borderClass: string
  textClass: string
}) => (
  <div className={`flex-1 rounded-xl border ${borderClass} ${bgClass} px-4 py-3.5 flex flex-col gap-2.5 min-w-0`}>
    <div className="flex items-center gap-2">
      <div className={`p-1 rounded-md ${accentClass}`}>{icon}</div>
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
    </div>
    <div className={`text-sm leading-relaxed font-medium ${textClass} min-h-[40px]`}>
      {loading ? <Skeleton /> : text || <span className="text-gray-300 font-normal text-xs">Aguardando dados...</span>}
    </div>
  </div>
)

const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hora

const loadCache = (key: string): CapaInsightResult | null => {
  try {
    const raw = localStorage.getItem(`capaInsight_${key}`)
    if (!raw) return null
    const { ts, data } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL_MS) return null
    return data
  } catch { return null }
}

const saveCache = (key: string, data: CapaInsightResult) => {
  try {
    localStorage.setItem(`capaInsight_${key}`, JSON.stringify({ ts: Date.now(), data }))
  } catch {}
}

const CapaAIInsight = ({ last7Totals, prev7Totals, generalTotals, vehicleData, sessionsData }: Props) => {
  const [result, setResult] = useState<CapaInsightResult>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dataKey = `${Math.round(last7Totals.spent)}-${Math.round(last7Totals.impressions)}-${Math.round(last7Totals.leads)}-${Math.round(sessionsData.current)}-${vehicleData.length}`
  const lastKeyRef = useRef<string>("")
  const generatingRef = useRef(false)

  const generate = (forceRefresh = false) => {
    if (generatingRef.current) return

    if (!forceRefresh) {
      const cached = loadCache(dataKey)
      if (cached) {
        setResult(cached)
        return
      }
    }

    generatingRef.current = true
    setLoading(true)
    setError(null)

    generateCapaInsight(last7Totals, prev7Totals, generalTotals, vehicleData, sessionsData)
      .then((r) => {
        setResult(r)
        saveCache(dataKey, r)
      })
      .catch((err) => setError(err.message))
      .finally(() => {
        setLoading(false)
        generatingRef.current = false
      })
  }

  useEffect(() => {
    if (last7Totals.impressions === 0) return
    if (dataKey === lastKeyRef.current) return
    lastKeyRef.current = dataKey
    generate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey])

  return (
    <div className="card-overlay rounded-2xl shadow-lg p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-gradient-to-br from-violet-500 to-blue-600 rounded-lg">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 leading-tight">Leitura IA — Últimos 7 dias</h2>
            <p className="text-xs text-gray-400 leading-tight">Métricas · Veículos · Sessões — vs período anterior e benchmarks</p>
          </div>
        </div>

        {!loading && (
          <button
            onClick={() => { lastKeyRef.current = ""; generate(true) }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors"
            title="Gerar nova leitura"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Atualizar
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-red-500 text-xs mb-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* 3 Sections */}
      <div className="flex flex-col lg:flex-row gap-3">
        <Section
          icon={
            <svg className="w-3.5 h-3.5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          label="Métricas & Benchmarks"
          text={result.metricas}
          loading={loading}
          accentClass="bg-violet-100"
          bgClass="bg-gradient-to-br from-violet-50 to-white"
          borderClass="border-violet-100"
          textClass="text-gray-800"
        />

        <Section
          icon={
            <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          }
          label="Veículos"
          text={result.veiculos}
          loading={loading}
          accentClass="bg-blue-100"
          bgClass="bg-gradient-to-br from-blue-50 to-white"
          borderClass="border-blue-100"
          textClass="text-gray-800"
        />

        <Section
          icon={
            <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
          label="Sessões GA4"
          text={result.sessoes}
          loading={loading}
          accentClass="bg-indigo-100"
          bgClass="bg-gradient-to-br from-indigo-50 to-white"
          borderClass="border-indigo-100"
          textClass="text-gray-800"
        />
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100">
        <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className="text-xs text-gray-400">Gerado por Gemini · dados reais + benchmarks históricos da conta</span>
      </div>
    </div>
  )
}

export default CapaAIInsight
