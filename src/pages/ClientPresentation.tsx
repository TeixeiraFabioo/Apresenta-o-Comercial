import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getSimulationById, updateSimulation } from '@/services/simulacoes'
import { SimulationRecord, SimulationStatus } from '@/types/simulation'
import {
  calculateLegalCosts,
  formatCurrencyBRL,
  formatDateBRL,
  formatPercentBRL,
  getDeliveryDelayStatus,
  STATUS_LABELS,
} from '@/lib/calculations'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
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
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function ClientPresentation() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const [simulation, setSimulation] = useState<SimulationRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const fetchRecord = async () => {
      try {
        const record = await getSimulationById(id)
        setSimulation(record)
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar',
          description: 'Não foi possível carregar a apresentação desta simulação.',
        })
        navigate('/')
      } finally {
        setLoading(false)
      }
    }

    fetchRecord()
  }, [id, navigate, toast])

  const calc = useMemo(() => {
    if (!simulation) return null
    return calculateLegalCosts(simulation.property_value, simulation.amount_paid)
  }, [simulation])

  const delay = useMemo(() => {
    if (!simulation) return null
    return getDeliveryDelayStatus(simulation.expected_delivery_date)
  }, [simulation])

  const handlePrint = () => {
    window.print()
  }

  const handleStatusChange = async (newStatus: SimulationStatus) => {
    if (!simulation || !id) return
    try {
      const updated = await updateSimulation(id, { status: newStatus })
      setSimulation(updated)
      toast({
        title: 'Status atualizado',
        description: `Proposta marcada como "${STATUS_LABELS[newStatus]?.label || newStatus}".`,
      })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar status',
      })
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

  const lawyerName = user?.name || 'Advogado Responsável'
  const currentDateFormatted = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
  }).format(new Date())

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-16 print:p-0 print:m-0 print:max-w-none">
      {/* Barra de Ações (Oculta na Impressão) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 text-xs">
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
        {/* Cabeçalho do Documento */}
        <div className="p-6 sm:p-8 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white print:bg-none print:text-slate-900 print:border-b-2 print:border-slate-900 print:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md print:border print:border-slate-900">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white print:text-slate-900 leading-tight">
                    DEMONSTRATIVO DE CRÉDITOS E RESTITUIÇÃO AO CLIENTE
                  </h1>
                  <p className="text-xs text-amber-300 print:text-slate-600 font-medium">
                    Apresentação Prévia para Fechamento de Contrato de Honorários & Ação Judicial
                  </p>
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right space-y-0.5 text-xs text-slate-300 print:text-slate-700">
              <div className="font-semibold text-white print:text-slate-900">{lawyerName}</div>
              <div>Consultoria & Contencioso Imobiliário</div>
              <div className="text-[11px] text-amber-400/90 print:text-slate-500 font-medium">
                Emissão: {currentDateFormatted}
              </div>
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
            </div>
          </div>

          {/* Quadro de Prazos e Status do Contrato */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                Situação do Prazo
              </span>
              <span
                className={`text-xs font-bold ${delay?.isDelayed ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}
              >
                {delay?.text}
              </span>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[11px] text-muted-foreground block font-medium">
                Percentual Quitado
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                {formatPercentBRL(calc.paidPercentage)} do valor total
              </span>
            </div>
          </div>

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

                  {/* Rubrica 1: 1% do valor efetivamente pago */}
                  <TableRow className="hover:bg-amber-50/30">
                    <TableCell className="text-center font-mono font-bold text-amber-700 dark:text-amber-400">
                      01
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-slate-900 dark:text-white print:text-slate-900">
                        1% do valor efetivamente pago
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Cálculo proporcional de 1,00% sobre o total pago (
                        {formatCurrencyBRL(calc.amountPaid)})
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrencyBRL(calc.amountPaid)}
                    </TableCell>
                    <TableCell className="text-center font-mono font-semibold text-slate-800 dark:text-slate-200">
                      1,00%
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-slate-900 dark:text-white print:text-slate-900 pr-6 text-sm">
                      {formatCurrencyBRL(calc.onePercentAmountPaid)}
                    </TableCell>
                  </TableRow>

                  {/* Rubrica 2: Indenização de 50% em favor do cliente */}
                  <TableRow className="hover:bg-amber-50/30">
                    <TableCell className="text-center font-mono font-bold text-amber-700 dark:text-amber-400">
                      02
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-slate-900 dark:text-white print:text-slate-900">
                        Indenização de 50% sobre o valor pago (devida pela construtora ao cliente)
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Crédito indenizatório contratual aplicado contra a construtora em favor do
                        comprador
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

                  {/* LINHA DE TOTALIZAÇÃO ESTIMADA A RECEBER (1% pago + 50% indenização) */}
                  <TableRow className="bg-amber-100/70 dark:bg-amber-950/40 border-t-2 border-amber-500/50 print:bg-slate-200 print:border-slate-900">
                    <TableCell className="text-center font-mono font-black text-amber-900 dark:text-amber-200">
                      Σ
                    </TableCell>
                    <TableCell
                      colSpan={3}
                      className="font-bold text-slate-950 dark:text-white print:text-slate-900 text-sm"
                    >
                      TOTAL ESTIMADO A RECEBER PELO CLIENTE (1% PAGO + 50% INDENIZAÇÃO)
                    </TableCell>
                    <TableCell className="text-right font-mono font-black text-slate-950 dark:text-amber-200 print:text-slate-900 text-base pr-6">
                      {formatCurrencyBRL(calc.estimatedTotal)}
                    </TableCell>
                  </TableRow>

                  {/* Rubrica 3: Custas judiciais = 3% de (valor efetivamente pago + indenização) - Despesa Isolada */}
                  <TableRow className="bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-700">
                    <TableCell className="text-center font-mono font-semibold text-slate-500">
                      *
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <span>Custas judiciais estimadas (Despesa Processual Isolada)</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Estimativa de 3,00% sobre a soma do valor efetivamente pago e a indenização
                        devida ({formatCurrencyBRL(calc.amountPaid + calc.fineFiftyPercent)}). Não
                        compõe o montante a receber.
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-slate-600 dark:text-slate-400">
                      {formatCurrencyBRL(calc.amountPaid + calc.fineFiftyPercent)}
                    </TableCell>
                    <TableCell className="text-center font-mono font-semibold text-slate-800 dark:text-slate-200">
                      3,00%
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
                  Expectativa Total de Crédito / Devolução ao Cliente (Restituição + Indenização)
                </h3>
                <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 print:text-slate-600 mt-0.5">
                  Devolução integral do valor quitado ({formatCurrencyBRL(calc.amountPaid)})
                  acrescido do crédito indenizatório de 50% (
                  {formatCurrencyBRL(calc.fineFiftyPercent)}) devido pela construtora ao cliente.
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
                Fundamentos & Observações Específicas do Caso:
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {simulation.notes}
              </p>
            </div>
          )}

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

          {/* Disclaimer Jurídico no Rodapé do Documento */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-6 text-[10px] text-slate-500 dark:text-slate-400 text-center leading-normal print:border-slate-400">
            <span className="font-semibold">Ressalva Legal: </span>
            Valores estimados para apresentação inicial — a base de cálculo definitiva será apurada
            na data do ajuizamento da ação com a incidência de correção monetária
            (INPC/IGP-M/IPCA-E) e juros legais de mora de 1% ao mês.
          </div>
        </div>
      </div>
    </div>
  )
}
