"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { ChevronDown, ChevronUp, ChevronRight, FileText, Radio, TrendingUp, Megaphone, DollarSign } from "lucide-react"
import { useData } from "../../contexts/DataContext"
import Loading from "../../components/Loading/Loading"

// Interfaces para tipagem
interface VeiculoData {
  campanha: string
  insercoes: number
  impactos: number
  investimento: number
  tipoCompra: string
}

interface PracaUFData {
  nome: string
  uf: string
  veiculos: { [key: string]: VeiculoData }
  totalInsercoes: number
  totalImpactos: number
  totalInvestimento: number
}

interface MeioData {
  nome: string
  pracas: { [key: string]: PracaUFData }
  totalInsercoes: number
  totalImpactos: number
  totalInvestimento: number
}

interface CampanhaData {
  nome: string
  meios: {
    [meioNome: string]: {
      insercoes: number
      investimento: number
      veiculos: Set<string>
    }
  }
  totalInsercoes: number
  totalInvestimento: number
  totalVeiculos: number
}

// Função para converter string de número para número
const parseNumero = (numero: string): number => {
  if (!numero || numero === "-" || numero === "") return 0
  const cleanValue = numero.replace(/\./g, "").replace(/,/g, ".").trim()
  const parsed = Number.parseFloat(cleanValue)
  return isNaN(parsed) ? 0 : parsed
}

// Função para formatar números
const formatNumber = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return new Intl.NumberFormat("pt-BR").format(value)
}

// Função para formatar moeda
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

