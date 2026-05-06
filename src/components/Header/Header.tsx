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
        style={{ backgroundImage: "url('/images/banner-background.webp')" }}
      >
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" />
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Topbar onMenuOpen={() => setSidebarOpen(true)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 ml-0 md:ml-16 transition-all duration-300 relative z-10 pt-14 md:pt-0">
        <div className="p-3 md:p-6">{children}</div>
      </main>
    </div>
  )
}

export default Layout
