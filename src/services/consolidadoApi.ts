"use client"

import React, { useState } from "react"
import axios from "axios"

const API_BASE_URL = "https://losningtech-api.vercel.app"
const SHEET_ID = "18UkZm8EdfK-IVYpmgTMmyiW0rqdacCFh4ii0C_gTH6s"

export const consolidadoApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
})

consolidadoApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error)
    return Promise.reject(error)
  },
)

export interface ConsolidadoData {
  success: boolean
  data: {
    range: string
    majorDimension: string
    values: string[][]
  }
}

// ─── Fetch functions ────────────────────────────────────────────────────────

export const fetchConsolidadoGeral = async (): Promise<ConsolidadoData> => {
  const response = await consolidadoApi.get(
    `/google/sheets/${SHEET_ID}/data?sheet=consolidado`
  )
  return response.data
}

export const fetchMetaCreatives = async (): Promise<ConsolidadoData> => {
  const response = await consolidadoApi.get(
    `/google/sheets/${SHEET_ID}/data?sheet=Meta`
  )
  return response.data
}

export const fetchLinkedInCreatives = async (): Promise<ConsolidadoData> => {
  const response = await consolidadoApi.get(
    `/google/sheets/${SHEET_ID}/data?sheet=Linkedin`
  )
  return response.data
}

export const fetchTikTokCreatives = async (): Promise<ConsolidadoData> => {
  const response = await consolidadoApi.get(
    `/google/sheets/${SHEET_ID}/data?sheet=tiktok`
  )
  return response.data
}

export const fetchGoogleSearchCreatives = async (): Promise<ConsolidadoData> => {
  const response = await consolidadoApi.get(
    `/google/sheets/${SHEET_ID}/data?sheet=Google%20-%20Search`
  )
  return response.data
}

export const useGoogleSearchData = () => {
  const [data, setData] = useState<ConsolidadoData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      setData(await fetchGoogleSearchCreatives())
      setError(null)
    } catch (err) { setError(err as Error) } finally { setLoading(false) }
  }, [])

  React.useEffect(() => { loadData() }, [loadData])
  return { data, loading, error, refetch: loadData }
}

export const fetchGooglePMaxCreatives = async (): Promise<ConsolidadoData> => {
  const response = await consolidadoApi.get(
    `/google/sheets/${SHEET_ID}/data?sheet=Google%20-%20PMAX`
  )
  return response.data
}

export const fetchGA4 = async (): Promise<ConsolidadoData> => {
  const response = await consolidadoApi.get(
    `/google/sheets/${SHEET_ID}/data?sheet=ga4`
  )
  return response.data
}

export const fetchGA4Eventos = async (): Promise<ConsolidadoData> => {
  const response = await consolidadoApi.get(
    `/google/sheets/${SHEET_ID}/data?sheet=GA4%20-%20Eventos`
  )
  return response.data
}

