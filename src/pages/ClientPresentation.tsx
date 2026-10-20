import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  getSimulationById,
  updateSimulation,
  getStatusHistory,
  getContractFileUrl,
} from '@/services/simulacoes'
import { SimulationRecord, SimulationStatus, StatusHistoryRecord } from '@/types/simulation'
import { isNotFoundError } from '@/lib/pocketbase/errors'
import {
  calculateLegalCosts,
  CORRECTION_INDEX_LABELS,
  formatCurrencyBRL,
  formatDateBRL,
  formatPercentBRL,
  getDeliveryDelayStatus,
  STATUS_LABELS,
  SIMULATION_TYPE_CONFIG,
} from '@/lib/calculations'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Printer,
  ArrowLeft,
  Edit,
  Scale,
  Building,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Share2,
  FileSpreadsheet,
  HelpCircle,
  Receipt,
  Download,
  Paperclip,
  ExternalLink,
  History,
  Edit3,
  RotateCcw,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const DEFAULT_FUNDAMENTACAO =
  'O presente demonstrativo tem amparo no Código de Defesa do Consumidor (Lei nº 8.078/1990, art. 51 e art. 53), na Lei nº 4.591/1964 com as alterações da Lei nº 13.786/2018 (Lei do Distrato Imobiliário) e nas Súmulas do Superior Tribunal de Justiça (Súmula 543/STJ). Na hipótese de rescisão contratual motivada por culpa exclusiva da construtora/incorporadora, impõe-se a restituição imediata e integral das quantias pagas, cumulada com a penalidade compensatória correspondente. Alternativamente, mantido o negócio jurídico, faz jus o adquirente à verba indenizatória pelo período de atraso após escoada a carência legal de 180 dias.'

