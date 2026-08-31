import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSimulations, deleteSimulation } from '@/services/simulacoes'
import { SimulationRecord } from '@/types/simulation'
import {
  calculateLegalCosts,
  formatCurrencyBRL,
  formatDateBRL,
  STATUS_LABELS,
} from '@/lib/calculations'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Calculator,
  Plus,
  Search,
  FileText,
  Trash2,
  Edit,
  MoreVertical,
  Building,
  TrendingUp,
  DollarSign,
  Calendar,
  Layers,
  ArrowUpRight,
  Printer,
  Sparkles,
  Scale,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function Index() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const { toast } = useToast()

  const [simulations, setSimulations] = useState<SimulationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const records = await getSimulations(searchTerm)
      setSimulations(records)
    } catch (err) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar simulações',
        description: 'Não foi possível buscar as planilhas do banco de dados.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    } else {
      // Se ainda não estiver logado, o AuthProvider tentará o auto-login
      const timer = setTimeout(() => {
        loadData()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isAuthenticated, searchTerm])

  const filteredSimulations = useMemo(() => {
    if (statusFilter === 'todos') return simulations
    return simulations.filter((s) => (s.status || 'em_negociacao') === statusFilter)
  }, [simulations, statusFilter])

  // Métricas agregadas do escritório
  const metrics = useMemo(() => {
    let totalPropertiesValue = 0
    let totalPaidValue = 0
    let totalEstimated = 0
    let totalFines = 0

    simulations.forEach((sim) => {
      const calc = calculateLegalCosts(sim.property_value, sim.amount_paid)
      totalPropertiesValue += calc.propertyValue
      totalPaidValue += calc.amountPaid
      totalEstimated += calc.estimatedTotal
      totalFines += calc.fineFiftyPercent
    })

    return {
      count: simulations.length,
      totalPropertiesValue,
      totalPaidValue,
      totalEstimated,
      totalFines,
    }
  }, [simulations])

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      await deleteSimulation(deletingId)
      toast({
        title: 'Simulação excluída',
        description: 'O registro foi removido com sucesso.',
      })
      setSimulations((prev) => prev.filter((s) => s.id !== deletingId))
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: 'Não foi possível remover a simulação.',
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Banner de Boas-Vindas & Ação Principal */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 p-6 sm:p-8 text-white shadow-xl border border-amber-500/20">
        <div className="absolute right-0 top-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Painel de Fechamento de Contrato Imobiliário</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Dashboard - GCI
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              <span className="text-amber-300 font-semibold">
                <span className="text-slate-300">
                  <span>Análise e parecer inicial</span>
                </span>
                &nbsp;Viabilidade do Cliente
              </span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Button
              onClick={() => navigate('/nova-simulacao')}
              size="lg"
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold shadow-lg shadow-amber-500/25 h-12 px-6 text-sm"
            >
              <Plus className="w-5 h-5 mr-2 stroke-[2.5]" />
              Nova Simulação
            </Button>
          </div>
        </div>
      </div>

      {/* Cards de Métricas / Resumo Financeiro */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow transition-shadow bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total de Simulações
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
              {metrics.count}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span>Propostas geradas no escritório</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow transition-shadow bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Valor Total dos Imóveis
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
              {formatCurrencyBRL(metrics.totalPropertiesValue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Volume total dos contratos cadastrados
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow transition-shadow bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Valor Efetivamente Pago
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatCurrencyBRL(metrics.totalPaidValue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Base de 1% e multa de 50%</p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/20 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
              Total Estimado a Receber
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-amber-950 dark:text-amber-200">
              {formatCurrencyBRL(metrics.totalEstimated)}
            </div>
            <p className="text-xs text-amber-800/80 dark:text-amber-400 mt-1 font-medium">
              Soma: 1% pago + 50% multa (sem custas)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Simulações e Ferramentas de Filtro */}
      <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
        <CardHeader className="p-4 sm:p-6 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-600" />
                Simulações
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Planilhas arquivadas para visualização, edição ou impressão do documento ao cliente.
              </CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Barra de Pesquisa */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente, imóvel..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              {/* Botão de Atualizar */}
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={loading}
                className="h-9 px-3 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
              <span>Carregando simulações...</span>
            </div>
          ) : filteredSimulations.length === 0 ? (
            <div className="py-16 text-center px-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Scale className="w-8 h-8 text-amber-500/60" />
              </div>
              <div className="max-w-sm mx-auto space-y-1">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Nenhuma simulação encontrada
                </h3>
                <p className="text-xs text-muted-foreground">
                  {searchTerm
                    ? 'Tente ajustar os termos da sua pesquisa ou remova os filtros.'
                    : 'Crie sua primeira planilha de cálculo de custas judiciais para apresentação ao cliente.'}
                </p>
              </div>
              <Button
                onClick={() => navigate('/nova-simulacao')}
                className="bg-amber-600 hover:bg-amber-700 text-slate-950 font-semibold text-xs h-9"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Criar Nova Simulação Agora
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80 dark:bg-slate-900/50">
                  <TableRow>
                    <TableHead className="w-[200px] text-xs font-semibold">
                      Cliente / Contrato
                    </TableHead>
                    <TableHead className="text-xs font-semibold">Imóvel / Entrega</TableHead>
                    <TableHead className="text-right text-xs font-semibold">
                      Valor do Imóvel
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold">Valor Pago</TableHead>
                    <TableHead
                      className="text-right text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono"
                      title="3% de (valor pago + multa) — Despesa isolada"
                    >
                      Custas (3%)*
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold text-amber-700 dark:text-amber-400 font-mono">
                      Multa (50%)
                    </TableHead>
                    <TableHead className="text-right text-xs font-bold text-slate-900 dark:text-white font-mono">
                      Total Estimado
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-right text-xs font-semibold pr-6">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSimulations.map((sim) => {
                    const calc = calculateLegalCosts(sim.property_value, sim.amount_paid)
                    const statusConfig =
                      STATUS_LABELS[sim.status || 'em_negociacao'] || STATUS_LABELS.em_negociacao

                    return (
                      <TableRow
                        key={sim.id}
                        className="hover:bg-slate-50/90 dark:hover:bg-slate-900/60 transition-colors group"
                      >
                        {/* Cliente */}
                        <TableCell className="font-medium text-xs py-3.5">
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{sim.client_name}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            {sim.contract_number ? (
                              <span>Contr: {sim.contract_number}</span>
                            ) : (
                              <span>Doc: {sim.client_document || 'Não informado'}</span>
                            )}
                          </div>
                        </TableCell>

                        {/* Imóvel */}
                        <TableCell className="text-xs py-3.5">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {sim.property_name}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>Entrega: {formatDateBRL(sim.expected_delivery_date)}</span>
                          </div>
                        </TableCell>

                        {/* Valor Imóvel */}
                        <TableCell className="text-right text-xs font-mono font-medium py-3.5">
                          {formatCurrencyBRL(calc.propertyValue)}
                        </TableCell>

                        {/* Valor Pago */}
                        <TableCell className="text-right text-xs font-mono font-medium py-3.5">
                          <div className="text-emerald-600 dark:text-emerald-400">
                            {formatCurrencyBRL(calc.amountPaid)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            1%: {formatCurrencyBRL(calc.onePercentAmountPaid)}
                          </div>
                        </TableCell>

                        {/* Custas 3% */}
                        <TableCell className="text-right text-xs font-mono font-medium py-3.5 text-slate-700 dark:text-slate-300">
                          {formatCurrencyBRL(calc.judicialCosts)}
                        </TableCell>

                        {/* Multa 50% */}
                        <TableCell className="text-right text-xs font-mono font-medium py-3.5 text-slate-700 dark:text-slate-300">
                          {formatCurrencyBRL(calc.fineFiftyPercent)}
                        </TableCell>

                        {/* Total Estimado */}
                        <TableCell className="text-right text-xs font-mono font-bold py-3.5 text-slate-900 dark:text-white bg-amber-50/30 dark:bg-amber-950/10">
                          {formatCurrencyBRL(calc.estimatedTotal)}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="text-center py-3.5">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-2 py-0.5 border font-semibold ${statusConfig.colorClasses}`}
                          >
                            {statusConfig.label}
                          </Badge>
                        </TableCell>

                        {/* Ações */}
                        <TableCell className="text-right pr-6 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/apresentacao/${sim.id}`)}
                              className="h-8 px-2.5 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-100/60 dark:text-amber-400 dark:hover:bg-amber-950/40 font-semibold"
                              title="Visualizar Apresentação do Cliente"
                            >
                              <Printer className="w-3.5 h-3.5 mr-1" />
                              Apresentação
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-500 hover:text-slate-900"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 shadow-lg">
                                <DropdownMenuLabel className="text-xs">
                                  Opções da Simulação
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => navigate(`/apresentacao/${sim.id}`)}
                                  className="cursor-pointer text-xs"
                                >
                                  <FileText className="w-4 h-4 mr-2 text-blue-600" />
                                  Visualizar e Imprimir
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => navigate(`/editar-simulacao/${sim.id}`)}
                                  className="cursor-pointer text-xs"
                                >
                                  <Edit className="w-4 h-4 mr-2 text-amber-600" />
                                  Editar Dados
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeletingId(sim.id)}
                                  className="cursor-pointer text-xs text-rose-600 dark:text-rose-400 focus:text-rose-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Excluir Simulação
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Confirmação de Exclusão */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              Excluir Simulação de Custas?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-400">
              Esta ação removerá permanentemente os cálculos e dados gravados para este cliente.
              Esta operação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-9">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-9"
            >
              Sim, Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
