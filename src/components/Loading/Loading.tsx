import type React from "react"

interface LoadingProps {
  size?: "sm" | "md" | "lg" | "xl"
  message?: string
  className?: string
}

const Loading: React.FC<LoadingProps> = ({ message = "Carregando...", className = "" }) => {
  return (
    <div className={`flex flex-col items-center justify-center h-full min-h-64 gap-5 ${className}`}>
      <div style={{ position: "relative", width: 180, height: 60, overflow: "hidden" }}>
        {/* Logo base */}
        <img
          src="/images/Jetour_logo.svg"
          alt="Jetour"
          style={{ width: 180, height: 60, objectFit: "contain", display: "block", opacity: 0.3 }}
          draggable={false}
        />
        {/* Faixa de luz que varre da esquerda para direita */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "60%",
          height: "100%",
          background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.85) 50%, transparent 100%)",
          animation: "jetour-shimmer 1.6s ease-in-out infinite",
          pointerEvents: "none",
        }} />
        {/* Logo em cima da faixa, com mix-blend-mode para revelar só onde a logo existe */}
        <img
          src="/images/Jetour_logo.svg"
          alt=""
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 180,
            height: 60,
            objectFit: "contain",
            mixBlendMode: "multiply",
          }}
          draggable={false}
        />
        <style>{`
          @keyframes jetour-shimmer {
            0%   { transform: translateX(-100%); }
            100% { transform: translateX(280%); }
          }
        `}</style>
      </div>

      {message && (
        <p className="text-xs text-gray-400 font-medium tracking-wide">{message}</p>
      )}
    </div>
  )
}

export default Loading