export default function ClientPresentation() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const [simulation, setSimulation] = useState<SimulationRecord | null>(null)
  const [history, setHistory] = useState<StatusHistoryRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Estado para edição da fundamentação jurídica (Item 7)
  const [isEditingFundamentacao, setIsEditingFundamentacao] = useState(false)
  const [fundamentacaoDraft, setFundamentacaoDraft] = useState('')
  const [savingFundamentacao, setSavingFundamentacao] = useState(false)

  const loadData = async () => {
    if (!id) return
    try {
      const record = await getSimulationById(id, user?.id)
      setSimulation(record)
      setFundamentacaoDraft(record.custom_fundamentacao || DEFAULT_FUNDAMENTACAO)

      // Carrega histórico de status (Item 4)
      const historyList = await getStatusHistory(id, user?.id)
      setHistory(historyList)
    } catch (err) {
      if (isNotFoundError(err)) {
        toast({
          variant: 'destructive',
          title: 'Simulação não encontrada',
          description: 'Esta simulação já foi excluída — atualize a lista.',
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar',
          description: 'Não foi possível carregar a apresentação desta simulação.',
        })
      }
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id, user?.id])

  const calc = useMemo(() => {
    if (!simulation) return null
    return calculateLegalCosts(
      simulation.property_value,
      simulation.amount_paid,
      simulation.simulation_type,
      {
        expectedDeliveryDate: simulation.expected_delivery_date,
        referenceDate: simulation.reference_date,
        custasRate: simulation.custas_rate,
        correctionEnabled: simulation.correction_enabled,
        correctionIndex: simulation.correction_index,
        correctionRate: simulation.correction_rate,
        correctionStartDate: simulation.correction_start_date,
      },
    )
  }, [simulation])

  const delay = useMemo(() => {
    if (!simulation) return null
    return getDeliveryDelayStatus(simulation.expected_delivery_date, simulation.reference_date)
  }, [simulation])

  const handlePrint = () => {
    window.print()
  }

  const handleStatusChange = async (newStatus: SimulationStatus) => {
    if (!simulation || !id) return
    try {
      const updated = await updateSimulation(id, { status: newStatus })
      setSimulation(updated)
      // Recarrega histórico
      const updatedHistory = await getStatusHistory(id, user?.id)
      setHistory(updatedHistory)
      toast({
        title: 'Status atualizado',
        description: `Proposta marcada como "${STATUS_LABELS[newStatus]?.label || newStatus}".`,
      })
    } catch (err) {
      if (isNotFoundError(err)) {
        toast({
          variant: 'destructive',
          title: 'Simulação não encontrada',
          description: 'Esta simulação já foi excluída — atualize a lista.',
        })
        navigate('/')
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro ao atualizar status',
        })
      }
    }
  }

  const handleSaveFundamentacao = async () => {
    if (!simulation || !id) return
    setSavingFundamentacao(true)
    try {
      const customText = fundamentacaoDraft.trim()
      const updated = await updateSimulation(id, {
        custom_fundamentacao: customText === DEFAULT_FUNDAMENTACAO ? '' : customText,
      })
      setSimulation(updated)
      setIsEditingFundamentacao(false)
      toast({
        title: 'Fundamentação salva com sucesso',
        description: 'O texto personalizado será utilizado na impressão e visualização.',
      })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar fundamentação',
      })
    } finally {
      setSavingFundamentacao(false)
    }
  }

  const handleResetFundamentacao = async () => {
    if (!simulation || !id) return
    setSavingFundamentacao(true)
    try {
      const updated = await updateSimulation(id, { custom_fundamentacao: '' })
      setSimulation(updated)
      setFundamentacaoDraft(DEFAULT_FUNDAMENTACAO)
      setIsEditingFundamentacao(false)
      toast({
        title: 'Texto padrão restaurado',
        description: 'A fundamentação jurídica voltou para o texto padrão do escritório.',
      })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao restaurar',
      })
    } finally {
      setSavingFundamentacao(false)
    }
  }

  if (loading) {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Preparando apresentação ao cliente...</p>
      </div>
    )
  }

  if (!simulation || !calc) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Simulação não encontrada.</p>
        <Button onClick={() => navigate('/')} className="mt-4">
          Voltar ao Início
        </Button>
      </div>
    )
  }

  const lawyerName = user?.name || 'Dr. Fábio Teixeira'
  const currentDateFormatted = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
  }).format(new Date())

  const isDelayOption = simulation.simulation_type === 'indenizacao_atraso'
  const typeConfig =
    SIMULATION_TYPE_CONFIG[simulation.simulation_type || 'rescisao_contratual'] ||
    SIMULATION_TYPE_CONFIG.rescisao_contratual

  const contractFileUrl = getContractFileUrl(simulation)
  const currentFundamentacao = simulation.custom_fundamentacao?.trim() || DEFAULT_FUNDAMENTACAO

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-16 print:p-0 print:m-0 print:max-w-none">
      {/* Barra de Ações (Oculta na Impressão) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="h-8 text-xs text-muted-foreground hover:text-slate-900"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Voltar ao Painel
          </Button>
          <Separator orientation="vertical" className="h-4" />
          <Badge
            variant="outline"
            className={`text-[10px] font-semibold ${STATUS_LABELS[simulation.status]?.colorClasses}`}
          >
            {STATUS_LABELS[simulation.status]?.label || 'Em Negociação'}
          </Badge>
          <Badge
            variant="outline"
            className={`text-[10px] font-semibold ${typeConfig.colorClasses}`}
          >
            {typeConfig.label}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mudar status rápido */}
          {simulation.status !== 'contrato_fechado' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange('contrato_fechado')}
              className="h-9 text-xs border-emerald-500/50 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Marcar Contrato Fechado
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFundamentacaoDraft(currentFundamentacao)
              setIsEditingFundamentacao(true)
            }}
            className="h-9 text-xs border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
            title="Editar fundamentação jurídica do caso antes de imprimir"
          >
            <Edit3 className="w-3.5 h-3.5 mr-1 text-amber-600" />
            Editar Fundamentação
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/editar-simulacao/${simulation.id}`)}
            className="h-9 text-xs"
          >
            <Edit className="w-3.5 h-3.5 mr-1" />
            Editar Dados
          </Button>

          <Button
            onClick={handlePrint}
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-slate-950 font-bold h-9 text-xs shadow-md"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Imprimir / Salvar PDF
          </Button>
        </div>
      </div>

      {/* DOCUMENTO DE APRESENTAÇÃO AO CLIENTE (O que vai para o papel / PDF) */}
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl sm:rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xl overflow-hidden print:shadow-none print:border-none print:rounded-none">
        {/* Cabeçalho do Documento com Identidade do Escritório */}
        <div className="p-6 sm:p-8 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white print:bg-white print:text-slate-900 print:border-b-2 print:border-slate-900 print:p-4">
          {/* Topo do Cabeçalho: Identidade Visual do Escritório / Advogado */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-700/60 print:border-slate-300 print:pb-3">
            <div className="flex items-center gap-3.5">
              {/* Logotipo do Escritório */}
              <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center bg-black border border-amber-500/40 shadow-lg shadow-amber-500/10 shrink-0 print:shadow-none print:border-slate-800 print:w-12 print:h-12">
                <img
                  src="/visual-edits/teixeira-10-7cbfd7bf.png"
                  alt="Teixeira & Ferreira Advogados"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-bold tracking-tight text-white print:text-slate-900 leading-tight">
                    Teixeira &amp; Ferreira Advogados Associados
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-300 print:text-slate-600 font-medium mt-0.5">
                  <span className="text-amber-400 print:text-slate-800 font-semibold">
                    {lawyerName}
                  </span>
                  <span className="text-slate-500 print:text-slate-400">•</span>
                  <span>Direito Imobiliário &amp; Contratos</span>
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right space-y-0.5 text-xs text-slate-300 print:text-slate-700">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 print:bg-slate-100 print:border-slate-300 print:text-slate-800 font-semibold text-[11px]">
                <span>Parecer &amp; Apresentação Comercial</span>
              </div>
              <div className="text-[11px] text-slate-400 print:text-slate-600 font-medium pt-1">
                Data de Emissão:{' '}
                <span className="font-semibold text-slate-200 print:text-slate-900">
                  {currentDateFormatted}
                </span>
              </div>
            </div>
          </div>

          {/* Título do Documento */}
          <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-white print:text-slate-900 leading-snug">
                  DEMONSTRATIVO DE CRÉDITOS E RESTITUIÇÃO AO CLIENTE
                </h1>
              </div>
              <p className="text-xs text-amber-300/90 print:text-slate-600 font-medium flex items-center gap-2">
                <span>
                  Apresentação Prévia para Fechamento de Contrato de Honorários &amp; Ação Judicial
                </span>
                <span className="text-slate-400 print:hidden">•</span>
                <span className="font-semibold text-white bg-amber-500/30 px-2 py-0.5 rounded print:text-slate-900 print:bg-transparent print:p-0">
                  {typeConfig.label}
                </span>
              </p>
            </div>
            <div className="text-left sm:text-right text-[11px] text-slate-400 print:text-slate-500 font-mono">
              Ref.: {simulation.property_name || 'Simulação'}
            </div>
          </div>
        </div>

        {/* Informações de Identificação do Cliente e Contrato */}
        <div className="p-6 sm:p-8 space-y-6 print:p-4 print:space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-700 print:bg-slate-50 print:border-slate-300">
            {/* Lado 1: Cliente e Contrato */}
            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-wider font-bold text-amber-800 dark:text-amber-400 print:text-slate-900 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Dados do Promitente Comprador (Cliente)
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white print:text-slate-900">
                {simulation.client_name}
              </div>
              {simulation.client_document && (
                <div className="text-xs text-slate-600 dark:text-slate-300 print:text-slate-700">
                  <span className="font-medium">CPF/CNPJ: </span>
                  {simulation.client_document}
                </div>
              )}
              {simulation.contract_number && (
                <div className="text-xs text-slate-600 dark:text-slate-300 print:text-slate-700">
                  <span className="font-medium">Nº Contrato: </span>
                  {simulation.contract_number}
                </div>
              )}
            </div>

            {/* Lado 2: Imóvel e Construtora */}
            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-wider font-bold text-amber-800 dark:text-amber-400 print:text-slate-900 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5" />
                Imóvel Objeto do Contrato
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white print:text-slate-900">
                {simulation.property_name}
              </div>
              {simulation.unit_description && (
                <div className="text-xs text-slate-600 dark:text-slate-300 print:text-slate-700">
                  <span className="font-medium">Unidade: </span>
                  {simulation.unit_description}
                </div>
              )}
              {simulation.developer_name && (
                <div className="text-xs text-slate-600 dark:text-slate-300 print:text-slate-700">
                  <span className="font-medium">Incorporadora/Ré: </span>
                  {simulation.developer_name}
                </div>
              )}

              {/* Item 6: Anexo do Contrato Original na Apresentação */}
              {simulation.contract_file && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-xs">
                    <Paperclip className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Contrato Original:
                    </span>
                    <span className="text-slate-600 dark:text-slate-400 truncate">
                      {simulation.contract_file}
                    </span>
                    {contractFileUrl && (
                      <a
                        href={contractFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="print:hidden ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Abrir Arquivo
                      </a>
                    )}
                  </div>
                  <div className="hidden print:block text-[10px] text-slate-500 italic mt-0.5">
                    (Contrato original arquivado e anexado ao procedimento eletrônico)
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quadro de Prazos, Data de Referência e Status do Contrato */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[11px] text-muted-foreground block font-medium">
                Modalidade de Pleito
              </span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {typeConfig.label}
              </span>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[11px] text-muted-foreground block font-medium">
                Data Prevista de Entrega
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                {formatDateBRL(simulation.expected_delivery_date)}
              </span>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[11px] text-muted-foreground block font-medium">
                Data de Referência
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                {formatDateBRL(simulation.reference_date || calc.referenceDate)}
              </span>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[11px] text-muted-foreground block font-medium">
                Percentual Quitado
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                {formatPercentBRL(calc.paidPercentage)} do imóvel
              </span>
            </div>
          </div>

          {/* Aviso Explícito de Carência de 180 dias quando aplicável */}
          {isDelayOption && calc.isWithinGracePeriod && (
            <div className="p-4 rounded-xl border-2 border-amber-500/50 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-sm block">
                  Prazo dentro do Período de Carência Contratual / Legal de 180 dias
                </span>
                <p className="leading-relaxed">
                  O atraso apurado na data de referência ({calc.delayDays} dias) ainda não superou o
                  prazo legal de carência de 180 dias (faltam{' '}
                  <strong className="text-amber-950 dark:text-white">
                    {calc.daysToGraceEnd} dias
                  </strong>
                  ). Por força da Lei nº 13.786/2018 (Lei do Distrato) e do contrato, a indenização
                  de 1% ao mês por atraso <strong>ainda não é devida</strong> nesta data de
                  apuração.
                </p>
              </div>
            </div>
          )}

          {/* TABELA PRINCIPAL DA PLANILHA DE CÁLCULO */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                Planilha de Apuração de Valores a Receber e Custas
              </h2>
              <span className="text-xs text-muted-foreground font-mono">
                Moeda: Real Brasileiro (BRL)
              </span>
            </div>

            <div className="rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden print:border-slate-900">
              <Table>
                <TableHeader className="bg-slate-100 dark:bg-slate-800 print:bg-slate-100">
                  <TableRow>
                    <TableHead className="w-12 text-center text-xs font-bold text-slate-900 dark:text-white print:text-slate-900">
                      Item
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-900 dark:text-white print:text-slate-900">
                      Descrição da Rubrica / Base de Cálculo
                    </TableHead>
                    <TableHead className="text-right text-xs font-bold text-slate-900 dark:text-white print:text-slate-900">
                      Base Aplicada (R$)
                    </TableHead>
                    <TableHead className="text-center text-xs font-bold text-slate-900 dark:text-white print:text-slate-900">
                      Alíquota
                    </TableHead>
                    <TableHead className="text-right text-xs font-bold text-slate-900 dark:text-white print:text-slate-900 pr-6">
                      Valor Apurado (R$)
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody className="text-xs">
                  {/* Linha Informativa: Valor do Imóvel */}
                  <TableRow className="bg-slate-50/50 dark:bg-slate-900/40">
                    <TableCell className="text-center font-mono font-semibold text-slate-500">
                      -
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        Valor total do imóvel comprado
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Preço contratual de aquisição da unidade imobiliária
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrencyBRL(calc.propertyValue)}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground font-mono">-</TableCell>
                    <TableCell className="text-right font-mono font-medium pr-6 text-slate-600 dark:text-slate-400">
                      {formatCurrencyBRL(calc.propertyValue)}
                    </TableCell>
                  </TableRow>

                  {/* Linha Informativa: Valor Efetivamente Pago */}
                  <TableRow className="bg-slate-50/50 dark:bg-slate-900/40">
                    <TableCell className="text-center font-mono font-semibold text-slate-500">
                      -
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        Valor efetivamente pago pelo comprador
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Total desembolsado e quitado até o momento
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-emerald-700 dark:text-emerald-400">
                      {formatCurrencyBRL(calc.amountPaid)}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground font-mono">
                      {formatPercentBRL(calc.paidPercentage)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium pr-6 text-emerald-700 dark:text-emerald-400">
                      {formatCurrencyBRL(calc.amountPaid)}
                    </TableCell>
                  </TableRow>

                  {/* Exibição apenas da rubrica aplicável conforme a opção escolhida */}
                  {isDelayOption ? (
                    /* Rubrica Única Aplicável: 1% ao mês de atraso sobre o valor efetivamente pago */
                    <TableRow className="hover:bg-blue-50/30">
                      <TableCell className="text-center font-mono font-bold text-blue-700 dark:text-blue-400">
                        01
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-slate-900 dark:text-white print:text-slate-900">
                          1% ao mês de atraso ({calc.delayMonths}{' '}
                          {calc.delayMonths === 1 ? 'mês' : 'meses'} apurados)
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {calc.isWithinGracePeriod
                            ? `Carência de 180 dias não superada (${calc.delayDays} dias de atraso na data de referência; faltam ${calc.daysToGraceEnd} dias). Indenização não devida.`
                            : `Indenização mensal de 1,00% × ${calc.delayMonths} meses sobre o total quitado (${formatCurrencyBRL(calc.amountPaid)}). Multa rescisória de 50% não devida.`}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrencyBRL(calc.amountPaid)}
                      </TableCell>
                      <TableCell className="text-center font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {calc.isWithinGracePeriod ? '0,00%' : `${calc.delayMonths} × 1,0%`}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-blue-700 dark:text-blue-400 print:text-slate-900 pr-6 text-sm">
                        {formatCurrencyBRL(calc.onePercentAmountPaid)}
                      </TableCell>
                    </TableRow>
                  ) : (
                    /* Rubrica Única Aplicável: Indenização/Multa de 50% por Rescisão */
                    <TableRow className="hover:bg-amber-50/30">
                      <TableCell className="text-center font-mono font-bold text-amber-700 dark:text-amber-400">
                        01
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-slate-900 dark:text-white print:text-slate-900">
                          Indenização / Multa de 50% sobre o valor pago (Rescisão Contratual)
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Penalidade indenizatória de 50,00% contra a construtora em favor do
                          comprador (1% por atraso não aplicável)
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-emerald-700 dark:text-emerald-400">
                        {formatCurrencyBRL(calc.amountPaid)}
                      </TableCell>
                      <TableCell className="text-center font-mono font-semibold text-slate-800 dark:text-slate-200">
                        50,00%
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 print:text-slate-900 pr-6 text-sm">
                        {formatCurrencyBRL(calc.fineFiftyPercent)}
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Rubrica Opcional: Correção Monetária / Juros */}
                  {calc.correctionEnabled && (
                    <TableRow className="bg-indigo-50/30 dark:bg-indigo-950/20">
                      <TableCell className="text-center font-mono font-bold text-indigo-700 dark:text-indigo-400">
                        02
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-slate-900 dark:text-white print:text-slate-900">
                          Correção monetária e juros moratórios (
                          {CORRECTION_INDEX_LABELS[calc.correctionIndex]?.label})
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Estimativa de {formatPercentBRL(calc.correctionRate, 1)} ao mês pelo
                          período de {calc.correctionMonths} meses decorridos entre{' '}
                          {formatDateBRL(calc.correctionStartDate)} e{' '}
                          {formatDateBRL(calc.referenceDate)} sobre a rubrica devida.
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatCurrencyBRL(
                          isDelayOption ? calc.onePercentAmountPaid : calc.fineFiftyPercent,
                        )}
                      </TableCell>
                      <TableCell className="text-center font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {formatPercentBRL(calc.correctionRate * calc.correctionMonths, 1)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-indigo-700 dark:text-indigo-400 print:text-slate-900 pr-6 text-sm">
                        {formatCurrencyBRL(calc.monetaryCorrectionAmount)}
                      </TableCell>
                    </TableRow>
                  )}

                  {/* LINHA DE TOTALIZAÇÃO ESTIMADA A RECEBER */}
                  <TableRow className="bg-amber-100/70 dark:bg-amber-950/40 border-t-2 border-amber-500/50 print:bg-slate-200 print:border-slate-900">
                    <TableCell className="text-center font-mono font-black text-amber-900 dark:text-amber-200">
                      Σ
                    </TableCell>
                    <TableCell
                      colSpan={3}
                      className="font-bold text-slate-950 dark:text-white print:text-slate-900 text-sm uppercase"
                    >
                      {isDelayOption
                        ? 'TOTAL ESTIMADO A RECEBER PELO CLIENTE (1% AO MÊS DE ATRASO)'
                        : 'TOTAL ESTIMADO A RECEBER PELO CLIENTE (MULTA DE 50% SOBRE VALOR PAGO)'}
                    </TableCell>
                    <TableCell className="text-right font-mono font-black text-slate-950 dark:text-amber-200 print:text-slate-900 text-base pr-6">
                      {formatCurrencyBRL(calc.estimatedTotal)}
                    </TableCell>
                  </TableRow>

                  {/* Custas judiciais com alíquota ajustável - Despesa Isolada */}
                  <TableRow className="bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-700">
                    <TableCell className="text-center font-mono font-semibold text-slate-500">
                      *
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <span>Custas judiciais estimadas (Despesa Processual Isolada)</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {isDelayOption
                          ? `Estimativa de ${formatPercentBRL(calc.custasRate, 1)} sobre o valor efetivamente pago (${formatCurrencyBRL(calc.amountPaid)}), haja vista que a multa de 50% não é devida. Não compõe o montante a receber.`
                          : `Estimativa de ${formatPercentBRL(calc.custasRate, 1)} sobre a soma do valor efetivamente pago e a multa de 50% (${formatCurrencyBRL(calc.judicialCostsBase)}). Não compõe o montante a receber.`}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-slate-600 dark:text-slate-400">
                      {formatCurrencyBRL(calc.judicialCostsBase)}
                    </TableCell>
                    <TableCell className="text-center font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {formatPercentBRL(calc.custasRate, 1)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-slate-800 dark:text-slate-200 print:text-slate-900 pr-6 text-sm">
                      {formatCurrencyBRL(calc.judicialCosts)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Destaque do Potencial de Recuperação ao Cliente */}
          <div className="p-5 rounded-xl bg-gradient-to-r from-emerald-50 via-emerald-100/40 to-emerald-50 dark:from-emerald-950/40 dark:via-emerald-900/20 dark:to-emerald-950/40 border border-emerald-300 dark:border-emerald-800 print:bg-slate-50 print:border-slate-400">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200 print:text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  {isDelayOption
                    ? 'Expectativa Global de Crédito ao Cliente (Valor Pago + 1% ao mês + Correção)'
                    : 'Expectativa Total de Crédito / Devolução ao Cliente (Restituição + Indenização + Correção)'}
                </h3>
                <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 print:text-slate-600 mt-0.5">
                  {isDelayOption
                    ? `Valor quitado (${formatCurrencyBRL(calc.amountPaid)}) acrescido da indenização de 1% ao mês (${formatCurrencyBRL(calc.onePercentAmountPaid)})${
                        calc.correctionEnabled
                          ? ` e atualização monetária (${formatCurrencyBRL(calc.monetaryCorrectionAmount)})`
                          : ''
                      } pelo atraso na entrega da obra.`
                    : `Devolução integral do valor quitado (${formatCurrencyBRL(calc.amountPaid)}) acrescido do crédito indenizatório de 50% (${formatCurrencyBRL(calc.fineFiftyPercent)})${
                        calc.correctionEnabled
                          ? ` e atualização monetária (${formatCurrencyBRL(calc.monetaryCorrectionAmount)})`
                          : ''
                      } devido pela construtora ao cliente.`}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block uppercase tracking-wider font-semibold">
                  Montante Reclamado
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-emerald-950 dark:text-emerald-100 print:text-slate-900">
                  {formatCurrencyBRL(calc.potentialRecoveryTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Observações / Notas do Caso */}
          {simulation.notes && (
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 print:border-slate-300">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Observações Específicas do Caso:
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {simulation.notes}
              </p>
            </div>
          )}

          {/* Item 7: Fundamentação Jurídica Customizável antes de imprimir */}
          <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 print:bg-transparent print:border-slate-300 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-amber-600" />
                Fundamentação Jurídica do Parecer
                {simulation.custom_fundamentacao && (
                  <Badge
                    variant="outline"
                    className="text-[9px] font-mono border-amber-400 text-amber-700 dark:text-amber-400 ml-1.5 print:hidden"
                  >
                    Texto Personalizado
                  </Badge>
                )}
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFundamentacaoDraft(currentFundamentacao)
                  setIsEditingFundamentacao(true)
                }}
                className="print:hidden h-7 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-100/50 dark:text-amber-400 px-2"
              >
                <Edit3 className="w-3 h-3 mr-1" />
                Editar fundamentação
              </Button>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-sans text-justify print:text-slate-800">
              {currentFundamentacao}
            </p>
          </div>

          {/* Item 4: Linha do Tempo de Histórico de Status ("linha do tempo do caso") */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 print:bg-transparent print:border-slate-300 space-y-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Linha do Tempo do Caso
              </span>
            </div>

            {history.length > 0 ? (
              <div className="relative pl-5 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700 print:before:bg-slate-300">
                {history.map((item, idx) => {
                  const statusInfo = STATUS_LABELS[item.new_status] || {
                    label: item.new_status,
                    colorClasses: 'bg-slate-100 text-slate-800 border-slate-300',
                  }
                  const prevInfo = item.previous_status
                    ? STATUS_LABELS[item.previous_status]?.label || item.previous_status
                    : null

                  return (
                    <div key={item.id || idx} className="relative text-xs space-y-0.5">
                      <div className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full bg-amber-600 border-2 border-white dark:border-slate-900" />
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {statusInfo.label}
                        </span>
                        {prevInfo && (
                          <span className="text-[10px] text-muted-foreground">
                            (anterior: {prevInfo})
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground font-mono">
                          • {formatDateBRL(item.created)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground pl-2">
                Status atual:{' '}
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {STATUS_LABELS[simulation.status]?.label || 'Em Negociação'}
                </span>{' '}
                (registro inicial criado em {formatDateBRL(simulation.created)}).
              </div>
            )}
          </div>

          {/* Quadro de Assinaturas e Fechamento de Contrato */}
          <div className="pt-8 print:pt-12 space-y-12">
            <div className="text-center text-xs text-muted-foreground print:text-slate-500">
              Documento emitido para instrução preliminar de proposta de honorários e contratação
              jurídica.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
              <div className="text-center space-y-1.5">
                <div className="border-t border-slate-400 dark:border-slate-600 w-3/4 mx-auto pt-2" />
                <div className="text-xs font-bold text-slate-900 dark:text-white print:text-slate-900">
                  {simulation.client_name}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Promitente Comprador (Cliente)
                </div>
              </div>

              <div className="text-center space-y-1.5">
                <div className="border-t border-slate-400 dark:border-slate-600 w-3/4 mx-auto pt-2" />
                <div className="text-xs font-bold text-slate-900 dark:text-white print:text-slate-900">
                  {lawyerName}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Advocacia & Assessoria Jurídica
                </div>
              </div>
            </div>
          </div>

          {/* Disclaimer Jurídico no Rodapé do Documento com Data de Referência */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-6 text-[10px] text-slate-500 dark:text-slate-400 text-center leading-normal print:border-slate-400">
            <span className="font-semibold">Ressalva Legal: </span>
            Valores apurados com data de referência fixada em{' '}
            <strong>{formatDateBRL(simulation.reference_date || calc.referenceDate)}</strong> para
            apresentação comercial e parecer preliminar. A apuração definitiva será liquidada no
            ajuizamento da ação com a incidência de atualização monetária oficial e juros de mora.
          </div>
        </div>
      </div>

      {/* Item 7: Modal de Edição da Fundamentação Jurídica */}
      <Dialog open={isEditingFundamentacao} onOpenChange={setIsEditingFundamentacao}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-amber-600" />
              Editar Fundamentação Jurídica do Caso
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Personalize o texto de fundamentação jurídica para este caso específico antes de
              imprimir ou salvar o documento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Textarea
              rows={7}
              value={fundamentacaoDraft}
              onChange={(e) => setFundamentacaoDraft(e.target.value)}
              placeholder="Digite o texto de fundamentação legal aplicável ao caso..."
              className="text-xs leading-relaxed resize-y font-sans"
            />
            <p className="text-[11px] text-muted-foreground">
              O texto salvo será exibido na página e sairá impresso no documento / PDF gerado.
            </p>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetFundamentacao}
              disabled={savingFundamentacao}
              className="text-xs border-slate-300 dark:border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Restaurar texto padrão
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingFundamentacao(false)}
                disabled={savingFundamentacao}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveFundamentacao}
                disabled={savingFundamentacao || !fundamentacaoDraft.trim()}
                className="bg-amber-600 hover:bg-amber-700 text-slate-950 font-bold text-xs"
              >
                {savingFundamentacao ? 'Salvando...' : 'Salvar Fundamentação'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
