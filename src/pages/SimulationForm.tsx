import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { createSimulation, getSimulationById, updateSimulation } from '@/services/simulacoes'
import {
  CorrectionIndex,
  SimulationFormData,
  SimulationStatus,
  SimulationType,
} from '@/types/simulation'
import {
  calculateLegalCosts,
  CORRECTION_INDEX_LABELS,
  formatCurrencyBRL,
  formatDateBRL,
  formatPercentBRL,
  getDeliveryDelayStatus,
  getNormalizedDateString,
  SIMULATION_TYPE_CONFIG,
} from '@/lib/calculations'
import { CurrencyInput } from '@/components/CurrencyInput'
import { isNotFoundError } from '@/lib/pocketbase/errors'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Calculator,
  Save,
  ArrowLeft,
  FileText,
  Building,
  DollarSign,
  Calendar,
  AlertTriangle,
  Info,
  CheckCircle2,
  Sparkles,
  Percent,
  Receipt,
  Scale,
  Landmark,
  TrendingUp,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function SimulationForm() {
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(isEditing)

  // Campos do formulário
  const [clientName, setClientName] = useState('')
  const [clientDocument, setClientDocument] = useState('')
  const [propertyName, setPropertyName] = useState('')
  const [unitDescription, setUnitDescription] = useState('')
  const [propertyValueRaw, setPropertyValueRaw] = useState<number>(480000)
  const [amountPaidRaw, setAmountPaidRaw] = useState<number>(240000)
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>(
    new Date(Date.now() - 425 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  )
  const [contractNumber, setContractNumber] = useState('')
  const [developerName, setDeveloperName] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<SimulationStatus>('apresentado')
  const [simulationType, setSimulationType] = useState<SimulationType>('rescisao_contratual')

  // Novos campos: Data de referência, alíquota de custas, correção monetária
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])
  const [referenceDate, setReferenceDate] = useState<string>(todayStr)
  const [custasRate, setCustasRate] = useState<number>(3)
  const [correctionEnabled, setCorrectionEnabled] = useState<boolean>(false)
  const [correctionIndex, setCorrectionIndex] = useState<CorrectionIndex>('inpc')
  const [correctionRate, setCorrectionRate] = useState<number>(1)
  const [correctionStartDate, setCorrectionStartDate] = useState<string>('')

  // Carregar dados existentes no caso de edição
  useEffect(() => {
    if (isEditing && id) {
      const fetchRecord = async () => {
        try {
          const record = await getSimulationById(id, user?.id)
          setClientName(record.client_name || '')
          setClientDocument(record.client_document || '')
          setPropertyName(record.property_name || '')
          setUnitDescription(record.unit_description || '')
          setPropertyValueRaw(typeof record.property_value === 'number' ? record.property_value : 0)
          setAmountPaidRaw(typeof record.amount_paid === 'number' ? record.amount_paid : 0)

          if (record.expected_delivery_date) {
            const dateOnly = record.expected_delivery_date.split('T')[0].split(' ')[0]
            setExpectedDeliveryDate(dateOnly)
          }

          if (record.reference_date) {
            const refOnly = record.reference_date.split('T')[0].split(' ')[0]
            setReferenceDate(refOnly)
          } else {
            setReferenceDate(todayStr)
          }

          setCustasRate(typeof record.custas_rate === 'number' ? record.custas_rate : 3)
          setCorrectionEnabled(Boolean(record.correction_enabled))
          setCorrectionIndex(record.correction_index || 'inpc')
          setCorrectionRate(typeof record.correction_rate === 'number' ? record.correction_rate : 1)

          if (record.correction_start_date) {
            const startOnly = record.correction_start_date.split('T')[0].split(' ')[0]
            setCorrectionStartDate(startOnly)
          } else if (record.expected_delivery_date) {
            setCorrectionStartDate(record.expected_delivery_date.split('T')[0].split(' ')[0])
          }

          setContractNumber(record.contract_number || '')
          setDeveloperName(record.developer_name || '')
          setNotes(record.notes || '')
          setStatus(record.status || 'em_negociacao')
          setSimulationType(
            record.simulation_type === 'indenizacao_atraso'
              ? 'indenizacao_atraso'
              : 'rescisao_contratual',
          )
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
              title: 'Erro ao carregar simulação',
              description: 'Não foi possível carregar os dados desta simulação.',
            })
          }
          navigate('/')
        } finally {
          setInitialLoading(false)
        }
      }
      fetchRecord()
    }
  }, [id, isEditing, user?.id, navigate, toast])

  // Sincroniza sugestão da data de início da correção se ainda estiver vazia
  useEffect(() => {
    if (!correctionStartDate && expectedDeliveryDate) {
      setCorrectionStartDate(expectedDeliveryDate)
    }
  }, [expectedDeliveryDate, correctionStartDate])

  // Cálculos reativos em tempo real centralizados
  const calcResults = useMemo(() => {
    return calculateLegalCosts(propertyValueRaw, amountPaidRaw, simulationType, {
      expectedDeliveryDate,
      referenceDate,
      custasRate,
      correctionEnabled,
      correctionIndex,
      correctionRate,
      correctionStartDate: correctionStartDate || expectedDeliveryDate,
    })
  }, [
    propertyValueRaw,
    amountPaidRaw,
    simulationType,
    expectedDeliveryDate,
    referenceDate,
    custasRate,
    correctionEnabled,
    correctionIndex,
    correctionRate,
    correctionStartDate,
  ])

  // Status de atraso contratual da obra com data de referência
  const delayInfo = useMemo(() => {
    return getDeliveryDelayStatus(expectedDeliveryDate, referenceDate)
  }, [expectedDeliveryDate, referenceDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!clientName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campo obrigatório',
        description: 'Por favor, informe o nome do cliente.',
      })
      return
    }

    if (!propertyName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campo obrigatório',
        description: 'Por favor, informe o nome do empreendimento ou imóvel.',
      })
      return
    }

    const propVal = propertyValueRaw
    const paidVal = amountPaidRaw

    if (propVal <= 0) {
      toast({
        variant: 'destructive',
        title: 'Valor inválido',
        description: 'O valor do imóvel comprado deve ser maior que zero.',
      })
      return
    }

    if (paidVal <= 0) {
      toast({
        variant: 'destructive',
        title: 'Valor inválido',
        description: 'O valor efetivamente pago deve ser maior que zero.',
      })
      return
    }

    setLoading(true)

    const formData: SimulationFormData = {
      client_name: clientName.trim(),
      client_document: clientDocument.trim() || undefined,
      property_name: propertyName.trim(),
      unit_description: unitDescription.trim() || undefined,
      property_value: propVal,
      amount_paid: paidVal,
      expected_delivery_date: expectedDeliveryDate,
      contract_number: contractNumber.trim() || undefined,
      developer_name: developerName.trim() || undefined,
      notes: notes.trim() || undefined,
      status,
      simulation_type: simulationType,
      reference_date: referenceDate || undefined,
      custas_rate: custasRate >= 0 ? custasRate : 3,
      correction_enabled: correctionEnabled,
      correction_index: correctionIndex,
      correction_rate: correctionRate >= 0 ? correctionRate : 1,
      correction_start_date:
        correctionEnabled && (correctionStartDate || expectedDeliveryDate)
          ? correctionStartDate || expectedDeliveryDate
          : undefined,
    }

    try {
      if (isEditing && id) {
        await updateSimulation(id, formData)
        toast({
          title: 'Simulação atualizada com sucesso!',
          description: 'Os novos cálculos foram salvos.',
        })
        navigate(`/apresentacao/${id}`)
      } else {
        const created = await createSimulation(formData)
        toast({
          title: 'Simulação gerada com sucesso!',
          description: 'Apresentação pronta para o cliente.',
        })
        navigate(`/apresentacao/${created.id}`)
      }
    } catch (err: unknown) {
      if (isNotFoundError(err)) {
        toast({
          variant: 'destructive',
          title: 'Simulação não encontrada',
          description: 'Esta simulação já foi excluída — atualize a lista.',
        })
        navigate('/')
      } else {
        const errorMsg = err instanceof Error ? err.message : 'Falha ao salvar'
        toast({
          variant: 'destructive',
          title: 'Erro ao salvar',
          description: errorMsg || 'Verifique sua conexão com o banco de dados.',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  // Exemplo rápido preenchido para agilizar demonstrações
  const applyPresetExample = () => {
    setClientName('Dr. Fernando Bittencourt & Família')
    setClientDocument('214.558.901-44')
    setPropertyName('Residencial Grand Boulevard')
    setUnitDescription('Apartamento 184 - Torre A')
    setPropertyValueRaw(480000)
    setAmountPaidRaw(240000)
    // 14 meses atrás para testar o cálculo de 1% × 14 meses
    const d = new Date()
    d.setMonth(d.getMonth() - 14)
    const pastDate = d.toISOString().split('T')[0]
    setExpectedDeliveryDate(pastDate)
    setReferenceDate(todayStr)
    setCustasRate(3)
    setCorrectionEnabled(false)
    setContractNumber('CTR-8891/2022')
    setDeveloperName('Cyrela / Construtora Metropolitana SPE')
    setNotes(
      'Atraso superior a 14 meses (carência de 180 dias superada).\nCliente solicita apuração detalhada de restituição e penalidades contratuais.',
    )
    setSimulationType('indenizacao_atraso')
    setStatus('apresentado')
  }

  if (initialLoading) {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Carregando dados da simulação...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in pb-12">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-amber-600 transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              Painel
            </Link>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              {isEditing ? 'Editar Simulação' : 'Nova Simulação'}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Calculator className="w-6 h-6 text-amber-600" />
            {isEditing ? 'Editar Apresentação' : 'Apresentação'}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Preencha os dados contratuais do imóvel para computar instantaneamente o demonstrativo
            financeiro ao cliente.
          </p>
        </div>

        {!isEditing && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={applyPresetExample}
            className="border-amber-400 text-amber-800 bg-amber-50/60 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800 text-xs font-semibold self-start sm:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
            Preencher com Exemplo (R$ 480k / R$ 240k)
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coluna da Esquerda: Formulário de Entrada (7 colunas no desktop) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Dados Financeiros do Contrato (Requisitos Principais) */}
          <Card className="border-amber-500/30 shadow-md">
            <CardHeader className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-amber-500/20 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                    Valores e Prazos Contratuais
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Bases fundamentais para a apuração das custas e penalidades.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-5">
              {/* Opção de Escolha / Tipo de Ação */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Modalidade do Pleito / Cálculo *
                  </Label>
                  <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                    Escolha uma das opções abaixo
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Opção 1: Rescisão Contratual */}
                  <button
                    type="button"
                    onClick={() => setSimulationType('rescisao_contratual')}
                    className={`relative p-3.5 rounded-xl text-left border-2 transition-all flex flex-col justify-between gap-2 ${
                      simulationType === 'rescisao_contratual'
                        ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 shadow-sm ring-1 ring-amber-500/40'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 opacity-85 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            simulationType === 'rescisao_contratual'
                              ? 'border-amber-600 bg-amber-600'
                              : 'border-slate-400 dark:border-slate-600'
                          }`}
                        >
                          {simulationType === 'rescisao_contratual' && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Rescisão Contratual
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono border-amber-300 bg-amber-100/60 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
                      >
                        Multa de 50%
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Aplica a{' '}
                      <strong className="text-slate-800 dark:text-slate-200">multa de 50%</strong>{' '}
                      sobre o valor pago. Não aplica o 1% por atraso.
                    </p>
                  </button>

                  {/* Opção 2: Indenização por Atraso */}
                  <button
                    type="button"
                    onClick={() => setSimulationType('indenizacao_atraso')}
                    className={`relative p-3.5 rounded-xl text-left border-2 transition-all flex flex-col justify-between gap-2 ${
                      simulationType === 'indenizacao_atraso'
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 shadow-sm ring-1 ring-blue-500/40'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 opacity-85 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            simulationType === 'indenizacao_atraso'
                              ? 'border-blue-600 bg-blue-600'
                              : 'border-slate-400 dark:border-slate-600'
                          }`}
                        >
                          {simulationType === 'indenizacao_atraso' && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Indenização por Atraso
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono border-blue-300 bg-blue-100/60 dark:bg-blue-950 text-blue-800 dark:text-blue-300"
                      >
                        1% ao mês
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Aplica o{' '}
                      <strong className="text-slate-800 dark:text-slate-200">1% por atraso</strong>{' '}
                      sobre o valor pago. A multa de 50%{' '}
                      <strong className="text-rose-600 dark:text-rose-400">NÃO é devida</strong>.
                    </p>
                  </button>
                </div>

                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-0.5 px-0.5">
                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    Regra: Se aplicável 1% pelo atraso, a multa de 50% não é devida (e vice-versa).
                  </span>
                </div>
              </div>

              <Separator className="bg-slate-200 dark:bg-slate-800" />

              {/* Valor do Imóvel Comprado */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="property_value"
                    className="text-xs font-bold text-slate-800 dark:text-slate-200"
                  >
                    Valor do imóvel comprado (R$) *
                  </Label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Valor total de aquisição
                  </span>
                </div>
                <CurrencyInput
                  id="property_value"
                  required
                  placeholder="R$ 0,00"
                  value={propertyValueRaw}
                  onValueChange={(val) => setPropertyValueRaw(val)}
                  className="text-base font-mono font-semibold h-11 border-slate-300 dark:border-slate-700"
                />
                <p className="text-[11px] text-muted-foreground">
                  Valor total da compra constante no Instrumento Particular de Promessa de Compra e
                  Venda. Digite apenas números ou cole com vírgula (ex.: R$ 480.000,00).
                </p>
              </div>

              {/* Valor Efetivamente Pago */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="amount_paid"
                    className="text-xs font-bold text-slate-800 dark:text-slate-200"
                  >
                    Valor efetivamente pago pelo cliente (R$) *
                  </Label>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                    {simulationType === 'rescisao_contratual'
                      ? 'Base para Multa de 50% e Custas'
                      : 'Base para 1% de Atraso e Custas'}
                  </span>
                </div>
                <CurrencyInput
                  id="amount_paid"
                  required
                  placeholder="R$ 0,00"
                  value={amountPaidRaw}
                  onValueChange={(val) => setAmountPaidRaw(val)}
                  className="text-base font-mono font-semibold h-11 border-emerald-300 dark:border-emerald-800 focus-visible:ring-emerald-500"
                />
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">
                    Soma de entrada, parcelas mensais, balões e chaves quitadas.
                  </span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {formatPercentBRL(calcResults.paidPercentage)} do imóvel quitado
                  </span>
                </div>

                {/* Aviso de sanidade se o valor pago for maior que o valor do imóvel */}
                {amountPaidRaw > 0 && propertyValueRaw > 0 && amountPaidRaw > propertyValueRaw && (
                  <div
                    role="alert"
                    className="mt-2 p-3 rounded-lg border border-amber-300/70 bg-amber-50/90 dark:bg-amber-950/40 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5 animate-fade-in"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-semibold text-amber-950 dark:text-amber-100">
                        Atenção: o valor pago está maior que o valor do imóvel
                      </p>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                        Confira se os valores foram digitados corretamente (
                        {formatCurrencyBRL(amountPaidRaw)} pago vs.{' '}
                        {formatCurrencyBRL(propertyValueRaw)} do imóvel). Normalmente isso indica
                        uma inversão ou erro de digitação.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Datas de Prazos: Prevista de Entrega e Referência do Cálculo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Data Prevista de Entrega */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="expected_delivery_date"
                      className="text-xs font-bold text-slate-800 dark:text-slate-200"
                    >
                      Data prevista de entrega (contrato) *
                    </Label>
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="expected_delivery_date"
                      type="date"
                      required
                      value={expectedDeliveryDate}
                      onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                      className="pl-9 h-11 text-xs"
                    />
                  </div>
                </div>

                {/* Data de Referência do Cálculo */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="reference_date"
                      className="text-xs font-bold text-slate-800 dark:text-slate-200"
                    >
                      Data de referência do cálculo *
                    </Label>
                    <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                      Fixa o atraso
                    </span>
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="reference_date"
                      type="date"
                      required
                      value={referenceDate}
                      onChange={(e) => setReferenceDate(e.target.value)}
                      className="pl-9 h-11 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Alíquota de Custas Judiciais Ajustável (%) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="custas_rate"
                    className="text-xs font-bold text-slate-800 dark:text-slate-200"
                  >
                    Alíquota de custas judiciais (%) *
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    Padrão: 3,0% (despesa processual isolada)
                  </span>
                </div>
                <div className="relative">
                  <Percent className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="custas_rate"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    required
                    value={custasRate}
                    onChange={(e) => setCustasRate(parseFloat(e.target.value) || 0)}
                    className="pl-9 h-11 font-mono text-sm border-slate-300 dark:border-slate-700"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Percentual estimado das taxas e custas do Tribunal de Justiça competente (editável
                  por processo/estado).
                </p>
              </div>

              {/* Status do Atraso / Carência de 180 dias */}
              {expectedDeliveryDate && (
                <div className="space-y-2">
                  <div
                    className={`p-3 rounded-lg text-xs flex items-start gap-2.5 border ${
                      delayInfo.isDelayed
                        ? delayInfo.isWithinGracePeriod
                          ? 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-700'
                          : 'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800'
                        : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
                    }`}
                  >
                    {delayInfo.isDelayed ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <div className="font-semibold">{delayInfo.text}</div>
                      {simulationType === 'indenizacao_atraso' && delayInfo.isWithinGracePeriod && (
                        <div className="text-[11px] text-amber-800 dark:text-amber-300 leading-snug">
                          {delayInfo.graceWarningText}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card Opcional: Correção Monetária e Juros */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                    Correção Monetária e Juros de Mora (Opcional)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Estimativa de atualização do valor devido até a data de ajuizamento.
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Label
                  htmlFor="correction_enabled_switch"
                  className="text-xs font-semibold cursor-pointer text-slate-700 dark:text-slate-300"
                >
                  {correctionEnabled ? 'Ativada' : 'Desativada'}
                </Label>
                <Switch
                  id="correction_enabled_switch"
                  checked={correctionEnabled}
                  onCheckedChange={setCorrectionEnabled}
                />
              </div>
            </CardHeader>

            {correctionEnabled && (
              <CardContent className="p-5 space-y-4 animate-fade-in bg-indigo-50/20 dark:bg-indigo-950/10">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Índice */}
                  <div className="space-y-1.5">
                    <Label htmlFor="correction_index" className="text-xs font-semibold">
                      Índice Econômico
                    </Label>
                    <Select
                      value={correctionIndex}
                      onValueChange={(val) => setCorrectionIndex(val as CorrectionIndex)}
                    >
                      <SelectTrigger id="correction_index" className="h-10 text-xs">
                        <SelectValue placeholder="Selecione o índice" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inpc">INPC (IBGE)</SelectItem>
                        <SelectItem value="igpm">IGP-M (FGV)</SelectItem>
                        <SelectItem value="ipca_e">IPCA-E (IBGE)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Taxa Mensal (%) */}
                  <div className="space-y-1.5">
                    <Label htmlFor="correction_rate" className="text-xs font-semibold">
                      Taxa Mensal Estimada (%)
                    </Label>
                    <Input
                      id="correction_rate"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={correctionRate}
                      onChange={(e) => setCorrectionRate(parseFloat(e.target.value) || 0)}
                      className="h-10 text-xs font-mono"
                    />
                  </div>

                  {/* Data Inicial */}
                  <div className="space-y-1.5">
                    <Label htmlFor="correction_start_date" className="text-xs font-semibold">
                      Data Inicial da Correção
                    </Label>
                    <Input
                      id="correction_start_date"
                      type="date"
                      value={correctionStartDate}
                      onChange={(e) => setCorrectionStartDate(e.target.value)}
                      className="h-10 text-xs"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-[11px] text-indigo-950 dark:text-indigo-200 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Critério de Atualização adotado:</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    Fórmula: Valor Devido × ({correctionRate}% ao mês) ×{' '}
                    {calcResults.correctionMonths} meses decorridos entre a data inicial (
                    {formatDateBRL(correctionStartDate || expectedDeliveryDate)}) e a data de
                    referência ({formatDateBRL(referenceDate)}). Estimativa simples — a correção
                    definitiva será apurada na data do ajuizamento com os índices oficiais.
                  </p>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Card 2: Identificação do Cliente e do Imóvel */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                    Identificação do Cliente e do Empreendimento
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Informações exibidas no cabeçalho da proposta impressa.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="client_name" className="text-xs font-semibold">
                    Nome do Cliente / Comprador *
                  </Label>
                  <Input
                    id="client_name"
                    required
                    placeholder="Ex: Roberto de Almeida Prado"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="h-10 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="client_document" className="text-xs font-semibold">
                    CPF / CNPJ do Cliente (opcional)
                  </Label>
                  <Input
                    id="client_document"
                    placeholder="Ex: 000.000.000-00"
                    value={clientDocument}
                    onChange={(e) => setClientDocument(e.target.value)}
                    className="h-10 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="property_name" className="text-xs font-semibold">
                    Nome do Imóvel / Condomínio *
                  </Label>
                  <Input
                    id="property_name"
                    required
                    placeholder="Ex: Condomínio Grand Palais"
                    value={propertyName}
                    onChange={(e) => setPropertyName(e.target.value)}
                    className="h-10 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="unit_description" className="text-xs font-semibold">
                    Unidade / Apartamento / Bloco
                  </Label>
                  <Input
                    id="unit_description"
                    placeholder="Ex: Apartamento 142 - Torre B"
                    value={unitDescription}
                    onChange={(e) => setUnitDescription(e.target.value)}
                    className="h-10 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="contract_number" className="text-xs font-semibold">
                    Nº do Contrato / Proposta
                  </Label>
                  <Input
                    id="contract_number"
                    placeholder="Ex: CTR-2023-8841"
                    value={contractNumber}
                    onChange={(e) => setContractNumber(e.target.value)}
                    className="h-10 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="developer_name" className="text-xs font-semibold">
                    Construtora / Incorporadora (Ré)
                  </Label>
                  <Input
                    id="developer_name"
                    placeholder="Ex: Incorporadora Horizonte SPE"
                    value={developerName}
                    onChange={(e) => setDeveloperName(e.target.value)}
                    className="h-10 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="status" className="text-xs font-semibold">
                    Status da Negociação
                  </Label>
                  <Select
                    value={status}
                    onValueChange={(val) => setStatus(val as SimulationStatus)}
                  >
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="em_negociacao">Em Negociação</SelectItem>
                      <SelectItem value="apresentado">Apresentado ao Cliente</SelectItem>
                      <SelectItem value="contrato_fechado">Contrato Fechado</SelectItem>
                      <SelectItem value="em_andamento">Ação Distribuída</SelectItem>
                      <SelectItem value="arquivado">Arquivado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Observações Multilinha (Textarea de várias linhas) */}
                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs font-semibold">
                    Observações e Fundamentações do Caso
                  </Label>
                  <Textarea
                    id="notes"
                    rows={4}
                    placeholder="Ex.: Detalhamento do atraso na entrega, comunicação formal com a construtora, cláusulas abusivas ou particularidades da negociação..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="text-xs resize-y min-h-[96px] leading-relaxed"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    As quebras de linha e parágrafos serão exibidos integralmente na apresentação
                    impressa do cliente.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botões de Ação do Formulário */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/')}
              className="h-11 px-5 text-xs font-medium"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-700 text-slate-950 font-bold h-11 px-6 shadow-md text-xs sm:text-sm"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading
                ? 'Salvando Planilha...'
                : isEditing
                  ? 'Atualizar Simulação'
                  : 'Salvar e Gerar Apresentação'}
            </Button>
          </div>
        </div>

        {/* Coluna da Direita: Painel de Resultados ao Vivo (5 colunas no desktop) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          <Card className="border-amber-500/40 shadow-xl bg-gradient-to-b from-white to-amber-50/20 dark:from-slate-900 dark:to-amber-950/20 overflow-hidden">
            <CardHeader className="bg-slate-900 text-white p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold tracking-tight text-white">
                      Demonstrativo de Cálculos (Ao Vivo)
                    </CardTitle>
                    <CardDescription className="text-[11px] text-slate-300">
                      Cálculos parametrizados em tempo real
                    </CardDescription>
                  </div>
                </div>
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/40 text-[10px]">
                  Fórmula Oficial
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              {/* Badge indicativo do modo ativo */}
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-amber-600" />
                  Modo selecionado:
                </span>
                <Badge
                  variant="outline"
                  className={
                    simulationType === 'rescisao_contratual'
                      ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950 dark:text-blue-300'
                  }
                >
                  {simulationType === 'rescisao_contratual'
                    ? 'Rescisão Contratual'
                    : 'Indenização por Atraso'}
                </Badge>
              </div>

              {/* Aviso em destaque se dentro do período de carência de 180 dias na modalidade de atraso */}
              {simulationType === 'indenizacao_atraso' && calcResults.isWithinGracePeriod && (
                <div className="p-3 rounded-xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-900 dark:text-amber-300 space-y-1.5 animate-fade-in">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Carência de 180 dias não superada</span>
                  </div>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                    O atraso apurado na data de referência ({calcResults.delayDays} dias) ainda está
                    dentro da tolerância contratual/legal de 180 dias. Faltam{' '}
                    <strong className="text-amber-700 dark:text-amber-400">
                      {calcResults.daysToGraceEnd} dias
                    </strong>{' '}
                    para que a indenização por atraso de 1% ao mês passe a ser devida.
                  </p>
                </div>
              )}

              {/* Exibição condicional da rubrica aplicável conforme a escolha */}
              {simulationType === 'indenizacao_atraso' ? (
                /* Item 1: 1% ao mês de atraso sobre o valor efetivamente pago */
                <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 space-y-1 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                        1
                      </span>
                      1% ao mês de atraso ({calcResults.delayMonths}{' '}
                      {calcResults.delayMonths === 1 ? 'mês' : 'meses'})
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      1% × {calcResults.delayMonths} m × {formatCurrencyBRL(calcResults.amountPaid)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-[11px] text-muted-foreground">
                      {calcResults.isWithinGracePeriod
                        ? 'Indenização suspensa (dentro da carência)'
                        : `Indenização acumulada (${calcResults.delayMonths} meses de atraso)`}
                    </span>
                    <span className="text-base font-bold font-mono text-blue-700 dark:text-blue-300">
                      {formatCurrencyBRL(calcResults.onePercentAmountPaid)}
                    </span>
                  </div>
                </div>
              ) : (
                /* Item 1: Multa de 50% sobre o valor efetivamente pago (Rescisão Contratual) */
                <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 space-y-1 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-bold">
                        1
                      </span>
                      Multa de 50% sobre o valor pago (Rescisão)
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {formatCurrencyBRL(calcResults.amountPaid)} × 50%
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-[11px] text-muted-foreground">
                      Penalidade rescisória por descumprimento
                    </span>
                    <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {formatCurrencyBRL(calcResults.fineFiftyPercent)}
                    </span>
                  </div>
                </div>
              )}

              {/* Rubrica Opcional: Correção Monetária / Juros de Mora */}
              {calcResults.correctionEnabled && (
                <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 space-y-1 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                        +
                      </span>
                      Correção monetária / juros (
                      {CORRECTION_INDEX_LABELS[calcResults.correctionIndex]?.label})
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {calcResults.correctionRate}% a.m. × {calcResults.correctionMonths} m
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-[11px] text-muted-foreground">
                      Atualização estimada até a data de referência
                    </span>
                    <span className="text-base font-bold font-mono text-indigo-700 dark:text-indigo-300">
                      {formatCurrencyBRL(calcResults.monetaryCorrectionAmount)}
                    </span>
                  </div>
                </div>
              )}

              {/* Item Custas Judiciais Ajustáveis - Despesa Isolada */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center text-[10px] font-bold">
                      *
                    </span>
                    Custas judiciais ({formatPercentBRL(calcResults.custasRate, 1)})
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {formatPercentBRL(calcResults.custasRate, 1)} ×{' '}
                    {formatCurrencyBRL(calcResults.judicialCostsBase)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <span>
                      {simulationType === 'rescisao_contratual'
                        ? 'Base: pago + multa 50%'
                        : 'Base: valor pago (multa 50% não devida)'}
                    </span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                      (despesa isolada)
                    </span>
                  </span>
                  <span className="text-base font-bold font-mono text-slate-900 dark:text-white">
                    {formatCurrencyBRL(calcResults.judicialCosts)}
                  </span>
                </div>
              </div>

              <Separator className="my-2 bg-slate-200 dark:bg-slate-700" />

              {/* TOTAL ESTIMADO A RECEBER PELO CLIENTE */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/15 via-amber-500/10 to-transparent border-2 border-amber-500/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-amber-600" />
                    Total Estimado a Receber
                  </span>
                  <Badge
                    variant="outline"
                    className="bg-white/80 dark:bg-slate-900 text-[10px] font-mono border-amber-300"
                  >
                    {simulationType === 'rescisao_contratual'
                      ? 'Multa 50% (Rescisão)'
                      : '1% ao mês (Atraso)'}
                  </Badge>
                </div>
                <div className="flex items-baseline justify-between pt-2">
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    Total a receber pelo cliente:
                  </span>
                  <span className="text-2xl font-black font-mono tracking-tight text-slate-950 dark:text-amber-200">
                    {formatCurrencyBRL(calcResults.estimatedTotal)}
                  </span>
                </div>
                <p className="text-[10px] text-amber-800/80 dark:text-amber-400/80 pt-1">
                  {simulationType === 'rescisao_contratual' ? (
                    <>
                      = Multa de 50% ({formatCurrencyBRL(calcResults.fineFiftyPercent)})
                      {calcResults.correctionEnabled && (
                        <> + Correção ({formatCurrencyBRL(calcResults.monetaryCorrectionAmount)})</>
                      )}{' '}
                      • O 1% por atraso não é aplicável.
                    </>
                  ) : (
                    <>
                      = 1% ao mês ({formatCurrencyBRL(calcResults.onePercentAmountPaid)})
                      {calcResults.correctionEnabled && (
                        <> + Correção ({formatCurrencyBRL(calcResults.monetaryCorrectionAmount)})</>
                      )}{' '}
                      • A multa de 50% não é devida.
                    </>
                  )}{' '}
                  Custas judiciais de {formatPercentBRL(calcResults.custasRate, 1)} (
                  {formatCurrencyBRL(calcResults.judicialCosts)}) constituem despesa isolada.
                </p>
              </div>

              {/* Potencial de Restituição Global ao Comprador */}
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    {simulationType === 'rescisao_contratual'
                      ? 'Potencial de Restituição (100% Pago + Multa 50% + Correção)'
                      : 'Expectativa Global (Valor Pago + 1% ao mês + Correção)'}
                  </span>
                  <span className="text-xs font-bold font-mono text-emerald-700 dark:text-emerald-300">
                    {formatCurrencyBRL(calcResults.potentialRecoveryTotal)}
                  </span>
                </div>
                <p className="text-[10px] text-emerald-800/80 dark:text-emerald-400 mt-1">
                  {simulationType === 'rescisao_contratual'
                    ? `100% do valor pago (${formatCurrencyBRL(calcResults.amountPaid)}) + 50% de multa (${formatCurrencyBRL(calcResults.fineFiftyPercent)})${
                        calcResults.correctionEnabled
                          ? ` + correção (${formatCurrencyBRL(calcResults.monetaryCorrectionAmount)})`
                          : ''
                      }.`
                    : `Valor pago (${formatCurrencyBRL(calcResults.amountPaid)}) + indenização de 1% ao mês (${formatCurrencyBRL(calcResults.onePercentAmountPaid)})${
                        calcResults.correctionEnabled
                          ? ` + correção (${formatCurrencyBRL(calcResults.monetaryCorrectionAmount)})`
                          : ''
                      }.`}
                </p>
              </div>
            </CardContent>

            <CardFooter className="bg-slate-50 dark:bg-slate-900/50 p-4 text-[11px] text-muted-foreground border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Os valores calculados nesta planilha refletem as diretrizes informadas para a fase
                  de fechamento de contrato e propositura de ação.
                </span>
              </div>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  )
}
