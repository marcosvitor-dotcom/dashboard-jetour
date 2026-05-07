import type React from "react"
import { useState } from "react"
import Sidebar from "../Sidebar/Sidebar"
import Topbar from "../Topbar/Topbar"

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen relative">
      {/* Background Image */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat z-0"
        style={{ backgroundImage: "url('/images/jetour-t2-hero_background.webp')" }}
      >
        <div className="absolute inset-0 bg-white/30 backdrop-blur-sm" />
      </div>

      {/* Overlay mobile — fecha o offcanvas ao clicar fora */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Topbar mobile */}
      <Topbar onMenuOpen={() => setSidebarOpen(true)} />

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <main className="flex-1 min-w-0 ml-0 md:ml-16 transition-all duration-300 relative z-10 pt-14 md:pt-0 overflow-x-hidden">
        <div className="p-3 md:p-6">{children}</div>
      </main>
    </div>
  )
}

export default Layout
