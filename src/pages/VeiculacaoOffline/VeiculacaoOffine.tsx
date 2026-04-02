"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { ChevronDown, ChevronUp, ChevronRight, FileText, Radio, TrendingUp, Megaphone, DollarSign } from "lucide-react"
import { useOfflineData } from "../../services/api"
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

const VeiculacaoOffline: React.FC = () => {
  const { data, loading, error } = useOfflineData()
  const [expandedMeios, setExpandedMeios] = useState<{ [key: string]: boolean }>({})
  const [expandedPracas, setExpandedPracas] = useState<{ [key: string]: boolean }>({})
  const [expandedCampanha, setExpandedCampanha] = useState<string | null>(null)

  // Estados para filtros
  const [filtroCampanha, setFiltroCampanha] = useState<string>("")
  const [filtroPraca, setFiltroPraca] = useState<string>("")

  // Processar dados da API
  const processedData = useMemo(() => {
    if (!data?.data?.values || data.data.values.length <= 1) {
      return {
        meios: {},
        totais: { campanhas: 0, veiculos: 0, insercoes: 0, impactos: 0, investimento: 0 },
        campanhas: [],
        campanhasData: [],
        pracas: [],
        pracasCategorized: {
          "Abrangência": [],
          "Regiões": [],
          "Estados": [],
          "Cidades": []
        },
        tiposCompra: new Set<string>()
      }
    }

    const meiosData: { [key: string]: MeioData } = {}
    const campanhasSet = new Set<string>()
    const pracasSet = new Set<string>()
    const veiculosSet = new Set<string>()
    const tiposCompraSet = new Set<string>()

    // Conjuntos separados para os dados filtrados
    const campanhasFiltradas = new Set<string>()
    const veiculosFiltrados = new Set<string>()

    let totalInsercoes = 0
    let totalImpactos = 0
    let totalInvestimento = 0

    const headers = data.data.values[0]
    const rows = data.data.values.slice(1)

    // Mapear índices das colunas
    const agenciaIndex = -1 // coluna não existe na nova API
    const campanhaIndex = headers.indexOf("CAMPANHA")
    const meioIndex = headers.indexOf("MEIO")
    const pracaIndex = headers.indexOf("PRAÇA")
    const veiculoIndex = headers.indexOf("VEÍCULO")
    const impressoesIndex = headers.indexOf("IMPRESSÕES / CLIQUES / DIÁRIAS")
    const tipoCompraIndex = headers.indexOf("TIPO DE COMPRA")
    const valorDesembolsoIndex = headers.indexOf("VALOR DESEMBOLSO")

    rows.forEach((row: string[]) => {
      const campanha = row[campanhaIndex] || ""
      const meio = row[meioIndex] || ""
      const praca = row[pracaIndex] || ""
      const veiculo = row[veiculoIndex] || ""
      const impressoes = row[impressoesIndex] || "0"
      const tipoCompra = row[tipoCompraIndex] || ""
      const valorDesembolso = row[valorDesembolsoIndex] || "0"

      if (!meio || !veiculo) return

      // Filtrar dados de Internet
      if (meio.toLowerCase() === "internet") return

      // Adicionar aos conjuntos para filtros
      if (campanha) campanhasSet.add(campanha)
      if (praca) pracasSet.add(praca)
      if (veiculo) veiculosSet.add(veiculo)
      if (tipoCompra) tiposCompraSet.add(tipoCompra)

      // Aplicar filtros
      if (filtroCampanha && campanha !== filtroCampanha) return
      if (filtroPraca && praca !== filtroPraca) return

      // Adicionar aos conjuntos filtrados (apenas dados que passaram pelos filtros)
      if (campanha) campanhasFiltradas.add(campanha)
      if (veiculo) veiculosFiltrados.add(veiculo)

      const insercoesNum = parseNumero(impressoes)
      const impactosNum = 0 // Não temos mais a coluna de impactos na nova API
      const investimentoNum = parseCurrency(valorDesembolso)

      totalInsercoes += insercoesNum
      totalImpactos += impactosNum
      totalInvestimento += investimentoNum

      // Estrutura: Meio -> Praça -> Veículo
      if (!meiosData[meio]) {
        meiosData[meio] = {
          nome: meio,
          pracas: {},
          totalInsercoes: 0,
          totalImpactos: 0,
          totalInvestimento: 0
        }
      }

      const pracaKey = praca
      if (!meiosData[meio].pracas[pracaKey]) {
        meiosData[meio].pracas[pracaKey] = {
          nome: praca,
          uf: "",
          veiculos: {},
          totalInsercoes: 0,
          totalImpactos: 0,
          totalInvestimento: 0
        }
      }

      if (!meiosData[meio].pracas[pracaKey].veiculos[veiculo]) {
        meiosData[meio].pracas[pracaKey].veiculos[veiculo] = {
          campanha: campanha,
          insercoes: 0,
          impactos: 0,
          investimento: 0,
          tipoCompra: tipoCompra
        }
      }

      meiosData[meio].totalInsercoes += insercoesNum
      meiosData[meio].totalImpactos += impactosNum
      meiosData[meio].totalInvestimento += investimentoNum
      meiosData[meio].pracas[pracaKey].totalInsercoes += insercoesNum
      meiosData[meio].pracas[pracaKey].totalImpactos += impactosNum
      meiosData[meio].pracas[pracaKey].totalInvestimento += investimentoNum
      meiosData[meio].pracas[pracaKey].veiculos[veiculo].insercoes += insercoesNum
      meiosData[meio].pracas[pracaKey].veiculos[veiculo].impactos += impactosNum
      meiosData[meio].pracas[pracaKey].veiculos[veiculo].investimento += investimentoNum
    })

    // Categorizar praças
    const pracasCategorized: PracasCategorized = {
      "Abrangência": [],
      "Regiões": [],
      "Estados": [],
      "Cidades": []
    }

    Array.from(pracasSet).forEach((praca) => {
      const categorized = categorizarPraca(praca)
      const [categoria, valor] = categorized.split("|")

      if (categoria === "Abrangência") {
        pracasCategorized["Abrangência"].push(valor)
      } else if (categoria === "Regiões") {
        pracasCategorized["Regiões"].push(valor)
      } else if (categoria === "Estados") {
        pracasCategorized["Estados"].push(valor)
      } else if (categoria === "Cidades") {
        pracasCategorized["Cidades"].push(valor)
      }
    })

    // Ordenar cada categoria
    pracasCategorized["Abrangência"].sort()
    pracasCategorized["Regiões"].sort()
    pracasCategorized["Estados"].sort()
    pracasCategorized["Cidades"].sort()

    // Processar dados por campanha
    const campanhasMap = new Map<string, CampanhaData>()

    rows.forEach((row: string[]) => {
      const campanha = row[campanhaIndex] || ""
      const meio = row[meioIndex] || ""
      const veiculo = row[veiculoIndex] || ""
      const impressoes = row[impressoesIndex] || "0"
      const valorDesembolso = row[valorDesembolsoIndex] || "0"

      if (!campanha || !meio || !veiculo) return
      if (meio.toLowerCase() === "internet") return

      // Aplicar filtros
      if (filtroCampanha && campanha !== filtroCampanha) return
      if (filtroPraca && row[pracaIndex] !== filtroPraca) return

      const insercoesNum = parseNumero(impressoes)
      const investimentoNum = parseCurrency(valorDesembolso)

      if (!campanhasMap.has(campanha)) {
        campanhasMap.set(campanha, {
          nome: campanha,
          meios: {},
          totalInsercoes: 0,
          totalInvestimento: 0,
          totalVeiculos: 0
        })
      }

      const campanhaData = campanhasMap.get(campanha)!

      if (!campanhaData.meios[meio]) {
        campanhaData.meios[meio] = {
          insercoes: 0,
          investimento: 0,
          veiculos: new Set<string>()
        }
      }

      campanhaData.meios[meio].insercoes += insercoesNum
      campanhaData.meios[meio].investimento += investimentoNum
      campanhaData.meios[meio].veiculos.add(veiculo)
      campanhaData.totalInsercoes += insercoesNum
      campanhaData.totalInvestimento += investimentoNum
    })

    // Calcular total de veículos únicos por campanha
    campanhasMap.forEach((campanha) => {
      const veiculosSet = new Set<string>()
      Object.values(campanha.meios).forEach((meio) => {
        meio.veiculos.forEach((v) => veiculosSet.add(v))
      })
      campanha.totalVeiculos = veiculosSet.size
    })

    // Converter para array e ordenar por investimento
    const campanhasArray = Array.from(campanhasMap.values()).sort((a, b) => b.totalInvestimento - a.totalInvestimento)

    return {
      meios: meiosData,
      totais: {
        campanhas: campanhasFiltradas.size,
        veiculos: veiculosFiltrados.size,
        insercoes: totalInsercoes,
        impactos: totalImpactos,
        investimento: totalInvestimento
      },
      campanhas: Array.from(campanhasSet).sort(),
      campanhasData: campanhasArray,
      pracas: Array.from(pracasSet).sort(),
      pracasCategorized: pracasCategorized,
      tiposCompra: tiposCompraSet
    }
  }, [data, filtroCampanha, filtroPraca])

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/images/Jetour_logo.svg" alt="Jetour" className="h-7 object-contain" />
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Off-line</h1>
              <p className="text-xs text-gray-500">Veiculação em mídias tradicionais</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-3">
            {/* Filtro Campanha */}
            <select
              value={filtroCampanha}
              onChange={(e) => {
                setFiltroCampanha(e.target.value)
                setExpandedCampanha(e.target.value || null)
              }}
              className="text-sm bg-white border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            >
              <option value="">Campanha: Todas</option>
              {processedData.campanhas.map((campanha) => (
                <option key={campanha} value={campanha}>
                  {campanha}
                </option>
              ))}
            </select>

            {/* Filtro Praça */}
            <select
              value={filtroPraca}
              onChange={(e) => setFiltroPraca(e.target.value)}
              className="text-sm bg-white border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            >
              <option value="">Praça: Todas</option>
              {processedData.pracasCategorized["Abrangência"].length > 0 && (
                <optgroup label="Abrangência">
                  {processedData.pracasCategorized["Abrangência"].map((praca) => (
                    <option key={praca} value={praca}>
                      {praca}
                    </option>
                  ))}
                </optgroup>
              )}
              {processedData.pracasCategorized["Regiões"].length > 0 && (
                <optgroup label="Regiões">
                  {processedData.pracasCategorized["Regiões"].map((praca) => (
                    <option key={praca} value={praca}>
                      {praca}
                    </option>
                  ))}
                </optgroup>
              )}
              {processedData.pracasCategorized["Estados"].length > 0 && (
                <optgroup label="Estados">
                  {processedData.pracasCategorized["Estados"].map((praca) => (
                    <option key={praca} value={praca}>
                      {praca}
                    </option>
                  ))}
                </optgroup>
              )}
              {processedData.pracasCategorized["Cidades"].length > 0 && (
                <optgroup label="Cidades">
                  {processedData.pracasCategorized["Cidades"].map((praca) => (
                    <option key={praca} value={praca}>
                      {praca}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Cards de Métricas Gerais */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Campanhas",        value: String(processedData.totais.campanhas),                      icon: <FileText className="w-4 h-4" /> },
          { label: "Veículos",         value: String(processedData.totais.veiculos),                       icon: <Radio className="w-4 h-4" /> },
          { label: "Investimento Total", value: formatCurrency(processedData.totais.investimento),         icon: <DollarSign className="w-4 h-4" /> },
          { label: "Entrega",          value: formatNumber(processedData.totais.insercoes),                 icon: <TrendingUp className="w-4 h-4" /> },
        ].map((card) => (
          <div key={card.label} className="bg-slate-700/80 rounded-2xl px-3 py-3 flex flex-col gap-1 text-white">
            <div className="flex items-center gap-1.5 text-slate-300 text-xs">
              {card.icon}
              {card.label}
            </div>
            <div className="text-base font-bold truncate">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Grid: Campanhas (40%) + Meios (60%) */}
      <div className="grid grid-cols-5 gap-4">
        {/* Card de Campanhas com Accordion */}
        <div className="card-overlay rounded-2xl shadow-lg p-5 h-[600px] flex flex-col col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900 flex items-center">
              <Megaphone className="w-4 h-4 mr-2 text-blue-600" />
              Campanhas ({processedData.campanhasData.length})
            </h2>
            {(filtroCampanha || filtroPraca) && (
              <button
                onClick={limparFiltros}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Limpar
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
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
        <div className="card-overlay rounded-2xl shadow-lg p-5 h-[600px] flex flex-col col-span-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900 flex items-center">
              <Radio className="w-4 h-4 mr-2 text-blue-600" />
              Meios de Comunicação
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {Object.values(processedData.meios).map((meio) => (
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
                    {Object.entries(meio.pracas).map(([pracaKey, praca]) => (
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
                                  {Object.entries(praca.veiculos).map(([veiculoNome, veiculo]) => (
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
