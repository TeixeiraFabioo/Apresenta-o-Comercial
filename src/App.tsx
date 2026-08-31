/* Main App Component - Handles routing, auth provider, and layouts */
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/context/AuthContext'
import Layout from './components/Layout'
import Index from './pages/Index'
import SimulationForm from './pages/SimulationForm'
import ClientPresentation from './pages/ClientPresentation'
import NotFound from './pages/NotFound'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/nova-simulacao" element={<SimulationForm />} />
            <Route path="/editar-simulacao/:id" element={<SimulationForm />} />
            <Route path="/apresentacao/:id" element={<ClientPresentation />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