export const fetchGA4Mapa = async (): Promise<ConsolidadoData> => {
  const response = await consolidadoApi.get(
    `/google/sheets/${SHEET_ID}/data?sheet=GA4%20-%20Mapa`
  )
  return response.data
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export const parseBrazilianCurrency = (value: string): number => {
  if (!value || value === "0" || value === "-") return 0
  return parseFloat(
    value.replace(/R\$\s?/g, "").replace(/\./g, "").replace(",", ".")
  ) || 0
}

export const parseBrazilianNumber = (value: string): number => {
  if (!value || value === "0" || value === "-") return 0
  return parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Campaign {
  name: string
  isActive: boolean
  lastActivity: Date | null
  totalSpent: number
  impressions: number
  clicks: number
  videoViews: number
  engagements: number
  leads: number
  platforms: Set<string>
}

export interface Last7DaysMetrics {
  date: string
  impressions: number
  clicks: number
  videoViews: number
  spent: number
  leads: number
}

// ─── Processing ──────────────────────────────────────────────────────────────

export const processCampaigns = (data: ConsolidadoData): Campaign[] => {
  if (!data.success || !data.data.values || data.data.values.length < 2) return []

  const headers = data.data.values[0]
  const rows = data.data.values.slice(1)

  const dateIndex = headers.indexOf("Date")
  const campaignIndex = headers.indexOf("Campanha Nome")
  const spentIndex = headers.indexOf("Total spent")
  const impressionsIndex = headers.indexOf("Impressions")
  const clicksIndex = headers.indexOf("Clicks")
  const videoViewsIndex = headers.indexOf("Video views")
  const engagementsIndex = headers.indexOf("Total engagements")
  const leadsIndex = headers.indexOf("Leads")
  const veiculoIndex = headers.indexOf("Veículo")

  const campaignsMap = new Map<string, Campaign>()

  const today = new Date()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(today.getDate() - 7)

  rows.forEach((row) => {
    const campaignName = row[campaignIndex]
    if (!campaignName) return

    const dateStr = row[dateIndex]
    let rowDate: Date | null = null
    if (dateStr) {
      const [day, month, year] = dateStr.split("/")
      rowDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    }

    const spent = parseBrazilianCurrency(row[spentIndex] || "0")
    const impressions = parseBrazilianNumber(row[impressionsIndex] || "0")
    const clicks = parseBrazilianNumber(row[clicksIndex] || "0")
    const videoViews = parseBrazilianNumber(row[videoViewsIndex] || "0")
    const engagements = parseBrazilianNumber(row[engagementsIndex] || "0")
    const leads = parseBrazilianNumber(row[leadsIndex] || "0")
    const veiculo = (row[veiculoIndex] || "").trim()

    if (!campaignsMap.has(campaignName)) {
      campaignsMap.set(campaignName, {
        name: campaignName,
        isActive: false,
        lastActivity: null,
        totalSpent: 0,
        impressions: 0,
        clicks: 0,
        videoViews: 0,
        engagements: 0,
        leads: 0,
        platforms: new Set(),
      })
    }

    const campaign = campaignsMap.get(campaignName)!
    campaign.totalSpent += spent
    campaign.impressions += impressions
    campaign.clicks += clicks
    campaign.videoViews += videoViews
    campaign.engagements += engagements
    campaign.leads += leads
    if (veiculo) campaign.platforms.add(veiculo)

    if (rowDate && rowDate >= sevenDaysAgo && rowDate <= today) {
      if (spent > 0 && impressions > 0) campaign.isActive = true
      if (!campaign.lastActivity || rowDate > campaign.lastActivity) {
        campaign.lastActivity = rowDate
      }
    }
  })

  return Array.from(campaignsMap.values()).sort((a, b) => {
    if (!a.lastActivity && !b.lastActivity) return 0
    if (!a.lastActivity) return 1
    if (!b.lastActivity) return -1
    return b.lastActivity.getTime() - a.lastActivity.getTime()
  })
}

export const getLast7DaysMetrics = (data: ConsolidadoData): Last7DaysMetrics[] => {
  if (!data.success || !data.data.values || data.data.values.length < 2) return []

  const headers = data.data.values[0]
  const rows = data.data.values.slice(1)

  const dateIndex = headers.indexOf("Date")
  const spentIndex = headers.indexOf("Total spent")
  const impressionsIndex = headers.indexOf("Impressions")
  const clicksIndex = headers.indexOf("Clicks")
  const videoViewsIndex = headers.indexOf("Video views")
  const leadsIndex = headers.indexOf("Leads")

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)

  const sevenDaysAgo = new Date(yesterday)
  sevenDaysAgo.setDate(yesterday.getDate() - 6)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const metricsMap = new Map<string, Last7DaysMetrics>()

  rows.forEach((row) => {
    const dateStr = row[dateIndex]
    if (!dateStr) return

    const [day, month, year] = dateStr.split("/")
    const rowDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    rowDate.setHours(0, 0, 0, 0)

    if (rowDate >= sevenDaysAgo && rowDate <= yesterday) {
      if (!metricsMap.has(dateStr)) {
        metricsMap.set(dateStr, { date: dateStr, impressions: 0, clicks: 0, videoViews: 0, spent: 0, leads: 0 })
      }
      const m = metricsMap.get(dateStr)!
      m.impressions += parseBrazilianNumber(row[impressionsIndex] || "0")
      m.clicks += parseBrazilianNumber(row[clicksIndex] || "0")
      m.videoViews += parseBrazilianNumber(row[videoViewsIndex] || "0")
      m.spent += parseBrazilianCurrency(row[spentIndex] || "0")
      m.leads += parseBrazilianNumber(row[leadsIndex] || "0")
    }
  })

  return Array.from(metricsMap.values()).sort((a, b) => {
    const [dayA, monthA, yearA] = a.date.split("/").map(Number)
    const [dayB, monthB, yearB] = b.date.split("/").map(Number)
    return new Date(yearA, monthA - 1, dayA).getTime() - new Date(yearB, monthB - 1, dayB).getTime()
  })
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export const useConsolidadoGeral = () => {
  const [data, setData] = useState<ConsolidadoData | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [last7Days, setLast7Days] = useState<Last7DaysMetrics[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchConsolidadoGeral()
      setData(result)
      setCampaigns(processCampaigns(result))
      setLast7Days(getLast7DaysMetrics(result))
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { loadData() }, [loadData])

  return { data, campaigns, last7Days, loading, error, refetch: loadData }
}

export const useMetaCreatives = () => {
  const [data, setData] = useState<ConsolidadoData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      setData(await fetchMetaCreatives())
      setError(null)
    } catch (err) { setError(err as Error) } finally { setLoading(false) }
  }, [])

  React.useEffect(() => { loadData() }, [loadData])
  return { data, loading, error, refetch: loadData }
}

