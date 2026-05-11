import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import Layout from "./components/Layout/Layout"
import { DataProvider } from "./contexts/DataContext"
import ConsolidadoOnOff from "./pages/ConsolidadoOnOff/ConsolidadoOnOff"
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
import OrganicoInstagram from "./pages/OrganicoInstagram/OrganicoInstagram"
import OrganicoFacebook from "./pages/OrganicoFacebook/OrganicoFacebook"
import OrganicoLinkedIn from "./pages/OrganicoLinkedIn/OrganicoLinkedIn"
import "./App.css"

function App() {
  return (
    <Router>
      <DataProvider>
        <Layout>
          <Routes>
            {/* Página principal: Consolidado ON + OFF */}
            <Route path="/" element={<ConsolidadoOnOff />} />
            <Route path="/consolidado-on-off" element={<Navigate to="/" replace />} />
            <Route path="/visao-online" element={<Capa />} />
            <Route path="/visao-offline" element={<VeiculacaoOffline />} />
            {/* Redirects de compatibilidade — URLs antigas */}
            <Route path="/capa" element={<Navigate to="/visao-online" replace />} />
            <Route path="/veiculacao-offline" element={<Navigate to="/visao-offline" replace />} />
            <Route path="/linha-tempo" element={<LinhaTempo />} />
            <Route path="/visao-geral" element={<VisaoGeral />} />
            <Route path="/visualizacoes" element={<Visualizacoes />} />
            <Route path="/trafego-engajamento" element={<TrafegoEngajamento />} />
            <Route path="/criativos-meta-ads" element={<CriativosMetaAds />} />
            <Route path="/criativos-tiktok" element={<CriativosTikTok />} />
            <Route path="/criativos-google-ads" element={<CriativosGoogleAds />} />
            <Route path="/criativos-linkedin" element={<CriativosLinkedIn />} />
            <Route path="/google-search" element={<GoogleSearch />} />
            <Route path="/analise-semanal" element={<AnaliseSemanal />} />
            <Route path="/organico-instagram" element={<OrganicoInstagram />} />
            <Route path="/organico-facebook" element={<OrganicoFacebook />} />
            <Route path="/organico-linkedin" element={<OrganicoLinkedIn />} />
            <Route path="/glossario" element={<Glossario />} />
          </Routes>
        </Layout>
      </DataProvider>
    </Router>
  )
}

export default App
