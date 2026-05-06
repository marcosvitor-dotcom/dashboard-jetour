import type React from "react"
import { Menu } from "lucide-react"

interface TopbarProps {
  onMenuOpen: () => void
}

const Topbar: React.FC<TopbarProps> = ({ onMenuOpen }) => {
  return (
    <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white/95 backdrop-blur-sm shadow-sm z-40 flex items-center px-4">
      <button
        onClick={onMenuOpen}
        className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Abrir menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="absolute left-1/2 -translate-x-1/2">
        <img
          src="/images/LOGO_JETOUR.png"
          alt="Jetour"
          className="h-7 object-contain"
        />
      </div>
    </div>
  )
}

export default Topbar