export const useLinkedInCreatives = () => {
  const [data, setData] = useState<ConsolidadoData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      setData(await fetchLinkedInCreatives())
      setError(null)
    } catch (err) { setError(err as Error) } finally { setLoading(false) }
  }, [])

  React.useEffect(() => { loadData() }, [loadData])
  return { data, loading, error, refetch: loadData }
}

export const useGoogleAdsCreatives = () => {
  const [data, setData] = useState<ConsolidadoData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      // Busca Search e PMAX em paralelo e combina os valores
      const [searchData, pmaxData] = await Promise.all([
        fetchGoogleSearchCreatives(),
        fetchGooglePMaxCreatives(),
      ])
      // Retorna o Search como principal; o componente pode usar fetchGooglePMaxCreatives se precisar
      setData(searchData)
      setError(null)
    } catch (err) { setError(err as Error) } finally { setLoading(false) }
  }, [])

  React.useEffect(() => { loadData() }, [loadData])
  return { data, loading, error, refetch: loadData }
}

export const useTikTokCreatives = () => {
  const [data, setData] = useState<ConsolidadoData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      setData(await fetchTikTokCreatives())
      setError(null)
    } catch (err) { setError(err as Error) } finally { setLoading(false) }
  }, [])

  React.useEffect(() => { loadData() }, [loadData])
  return { data, loading, error, refetch: loadData }
}

export const useGA4 = () => {
  const [data, setData] = useState<ConsolidadoData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      setData(await fetchGA4())
      setError(null)
    } catch (err) { setError(err as Error) } finally { setLoading(false) }
  }, [])

  React.useEffect(() => { loadData() }, [loadData])
  return { data, loading, error, refetch: loadData }
}

export const useGA4Eventos = () => {
  const [data, setData] = useState<ConsolidadoData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      setData(await fetchGA4Eventos())
      setError(null)
    } catch (err) { setError(err as Error) } finally { setLoading(false) }
  }, [])

  React.useEffect(() => { loadData() }, [loadData])
  return { data, loading, error, refetch: loadData }
}

export const useGA4Mapa = () => {
  const [data, setData] = useState<ConsolidadoData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      setData(await fetchGA4Mapa())
      setError(null)
    } catch (err) { setError(err as Error) } finally { setLoading(false) }
  }, [])

  React.useEffect(() => { loadData() }, [loadData])
  return { data, loading, error, refetch: loadData }
}

// Mantido para compatibilidade com componentes que ainda usem usePlanoMidia
export const usePlanoMidia = () => {
  return { data: null as ConsolidadoData | null, loading: false, error: null as Error | null, refetch: async () => {} }
}
