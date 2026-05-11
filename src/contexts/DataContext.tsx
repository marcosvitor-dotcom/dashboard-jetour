import React, { createContext, useContext, ReactNode } from "react"
import {
  useConsolidadoGeral,
  useGoogleSearchData,
  useGA4,
  useGA4Leads,
  Campaign,
  Last7DaysMetrics,
  ConsolidadoData,
} from "../services/consolidadoApi"
import { useOfflineData } from "../services/api"

interface DataContextType {
  // Consolidado (Meta, TikTok, etc.)
  data: ConsolidadoData | null
  campaigns: Campaign[]
  last7Days: Last7DaysMetrics[]

  // Demais datasets compartilhados (cacheados ao nível do app)
  searchData: ConsolidadoData | null
  ga4Data: ConsolidadoData | null
  ga4LeadsData: ConsolidadoData | null
  offlineData: any | null

  // Estados agregados
  loading: boolean
  loadingConsolidado: boolean
  loadingSearch: boolean
  loadingGA4: boolean
  loadingGA4Leads: boolean
  loadingOffline: boolean
  error: Error | null

  // Funções de refetch (granular)
  refetch: () => void
  refetchAll: () => void
}

const DataContext = createContext<DataContextType | undefined>(undefined)

interface DataProviderProps {
  children: ReactNode
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const {
    data,
    campaigns,
    last7Days,
    loading: loadingConsolidado,
    error: errorConsolidado,
    refetch: refetchConsolidado,
  } = useConsolidadoGeral()

  const {
    data: searchData,
    loading: loadingSearch,
    refetch: refetchSearch,
  } = useGoogleSearchData()

  const { data: ga4Data, loading: loadingGA4, refetch: refetchGA4 } = useGA4()

  const {
    data: ga4LeadsData,
    loading: loadingGA4Leads,
    refetch: refetchGA4Leads,
  } = useGA4Leads()

  const {
    data: offlineData,
    loading: loadingOffline,
    error: errorOffline,
    refetch: refetchOffline,
  } = useOfflineData()

  const refetchAll = () => {
    refetchConsolidado()
    refetchSearch()
    refetchGA4()
    refetchGA4Leads()
    refetchOffline()
  }

  const value: DataContextType = {
    data,
    campaigns,
    last7Days,
    searchData,
    ga4Data,
    ga4LeadsData,
    offlineData,
    loading: loadingConsolidado,
    loadingConsolidado,
    loadingSearch,
    loadingGA4,
    loadingGA4Leads,
    loadingOffline,
    error: errorConsolidado || errorOffline,
    refetch: refetchConsolidado,
    refetchAll,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = (): DataContextType => {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider")
  }
  return context
}
