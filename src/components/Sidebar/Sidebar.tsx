"use client"

import type React from "react"
import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Clock, Eye, TrendingUp, BarChart3, BookOpenText, ChevronDown, Share2, CalendarDays, Radio, Leaf, X, Layers, Wifi } from "lucide-react"

interface MenuItem {
  id: string
  label: string
  path: string
  icon: React.ReactNode
}

interface MenuGroup {
  id: string
  label: string
  icon: React.ReactNode
  items: MenuItem[]
}

type MenuItemOrGroup = MenuItem | MenuGroup

function isGroup(item: MenuItemOrGroup): item is MenuGroup {
  return 'items' in item
}

const menuStructure: MenuItemOrGroup[] = [
  {
    id: "consolidado-on-off",
    label: "Consolidado ON + OFF",
    path: "/",
    icon: <Layers className="w-5 h-5" />,
  },
  {
    id: "visao-online",
    label: "Visão Online",
    path: "/visao-online",
    icon: <Wifi className="w-5 h-5" />,
  },
  {
    id: "visao-offline",
    label: "Visão Offline",
    path: "/visao-offline",
    icon: <Radio className="w-5 h-5" />,
  },
  {
    id: "redes-sociais",
    label: "Canais",
    icon: <Share2 className="w-5 h-5" />,
    items: [
      {
        id: "linha-tempo",
        label: "Linha do tempo",
        path: "/linha-tempo",
        icon: <Clock className="w-5 h-5" />,
      },
      {
        id: "analise-semanal",
        label: "Análise Semanal",
        path: "/analise-semanal",
        icon: <CalendarDays className="w-5 h-5" />,
      },
      {
        id: "visao-geral",
        label: "Visão Geral",
        path: "/visao-geral",
        icon: <BarChart3 className="w-5 h-5" />,
      },
    ]
  },
  {
    id: "google-search",
    label: "Google Search",
    path: "/google-search",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
      </svg>
    ),
  },
  {
    id: "organico",
    label: "Orgânico",
    icon: <Leaf className="w-5 h-5" />,
    items: [
      {
        id: "organico-instagram",
        label: "Orgânico - Instagram",
        path: "/organico-instagram",
        icon: (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
        ),
      },
      {
        id: "organico-facebook",
        label: "Orgânico - Facebook",
        path: "/organico-facebook",
        icon: (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        ),
      },
      {
        id: "organico-linkedin",
        label: "Orgânico - LinkedIn",
        path: "/organico-linkedin",
        icon: (
          <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" fill="currentColor">
            <path d="M41,4H9C6.24,4,4,6.24,4,9v32c0,2.76,2.24,5,5,5h32c2.76,0,5-2.24,5-5V9C46,6.24,43.76,4,41,4z M17,20v19h-6V20H17z M11,14.47c0-1.4,1.2-2.47,3-2.47s2.93,1.07,3,2.47c0,1.4-1.12,2.53-3,2.53C12.2,17,11,15.87,11,14.47z M39,39h-6c0,0,0-9.26,0-10 c0-2-1-4-3.5-4.04h-0.08C27,24.96,26,27.02,26,29c0,0.91,0,10,0,10h-6V20h6v2.56c0,0,1.93-2.56,5.81-2.56 c3.97,0,7.19,2.73,7.19,8.26V39z"/>
          </svg>
        ),
      },
    ]
  },
  {
    id: "trafego-engajamento",
    label: "Site",
    path: "/trafego-engajamento",
    icon: <TrendingUp className="w-5 h-5" />,
  },
  {
    id: "glossario",
    label: "Glossário",
    path: "/glossario",
    icon: <BookOpenText className="w-5 h-5" />,
  },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  // Estado de hover só importa no desktop
  const [isHovered, setIsHovered] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "redes-sociais": false,
    "organico": false,
  })
  const location = useLocation()

  // No desktop: expandido quando hovering. No mobile: sempre expandido quando offcanvas aberto.
  const showLabels = isHovered || isOpen

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }))
  }

  const handleNavClick = () => {
    // Fecha o offcanvas ao navegar (só tem efeito no mobile)
    onClose()
  }

  const renderMenuItem = (item: MenuItem, isSubItem = false) => {
    const isActive = location.pathname === item.path
    return (
      <li key={item.id}>
        <Link
          to={item.path}
          onClick={handleNavClick}
          className={`flex items-center py-3 text-sm transition-colors duration-200 ${
            isSubItem ? "pl-12 pr-4" : "px-4"
          } ${
            isActive
              ? "bg-blue-50 text-blue-600 border-r-2 border-blue-600"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          }`}
        >
          <div className="flex-shrink-0">{item.icon}</div>
          {showLabels && (
            <span className="ml-3 whitespace-nowrap overflow-hidden">{item.label}</span>
          )}
        </Link>
      </li>
    )
  }

  const renderGroup = (group: MenuGroup) => {
    const isGroupExpanded = expandedGroups[group.id]
    const hasActiveItem = group.items.some(item => location.pathname === item.path)
    return (
      <li key={group.id}>
        <button
          onClick={() => toggleGroup(group.id)}
          className={`w-full flex items-center px-4 py-3 text-sm transition-colors duration-200 ${
            hasActiveItem
              ? "bg-blue-50 text-blue-600"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          }`}
        >
          <div className="flex-shrink-0">{group.icon}</div>
          {showLabels && (
            <>
              <span className="ml-3 whitespace-nowrap overflow-hidden flex-1 text-left">{group.label}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${isGroupExpanded ? "rotate-180" : ""}`}
              />
            </>
          )}
        </button>
        {showLabels && isGroupExpanded && (
          <ul className="bg-gray-50">
            {group.items.map(item => renderMenuItem(item, true))}
          </ul>
        )}
      </li>
    )
  }

  return (
    <>
      {/* ── DESKTOP: sidebar fixa com hover-expand (md+) ── */}
      <div
        className={`hidden md:flex fixed left-0 top-0 h-full bg-white shadow-lg transition-all duration-300 z-50 flex-col ${
          isHovered ? "w-64" : "w-16"
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-lg flex-shrink-0">
              <img src="/images/LOGO_JETOUR.png" alt="Logo Jetour" className="w-full h-full object-contain" />
            </div>
            {isHovered && (
              <span className="ml-3 font-semibold text-gray-800 whitespace-nowrap">
                Dashboard <br />Jetour
              </span>
            )}
          </div>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1">
            {menuStructure.map((item) =>
              isGroup(item) ? renderGroup(item) : renderMenuItem(item)
            )}
          </ul>
        </nav>
      </div>

      {/* ── MOBILE: offcanvas (< md) ── */}
      <div
        className={`md:hidden fixed top-0 left-0 h-full w-72 bg-white shadow-xl z-50 flex flex-col transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header com botão fechar */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex-shrink-0">
              <img src="/images/LOGO_JETOUR.png" alt="Logo Jetour" className="w-full h-full object-contain" />
            </div>
            <span className="font-semibold text-gray-800">Dashboard Jetour</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1">
            {menuStructure.map((item) =>
              isGroup(item) ? renderGroup(item) : renderMenuItem(item)
            )}
          </ul>
        </nav>
      </div>
    </>
  )
}

export default Sidebar
