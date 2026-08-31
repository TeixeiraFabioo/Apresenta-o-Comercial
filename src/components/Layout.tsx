import React, { useState, useEffect } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { AuthModal } from '@/components/AuthModal'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Scale,
  Plus,
  LogOut,
  LogIn,
  FileSpreadsheet,
  Building2,
  HelpCircle,
  Calculator,
  Printer,
  ChevronRight,
} from 'lucide-react'

export default function Layout() {
  const { user, isAuthenticated, logout } = useAuth()
  const [isScrolled, setIsScrolled] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.trim().split(/\s+/)
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      }
      return name.slice(0, 2).toUpperCase()
    }
    if (email) {
      return email.slice(0, 2).toUpperCase()
    }
    return 'FT'
  }

  const isPresentationRoute = location.pathname.includes('/apresentacao/')

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/70 dark:bg-slate-950 font-sans antialiased text-slate-900 dark:text-slate-100">
      {/* Barra de Navegação Superior (Oculta na Impressão) */}
      <header
        className={`print:hidden sticky top-0 z-40 w-full transition-all duration-200 border-b ${
          isScrolled
            ? 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm border-slate-200/80 dark:border-slate-800'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Marca / Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-amber-500/40 rounded-lg p-1"
          >
            <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-black border border-amber-500/30 shadow-md shadow-amber-500/10 group-hover:scale-105 transition-transform shrink-0">
              <img
                src="/visual-edits/teixeira-10-7cbfd7bf.png"
                alt="Teixeira & Ferreira Advogados Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white leading-none">
                  Gestão de Contratos Imobiliários
                </span>
                <span className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/60">
                  Imobiliário
                </span>
              </div>
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                Cálculo de custas judiciais
              </span>
            </div>
          </Link>

          {/* Ações da Direita */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Botão Nova Simulação */}
            <Button
              onClick={() => navigate('/nova-simulacao')}
              variant="outline"
              size="sm"
              className="border-amber-600/40 hover:border-amber-600 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100 text-amber-900 dark:text-amber-200 font-semibold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 sm:mr-1.5 text-amber-600 dark:text-amber-400" />
              <span className="hidden sm:inline">Nova simulação</span>
            </Button>

            {/* Menu do Usuário */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/40">
                    <Avatar className="w-7 h-7 bg-gradient-to-tr from-slate-800 to-slate-700 text-white text-xs font-bold border border-amber-500/40">
                      <AvatarFallback className="bg-slate-900 text-amber-400 text-xs font-semibold">
                        {getInitials(user?.name, user?.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium max-w-[130px] truncate hidden md:inline text-slate-700 dark:text-slate-200">
                      {user?.name || user?.email}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 shadow-lg">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white leading-none">
                        {user?.name || 'Advogado Responsável'}
                      </p>
                      <p className="text-[11px] leading-none text-muted-foreground truncate">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => navigate('/')}
                    className="cursor-pointer text-xs"
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2 text-slate-500" />
                    Painel de Simulações
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate('/nova-simulacao')}
                    className="cursor-pointer text-xs"
                  >
                    <Calculator className="w-4 h-4 mr-2 text-amber-600" />
                    Calculadora de Custas
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => logout()}
                    className="cursor-pointer text-xs text-rose-600 dark:text-rose-400 focus:text-rose-600"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => setAuthModalOpen(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium"
              >
                <LogIn className="w-4 h-4 mr-1.5" />
                Acessar
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 print:p-0 print:max-w-none">
        <Outlet />
      </main>

      {/* Rodapé Fino Legal (Oculto na Impressão) */}
      <footer className="print:hidden border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-xs py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              §
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 max-w-3xl">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Aviso legal:{' '}
              </span>
              Valores estimados para apresentação inicial — a base de cálculo definitiva será
              apurada na data do ajuizamento da ação com atualização monetária e juros de mora
              legais.
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground shrink-0">
            <span>Planilha de Custas v2.4</span>
            <span>•</span>
            <span>Direito Imobiliário</span>
          </div>
        </div>
      </footer>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  )
}