// Função para converter string de moeda brasileira para número
const parseCurrency = (valor: string): number => {
  if (!valor || valor === "-" || valor === "") return 0
  const cleanValue = valor
    .replace(/R\$\s?/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .trim()
  const parsed = Number.parseFloat(cleanValue)
  return isNaN(parsed) ? 0 : parsed
}

// Função para categorizar praças
const categorizarPraca = (praca: string): string => {
  const pracaUpper = praca.toUpperCase().trim()

  // Categoria: Abrangência
  if (pracaUpper === "NACIONAL") return "Abrangência|Nacional"
  if (pracaUpper === "INTERNACIONAL") return "Abrangência|Internacional"
  if (pracaUpper === "LOCAL") return "Abrangência|Local"
  if (pracaUpper === "REGIONAL") return "Abrangência|Regional"
  if (pracaUpper === "REGIÃO NORTE") return "Abrangência|Região Norte"

  // Categoria: Estados (siglas de 2 letras)
  const siglas = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"]
  if (siglas.includes(pracaUpper)) return "Estados|" + praca

  // Categoria: Regiões especiais (com vírgula ou múltiplos estados)
  if (pracaUpper.includes(",") || pracaUpper.includes(" E ")) return "Regiões|" + praca

  // Categoria: Cidades (todo o resto)
  return "Cidades|" + praca
}

// Interface para praças categorizadas
interface PracasCategorized {
  "Abrangência": string[]
  "Regiões": string[]
  "Estados": string[]
  "Cidades": string[]
}

// Mapa de número do mês para nome em português
const MESES: Record<string, string> = {
  "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
  "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
  "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro",
}

// Extrai o número do mês de strings como "10/03", "10/03/2026", "2026-03-10"
const extrairMes = (inicio: string): string => {
  if (!inicio) return ""
  // Formato DD/MM ou DD/MM/YYYY
  const partes = inicio.split("/")
  if (partes.length >= 2) return partes[1].padStart(2, "0").substring(0, 2)
  // Formato YYYY-MM-DD
  const iso = inicio.split("-")
  if (iso.length === 3) return iso[1].padStart(2, "0")
  return ""
}

const VeiculacaoOffline: React.FC = () => {
  const { offlineData: data, loadingOffline: loading, error } = useData()
  const [expandedMeios, setExpandedMeios] = useState<{ [key: string]: boolean }>({})
  const [expandedPracas, setExpandedPracas] = useState<{ [key: string]: boolean }>({})
  const [expandedCampanha, setExpandedCampanha] = useState<string | null>(null)

  // Estados para filtros
  const [filtroCampanha, setFiltroCampanha] = useState<string>("")
  const [filtroPraca, setFiltroPraca] = useState<string>("")
  const [filtroMes, setFiltroMes] = useState<string>("")

  // Processar dados da API
  const processedData = useMemo(() => {
    const empty = {
      meios: {},
      totais: { campanhas: 0, veiculos: 0, insercoes: 0, impactos: 0, investimento: 0 },
      campanhas: [] as string[],
      campanhasData: [] as CampanhaData[],
      pracas: [] as string[],
      pracasCategorized: { "Abrangência": [], "Regiões": [], "Estados": [], "Cidades": [] } as PracasCategorized,
      tiposCompra: new Set<string>(),
      meses: [] as string[],           // lista ordenada de meses disponíveis (ex: ["02","03"])
      mesesMeios: {} as Record<string, Set<string>>, // mes -> Set de meios ativos
    }

    if (!data?.data?.values || data.data.values.length <= 1) return empty

    const meiosData: { [key: string]: MeioData } = {}
    const campanhasSet = new Set<string>()
    const pracasSet = new Set<string>()
    const veiculosSet = new Set<string>()
    const tiposCompraSet = new Set<string>()
    const mesesSet = new Set<string>()
    const mesesMeios: Record<string, Set<string>> = {}

    const campanhasFiltradas = new Set<string>()
    const veiculosFiltrados = new Set<string>()

    let totalInsercoes = 0
    let totalImpactos = 0
    let totalInvestimento = 0

    const headers = data.data.values[0]
    const rows = data.data.values.slice(1)

    const campanhaIndex   = headers.indexOf("CAMPANHA")
    const meioIndex       = headers.indexOf("MEIO")
    const pracaIndex      = headers.indexOf("PRAÇA")
    const veiculoIndex    = headers.indexOf("VEÍCULO")
    const impressoesIndex = headers.indexOf("IMPRESSÕES / CLIQUES / DIÁRIAS")
    const tipoCompraIndex = headers.indexOf("TIPO DE COMPRA")
    const valorIndex      = headers.indexOf("VALOR DESEMBOLSO")
    const inicioIndex     = headers.indexOf("INÍCIO")

    rows.forEach((row: string[]) => {
      const campanha      = row[campanhaIndex] || ""
      const meio          = row[meioIndex] || ""
      const praca         = row[pracaIndex] || ""
      const veiculo       = row[veiculoIndex] || ""
      const impressoes    = row[impressoesIndex] || "0"
      const tipoCompra    = row[tipoCompraIndex] || ""
      const valorDesembolso = row[valorIndex] || "0"
      const inicio        = inicioIndex >= 0 ? (row[inicioIndex] || "") : ""
      const mes           = extrairMes(inicio)

      if (!meio || !veiculo) return
      if (meio.toLowerCase() === "internet") return

      // Coletar meses e meios por mês (antes dos filtros)
      if (mes) {
        mesesSet.add(mes)
        if (!mesesMeios[mes]) mesesMeios[mes] = new Set()
        mesesMeios[mes].add(meio)
      }

      if (campanha) campanhasSet.add(campanha)
      if (praca) pracasSet.add(praca)
      if (veiculo) veiculosSet.add(veiculo)
      if (tipoCompra) tiposCompraSet.add(tipoCompra)

      // Aplicar filtros
      if (filtroCampanha && campanha !== filtroCampanha) return
      if (filtroPraca && praca !== filtroPraca) return
      if (filtroMes && mes !== filtroMes) return

      if (campanha) campanhasFiltradas.add(campanha)
      if (veiculo) veiculosFiltrados.add(veiculo)

      const insercoesNum   = parseNumero(impressoes)
      const investimentoNum = parseCurrency(valorDesembolso)

      totalInsercoes   += insercoesNum
      totalInvestimento += investimentoNum

      if (!meiosData[meio]) {
        meiosData[meio] = { nome: meio, pracas: {}, totalInsercoes: 0, totalImpactos: 0, totalInvestimento: 0 }
      }

      const pracaKey = praca
      if (!meiosData[meio].pracas[pracaKey]) {
        meiosData[meio].pracas[pracaKey] = { nome: praca, uf: "", veiculos: {}, totalInsercoes: 0, totalImpactos: 0, totalInvestimento: 0 }
      }

      if (!meiosData[meio].pracas[pracaKey].veiculos[veiculo]) {
        meiosData[meio].pracas[pracaKey].veiculos[veiculo] = { campanha, insercoes: 0, impactos: 0, investimento: 0, tipoCompra }
      }

      meiosData[meio].totalInsercoes += insercoesNum
      meiosData[meio].totalInvestimento += investimentoNum
      meiosData[meio].pracas[pracaKey].totalInsercoes += insercoesNum
      meiosData[meio].pracas[pracaKey].totalInvestimento += investimentoNum
      meiosData[meio].pracas[pracaKey].veiculos[veiculo].insercoes += insercoesNum
      meiosData[meio].pracas[pracaKey].veiculos[veiculo].investimento += investimentoNum
    })

    // Categorizar praças
    const pracasCategorized: PracasCategorized = { "Abrangência": [], "Regiões": [], "Estados": [], "Cidades": [] }
    Array.from(pracasSet).forEach((praca) => {
      const [categoria, valor] = categorizarPraca(praca).split("|")
      if (categoria in pracasCategorized) (pracasCategorized as any)[categoria].push(valor)
    })
    pracasCategorized["Abrangência"].sort()
    pracasCategorized["Regiões"].sort()
    pracasCategorized["Estados"].sort()
    pracasCategorized["Cidades"].sort()

    // Processar dados por campanha
    const campanhasMap = new Map<string, CampanhaData>()
    rows.forEach((row: string[]) => {
      const campanha   = row[campanhaIndex] || ""
      const meio       = row[meioIndex] || ""
      const veiculo    = row[veiculoIndex] || ""
      const impressoes = row[impressoesIndex] || "0"
      const valorDesembolso = row[valorIndex] || "0"
      const inicio     = inicioIndex >= 0 ? (row[inicioIndex] || "") : ""
      const mes        = extrairMes(inicio)

      if (!campanha || !meio || !veiculo) return
      if (meio.toLowerCase() === "internet") return
      if (filtroCampanha && campanha !== filtroCampanha) return
      if (filtroPraca && row[pracaIndex] !== filtroPraca) return
      if (filtroMes && mes !== filtroMes) return

      const insercoesNum   = parseNumero(impressoes)
      const investimentoNum = parseCurrency(valorDesembolso)

      if (!campanhasMap.has(campanha)) {
        campanhasMap.set(campanha, { nome: campanha, meios: {}, totalInsercoes: 0, totalInvestimento: 0, totalVeiculos: 0 })
      }
      const cd = campanhasMap.get(campanha)!
      if (!cd.meios[meio]) cd.meios[meio] = { insercoes: 0, investimento: 0, veiculos: new Set<string>() }
      cd.meios[meio].insercoes  += insercoesNum
      cd.meios[meio].investimento += investimentoNum
      cd.meios[meio].veiculos.add(veiculo)
      cd.totalInsercoes   += insercoesNum
      cd.totalInvestimento += investimentoNum
    })

    campanhasMap.forEach((campanha) => {
      const vs = new Set<string>()
      Object.values(campanha.meios).forEach((m) => m.veiculos.forEach((v) => vs.add(v)))
      campanha.totalVeiculos = vs.size
    })

    const mesesOrdenados = Array.from(mesesSet).sort()

    return {
      meios: meiosData,
      totais: { campanhas: campanhasFiltradas.size, veiculos: veiculosFiltrados.size, insercoes: totalInsercoes, impactos: 0, investimento: totalInvestimento },
      campanhas: Array.from(campanhasSet).sort(),
      campanhasData: Array.from(campanhasMap.values()).sort((a, b) => b.totalInvestimento - a.totalInvestimento),
      pracas: Array.from(pracasSet).sort(),
      pracasCategorized,
      tiposCompra: tiposCompraSet,
      meses: mesesOrdenados,
      mesesMeios,
    }
  }, [data, filtroCampanha, filtroPraca, filtroMes])

  const toggleMeio = (meio: string) => {
    setExpandedMeios((prev) => ({ ...prev, [meio]: !prev[meio] }))
  }

  const togglePraca = (meioNome: string, pracaKey: string) => {
    const key = `${meioNome}-${pracaKey}`
    setExpandedPracas((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const limparFiltros = () => {
    setFiltroCampanha("")
    setFiltroPraca("")
    setFiltroMes("")
  }

  if (loading) {
    return <Loading message="Carregando dados de veiculação off-line..." />
  }

  if (error) {
    return (
      <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Erro ao carregar dados: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col space-y-4 overflow-auto">
      {/* Header */}
      <div className="card-overlay rounded-2xl shadow-lg px-5 py-4">
        {/* Título */}
        <div className="flex items-center gap-3 mb-3 md:mb-0">
          <img src="/images/LOGO_JETOUR.png" alt="Jetour" className="h-7 object-contain" />
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Visão Offline</h1>
            <p className="text-xs text-gray-500">Veiculação em mídias tradicionais</p>
          </div>
        </div>

        {/* Filtros — empilhados no mobile, inline no desktop */}
        <div className="grid grid-cols-1 md:flex md:items-center gap-2 md:gap-3 mt-3 md:mt-0 md:justify-end">
          {/* Filtro Campanha */}
          <select
            value={filtroCampanha}
            onChange={(e) => {
              setFiltroCampanha(e.target.value)
              setExpandedCampanha(e.target.value || null)
            }}
            className="w-full md:w-auto text-sm bg-white border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
          >
            <option value="">Campanha: Todas</option>
            {processedData.campanhas.map((campanha) => (
              <option key={campanha} value={campanha}>
                {campanha}
              </option>
            ))}
          </select>

          {/* Filtro Mês */}
          <select
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            className="w-full md:w-auto text-sm bg-white border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
          >
            <option value="">Mês: Todos</option>
            {processedData.meses.map((mes) => (
              <option key={mes} value={mes}>
                {MESES[mes] || mes}
              </option>
            ))}
          </select>

          {/* Filtro Praça */}
          <select
            value={filtroPraca}
            onChange={(e) => setFiltroPraca(e.target.value)}
            className="w-full md:w-auto text-sm bg-white border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
          >
            <option value="">Praça: Todas</option>
            {processedData.pracasCategorized["Abrangência"].length > 0 && (
              <optgroup label="Abrangência">
                {processedData.pracasCategorized["Abrangência"].map((praca) => (
                  <option key={praca} value={praca}>{praca}</option>
                ))}
              </optgroup>
            )}
            {processedData.pracasCategorized["Regiões"].length > 0 && (
              <optgroup label="Regiões">
                {processedData.pracasCategorized["Regiões"].map((praca) => (
                  <option key={praca} value={praca}>{praca}</option>
                ))}
              </optgroup>
            )}
            {processedData.pracasCategorized["Estados"].length > 0 && (
              <optgroup label="Estados">
                {processedData.pracasCategorized["Estados"].map((praca) => (
                  <option key={praca} value={praca}>{praca}</option>
                ))}
              </optgroup>
            )}
            {processedData.pracasCategorized["Cidades"].length > 0 && (
              <optgroup label="Cidades">
                {processedData.pracasCategorized["Cidades"].map((praca) => (
                  <option key={praca} value={praca}>{praca}</option>
                ))}
              </optgroup>
            )}
          </select>

          {/* Limpar filtros */}
          {(filtroCampanha || filtroPraca || filtroMes) && (
            <button
              onClick={limparFiltros}
              className="w-full md:w-auto text-sm text-blue-600 hover:text-blue-800 underline text-center py-2 md:py-0"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Cards de Métricas Gerais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Campanhas",          value: String(processedData.totais.campanhas),              icon: <FileText className="w-4 h-4" /> },
          { label: "Veículos",           value: String(processedData.totais.veiculos),               icon: <Radio className="w-4 h-4" /> },
          { label: "Investimento Total", value: formatCurrency(processedData.totais.investimento),   icon: <DollarSign className="w-4 h-4" /> },
          { label: "Entrega",            value: formatNumber(processedData.totais.insercoes),         icon: <TrendingUp className="w-4 h-4" /> },
        ].map((card) => (
          <div key={card.label} className="bg-slate-700/80 rounded-2xl px-3 py-3 flex flex-col gap-1 text-white">
            <div className="flex items-center gap-1.5 text-slate-300 text-xs">
              {card.icon}
              {card.label}
            </div>
            <div className="text-base font-bold">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Divisão por Mês */}
      <div className="card-overlay rounded-2xl shadow-lg px-5 py-4">
        <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Radio className="w-4 h-4 text-blue-600" />
          Veiculação por Mês
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {processedData.meses.length === 0 ? (
            <p className="text-sm text-gray-500 col-span-3">Nenhum dado de mês disponível.</p>
          ) : (
            processedData.meses.map((mes) => {
              const meiosMes = Array.from(processedData.mesesMeios[mes] || new Set<string>())
              const ativo = !filtroMes || filtroMes === mes
              return (
                <button
                  key={mes}
                  onClick={() => setFiltroMes(filtroMes === mes ? "" : mes)}
                  className={`text-left rounded-xl px-4 py-3 transition-all border-2 ${
                    filtroMes === mes
                      ? "bg-blue-50 border-blue-400"
                      : ativo
                      ? "bg-slate-50 border-transparent hover:border-slate-300"
                      : "bg-slate-50 border-transparent opacity-40"
                  }`}
                >
                  <p className="text-xs font-bold text-gray-700 mb-1">{MESES[mes] || mes}</p>
                  {meiosMes.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Nenhuma veiculação</p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {meiosMes.map((m) => (
                        <span key={m} className="text-[10px] bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium">
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Grid: Campanhas (40%) + Meios (60%) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Card de Campanhas com Accordion */}
        <div className="card-overlay rounded-2xl shadow-lg p-5 h-auto md:h-[600px] flex flex-col col-span-1 md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900 flex items-center">
              <Megaphone className="w-4 h-4 mr-2 text-blue-600" />
              Campanhas ({processedData.campanhasData.length})
            </h2>
          </div>

          <div className="flex-1 md:overflow-y-auto space-y-2">
            {processedData.campanhasData.map((campanha, index) => (
              <div key={index}>
                {/* Card da Campanha */}
                <div
                  className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                    filtroCampanha === campanha.nome
                      ? "bg-blue-50 border-2 border-blue-400 shadow-sm"
                      : expandedCampanha === campanha.nome
                      ? "bg-blue-50 border-2 border-blue-300"
                      : "hover:bg-gray-50 border-2 border-transparent bg-gray-50"
                  }`}
                >
                  <div
                    onClick={() => {
                      if (expandedCampanha === campanha.nome) {
                        setExpandedCampanha(null)
                        setFiltroCampanha("")
                      } else {
                        setExpandedCampanha(campanha.nome)
                        setFiltroCampanha(campanha.nome)
                      }
                    }}
                  >
                    {/* Nome da Campanha com número de veículos */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{campanha.nome}</p>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
                          {campanha.totalVeiculos} {campanha.totalVeiculos === 1 ? 'veículo' : 'veículos'}
                        </span>
                      </div>
                      {expandedCampanha === campanha.nome ? (
                        <ChevronUp className="w-4 h-4 text-gray-600 flex-shrink-0 ml-2" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-600 flex-shrink-0 ml-2" />
                      )}
                    </div>

                    {/* Métricas em uma linha */}
                    <div className="flex items-center text-[10px] text-gray-600 gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">Investimento:</span>
                        <span className="font-semibold text-green-600">{formatCurrency(campanha.totalInvestimento)}</span>
                      </div>
                      <div className="border-l border-gray-300 h-4"></div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">Entrega:</span>
                        <span className="font-semibold text-blue-600">{formatNumber(campanha.totalInsercoes)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Lista de Meios (Accordion) */}
                  {expandedCampanha === campanha.nome && Object.keys(campanha.meios).length > 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-2 px-2 font-semibold text-gray-600">Meio</th>
                              <th className="text-left py-2 px-2 font-semibold text-gray-600">Veículos</th>
                              <th className="text-right py-2 px-2 font-semibold text-gray-600">Entrega</th>
                              <th className="text-right py-2 px-2 font-semibold text-gray-600">Investimento</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(campanha.meios).map(([meioNome, meio]) => (
                              <tr
                                key={meioNome}
                                className="border-b border-gray-100 last:border-b-0 hover:bg-blue-50"
                              >
                                <td className="py-2 px-2 text-gray-800 font-medium">{meioNome}</td>
                                <td className="py-2 px-2 text-gray-600">{meio.veiculos.size}</td>
                                <td className="py-2 px-2 text-right font-semibold text-blue-700">
                                  {formatNumber(meio.insercoes)}
                                </td>
                                <td className="py-2 px-2 text-right font-semibold text-green-700">
                                  {formatCurrency(meio.investimento)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card de Meios (60%) */}
        <div className="card-overlay rounded-2xl shadow-lg p-5 h-auto md:h-[600px] flex flex-col col-span-1 md:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900 flex items-center">
              <Radio className="w-4 h-4 mr-2 text-blue-600" />
              Meios de Comunicação
            </h2>
          </div>

          <div className="flex-1 md:overflow-y-auto space-y-2">
            {(Object.values(processedData.meios) as MeioData[]).map((meio) => (
              <div key={meio.nome} className="border border-gray-200 rounded-2xl overflow-hidden">
                <div
                  className="flex items-center justify-between p-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => toggleMeio(meio.nome)}
                >
                  <div className="flex items-center space-x-3">
                    {expandedMeios[meio.nome] ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    )}
                    <h3 className="text-sm font-semibold text-gray-900">{meio.nome}</h3>
                  </div>
                  <div className="flex space-x-4 text-xs text-right">
                    <div>
                      <p className="text-gray-500">Entrega</p>
                      <p className="font-semibold text-gray-800">{formatNumber(meio.totalInsercoes)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Investimento</p>
                      <p className="font-semibold text-gray-800">{formatCurrency(meio.totalInvestimento)}</p>
                    </div>
                  </div>
                </div>

                {expandedMeios[meio.nome] && (
                  <div className="p-3 space-y-2 bg-white">
                    {(Object.entries(meio.pracas) as [string, PracaUFData][]).map(([pracaKey, praca]) => (
                      <div key={pracaKey} className="border border-gray-100 rounded-xl">
                        <div
                          className="flex items-center justify-between p-2 bg-gray-25 hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => togglePraca(meio.nome, pracaKey)}
                        >
                          <div className="flex items-center space-x-2">
                            {expandedPracas[`${meio.nome}-${pracaKey}`] ? (
                              <ChevronDown className="w-3 h-3 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-3 h-3 text-gray-400" />
                            )}
                            <h4 className="text-xs font-medium text-gray-800">{praca.nome}</h4>
                          </div>
                          <div className="flex space-x-3 text-[10px] text-right">
                            <div>
                              <p className="text-gray-500">Entrega</p>
                              <p className="font-medium text-gray-700">{formatNumber(praca.totalInsercoes)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Investimento</p>
                              <p className="font-medium text-gray-700">{formatCurrency(praca.totalInvestimento)}</p>
                            </div>
                          </div>
                        </div>

                        {expandedPracas[`${meio.nome}-${pracaKey}`] && (
                          <div className="p-2">
                            <div className="overflow-x-auto">
                              <table className="w-full text-[10px]">
                                <thead>
                                  <tr className="border-b border-gray-200">
                                    <th className="text-left py-1 px-2 font-semibold text-gray-600">Veículo</th>
                                    <th className="text-left py-1 px-2 font-semibold text-gray-600">Campanha</th>
                                    <th className="text-left py-1 px-2 font-semibold text-gray-600">Tipo</th>
                                    <th className="text-right py-1 px-2 font-semibold text-gray-600">Entrega</th>
                                    <th className="text-right py-1 px-2 font-semibold text-gray-600">Investimento</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(Object.entries(praca.veiculos) as [string, VeiculoData][]).map(([veiculoNome, veiculo]) => (
                                    <tr
                                      key={veiculoNome}
                                      className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                                    >
                                      <td className="py-1 px-2 text-gray-800 font-medium">{veiculoNome}</td>
                                      <td className="py-1 px-2 text-gray-600">{veiculo.campanha}</td>
                                      <td className="py-1 px-2 text-gray-600">{veiculo.tipoCompra}</td>
                                      <td className="py-1 px-2 text-right font-semibold text-green-700">
                                        {formatNumber(veiculo.insercoes)}
                                      </td>
                                      <td className="py-1 px-2 text-right font-semibold text-blue-700">
                                        {formatCurrency(veiculo.investimento)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default VeiculacaoOffline
