import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { createSimulation, getSimulationById, updateSimulation } from '@/services/simulacoes'
import { SimulationFormData, SimulationStatus, SimulationType } from '@/types/simulation'
import {
  calculateLegalCosts,
  formatCurrencyBRL,
  formatPercentBRL,
  getDeliveryDelayStatus,
  sanitizeNumber,
  SIMULATION_TYPE_CONFIG,
} from '@/lib/calculations'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function SimulationForm() {
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(isEditing)

  // Campos do formulário
  const [clientName, setClientName] = useState('')
  const [clientDocument, setClientDocument] = useState('')
  const [propertyName, setPropertyName] = useState('')
  const [unitDescription, setUnitDescription] = useState('')
  const [propertyValueRaw, setPropertyValueRaw] = useState<string>('480000')
  const [amountPaidRaw, setAmountPaidRaw] = useState<string>('240000')
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>(
    new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  )
  const [contractNumber, setContractNumber] = useState('')
  const [developerName, setDeveloperName] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<SimulationStatus>('apresentado')
  const [simulationType, setSimulationType] = useState<SimulationType>('rescisao_contratual')

  // Carregar dados existentes no caso de edição
  useEffect(() => {
    if (isEditing && id) {
      const fetchRecord = async () => {
        try {
          const record = await getSimulationById(id)
          setClientName(record.client_name || '')
          setClientDocument(record.client_document || '')
          setPropertyName(record.property_name || '')
          setUnitDescription(record.unit_description || '')
          setPropertyValueRaw(String(record.property_value || ''))
          setAmountPaidRaw(String(record.amount_paid || ''))

          if (record.expected_delivery_date) {
            const dateOnly = record.expected_delivery_date.split('T')[0].split(' ')[0]
            setExpectedDeliveryDate(dateOnly)
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
          toast({
            variant: 'destructive',
            title: 'Erro ao carregar simulação',
            description: 'Não foi possível carregar os dados desta simulação.',
          })
          navigate('/')
        } finally {
          setInitialLoading(false)
        }
      }
      fetchRecord()
    }
  }, [id, isEditing, navigate, toast])

  // Cálculos reativos em tempo real
  const calcResults = useMemo(() => {
    return calculateLegalCosts(propertyValueRaw, amountPaidRaw, simulationType)
  }, [propertyValueRaw, amountPaidRaw, simulationType])

  // Status de atraso contratual da obra
  const delayInfo = useMemo(() => {
    return getDeliveryDelayStatus(expectedDeliveryDate)
  }, [expectedDeliveryDate])

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

    const propVal = sanitizeNumber(propertyValueRaw)
    const paidVal = sanitizeNumber(amountPaidRaw)

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
      const errorMsg = err instanceof Error ? err.message : 'Falha ao salvar'
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: errorMsg || 'Verifique sua conexão com o banco de dados.',
      })
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
    setPropertyValueRaw('480000')
    setAmountPaidRaw('240000')
    setContractNumber('CTR-8891/2022')
    setDeveloperName('Cyrela / Construtora Metropolitana SPE')
    setNotes(
      'Atraso superior a 6 meses. Cliente busca rescisão contratual com devolução integral dos valores e aplicação da multa de 50%.',
    )
    setSimulationType('rescisao_contratual')
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
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-semibold text-slate-400">
                    R$
                  </span>
                  <Input
                    id="property_value"
                    type="number"
                    step="any"
                    min="0"
                    required
                    placeholder="Ex: 480000.00"
                    value={propertyValueRaw}
                    onChange={(e) => setPropertyValueRaw(e.target.value)}
                    className="pl-10 text-base font-mono font-semibold h-11 border-slate-300 dark:border-slate-700"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Valor total da compra constante no Instrumento Particular de Promessa de Compra e
                  Venda.
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
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-semibold text-emerald-600">
                    R$
                  </span>
                  <Input
                    id="amount_paid"
                    type="number"
                    step="any"
                    min="0"
                    required
                    placeholder="Ex: 240000.00"
                    value={amountPaidRaw}
                    onChange={(e) => setAmountPaidRaw(e.target.value)}
                    className="pl-10 text-base font-mono font-semibold h-11 border-emerald-300 dark:border-emerald-800 focus-visible:ring-emerald-500"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">
                    Soma de entrada, parcelas mensais, balões e chaves quitadas.
                  </span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {formatPercentBRL(calcResults.paidPercentage)} do imóvel quitado
                  </span>
                </div>
              </div>

              {/* Data Prevista de Entrega */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="expected_delivery_date"
                    className="text-xs font-bold text-slate-800 dark:text-slate-200"
                  >
                    Data prevista de entrega das chaves no contrato *
                  </Label>
                  <span className="text-[11px] text-muted-foreground">Cláusula de prazo</span>
                </div>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="expected_delivery_date"
                    type="date"
                    required
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    className="pl-9 h-11"
                  />
                </div>
                {expectedDeliveryDate && (
                  <div
                    className={`mt-1.5 p-2.5 rounded-lg text-xs flex items-center gap-2 border ${
                      delayInfo.isDelayed
                        ? 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                        : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
                    }`}
                  >
                    {delayInfo.isDelayed ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    <span className="font-medium">{delayInfo.text}</span>
                  </div>
                )}
              </div>
            </CardContent>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
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

                <div className="space-y-1.5 sm:col-span-1">
                  <Label htmlFor="notes" className="text-xs font-semibold">
                    Observações Internas do Caso
                  </Label>
                  <Input
                    id="notes"
                    placeholder="Ex: Carência ultrapassada, cliente busca rescisão total..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="h-10 text-xs"
                  />
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

              {/* Exibição condicional da rubrica aplicável conforme a escolha */}
              {simulationType === 'indenizacao_atraso' ? (
                /* Item 1: 1% do valor efetivamente pago (Indenização por Atraso) */
                <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 space-y-1 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                        1
                      </span>
                      1% do valor efetivamente pago (Atraso)
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {formatCurrencyBRL(calcResults.amountPaid)} × 1%
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-[11px] text-muted-foreground">
                      Indenização mensal pelo atraso na entrega
                    </span>
                    <span className="text-base font-bold font-mono text-blue-700 dark:text-blue-300">
                      {formatCurrencyBRL(calcResults.onePercentAmountPaid)}
                    </span>
                  </div>
                </div>
              ) : (
                /* Item 2: Multa de 50% sobre o valor efetivamente pago (Rescisão Contratual) */
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

              {/* Item Custas Judiciais (3%) - Calculada conforme regra da modalidade */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center text-[10px] font-bold">
                      2
                    </span>
                    Custas judiciais (3%)
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    3% × {formatCurrencyBRL(calcResults.judicialCostsBase)}
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
                      : '1% Pago (Atraso)'}
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
                      = Apenas a multa de 50% ({formatCurrencyBRL(calcResults.fineFiftyPercent)}) •
                      O 1% por atraso não é aplicável.
                    </>
                  ) : (
                    <>
                      = Apenas o 1% do valor pago (
                      {formatCurrencyBRL(calcResults.onePercentAmountPaid)}) • A multa de 50% não é
                      devida.
                    </>
                  )}{' '}
                  Custas judiciais ({formatCurrencyBRL(calcResults.judicialCosts)}) constituem
                  despesa isolada.
                </p>
              </div>

              {/* Potencial de Restituição Global ao Comprador */}
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    {simulationType === 'rescisao_contratual'
                      ? 'Potencial de Restituição (100% Pago + Multa 50%)'
                      : 'Expectativa Global (Valor Pago + 1% Atraso)'}
                  </span>
                  <span className="text-xs font-bold font-mono text-emerald-700 dark:text-emerald-300">
                    {formatCurrencyBRL(calcResults.potentialRecoveryTotal)}
                  </span>
                </div>
                <p className="text-[10px] text-emerald-800/80 dark:text-emerald-400 mt-1">
                  {simulationType === 'rescisao_contratual'
                    ? `100% do valor pago (${formatCurrencyBRL(calcResults.amountPaid)}) + 50% de multa (${formatCurrencyBRL(calcResults.fineFiftyPercent)}).`
                    : `Valor pago (${formatCurrencyBRL(calcResults.amountPaid)}) + indenização de 1% (${formatCurrencyBRL(calcResults.onePercentAmountPaid)}).`}
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
