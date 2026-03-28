import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import Layout from "./components/Layout/Layout"
import { DataProvider } from "./contexts/DataContext"
import Capa from "./pages/Capa/Capa"
import LinhaTempo from "./pages/LinhaTempo/LinhaTempo"
import VisaoGeral from "./pages/VisaoGeral/VisaoGeral"
import Visualizacoes from "./pages/Visualizacoes/Visualizacoes"
import TrafegoEngajamento from "./pages/TrafegoEngajamento/TrafegoEngajamento"
import VeiculacaoOffline from "./pages/VeiculacaoOffline/VeiculacaoOffine"
import CriativosTikTok from "./pages/CriativosTikTok/CriativosTikTok"
import CriativosMetaAds from "./pages/CriativosMetaAds/CriativosMetaAds"
import CriativosGoogleAds from "./pages/CriativosGoogleAds/CriativosGoogleAds"
import CriativosLinkedIn from "./pages/CriativosLinkedIn/CriativosLinkedin"
import GoogleSearch from "./pages/GoogleSearch/GoogleSearch"
import Glossario from "./pages/Glossario/Glossario"
import AnaliseSemanal from "./pages/AnaliseSemanal/AnaliseSemanal"
import "./App.css"

function App() {
  return (
    <Router>
      <DataProvider>
        <Layout>
          <Routes>
            {/* Redirecionar para Capa ao invés de Dashboard */}
            <Route path="/" element={<Navigate to="/capa" replace />} />
            <Route path="/capa" element={<Capa />} />
            <Route path="/linha-tempo" element={<LinhaTempo />} />
            <Route path="/visao-geral" element={<VisaoGeral />} />
            <Route path="/visualizacoes" element={<Visualizacoes />} />
            <Route path="/trafego-engajamento" element={<TrafegoEngajamento />} />
            <Route path="/veiculacao-offline" element={<VeiculacaoOffline />} />
            <Route path="/criativos-meta-ads" element={<CriativosMetaAds />} />
            <Route path="/criativos-tiktok" element={<CriativosTikTok />} />
            <Route path="/criativos-google-ads" element={<CriativosGoogleAds />} />
            <Route path="/criativos-linkedin" element={<CriativosLinkedIn />} />
            <Route path="/google-search" element={<GoogleSearch />} />
            <Route path="/analise-semanal" element={<AnaliseSemanal />} />
            <Route path="/glossario" element={<Glossario />} />
          </Routes>
        </Layout>
      </DataProvider>
    </Router>
  )
}

export default App
