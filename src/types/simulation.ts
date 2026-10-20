/**
 * Tipos centrais da aplicação de Planilha de Cálculos de Custas Judiciais
 */

export type SimulationStatus =
  | 'em_negociacao'
  | 'apresentado'
  | 'contrato_fechado'
  | 'em_andamento'
  | 'arquivado'

export type SimulationType = 'rescisao_contratual' | 'indenizacao_atraso'

export type CorrectionIndex = 'inpc' | 'igpm' | 'ipca_e'

export interface SimulationRecord {
  id: string
  user: string
  client_name: string
  client_document?: string
  property_name: string
  unit_description?: string
  property_value: number
  amount_paid: number
  expected_delivery_date: string // ISO date string
  contract_number?: string
  developer_name?: string
  notes?: string
  status: SimulationStatus
  simulation_type?: SimulationType
  reference_date?: string // ISO date string
  custas_rate?: number
  correction_enabled?: boolean
  correction_index?: CorrectionIndex
  correction_rate?: number
  correction_start_date?: string // ISO date string
  created: string
  updated: string
}

export interface SimulationFormData {
  client_name: string
  client_document?: string
  property_name: string
  unit_description?: string
  property_value: number
  amount_paid: number
  expected_delivery_date: string
  contract_number?: string
  developer_name?: string
  notes?: string
  status?: SimulationStatus
  simulation_type?: SimulationType
  reference_date?: string
  custas_rate?: number
  correction_enabled?: boolean
  correction_index?: CorrectionIndex
  correction_rate?: number
  correction_start_date?: string
}

export interface CalculationOptions {
  /** Data prevista de entrega (ISO ou YYYY-MM-DD) */
  expectedDeliveryDate?: string | Date | null
  /** Data de referência do cálculo (se omitida, usa hoje) */
  referenceDate?: string | Date | null
  /** Alíquota de custas judiciais em % (padrão 3%) */
  custasRate?: number | string | null
  /** Se a correção monetária está habilitada */
  correctionEnabled?: boolean
  /** Índice escolhido */
  correctionIndex?: CorrectionIndex | string | null
  /** Taxa mensal em % (padrão 1%) */
  correctionRate?: number | string | null
  /** Data inicial da correção monetária */
  correctionStartDate?: string | Date | null
}

export interface CalculationBreakdown {
  /** Tipo de simulação / ação selecionada */
  simulationType: SimulationType
  /** Valor do imóvel comprado */
  propertyValue: number
  /** Valor efetivamente pago pelo comprador */
  amountPaid: number
  /** Percentual pago sobre o valor total do imóvel (ex.: 50%) */
  paidPercentage: number
  /** Quantidade de meses de atraso apurados */
  delayMonths: number
  /** Quantidade de dias de atraso */
  delayDays: number
  /** Se o atraso está dentro da carência legal de 180 dias */
  isWithinGracePeriod: boolean
  /** Dias restantes para esgotar o prazo de carência de 180 dias */
  daysToGraceEnd: number
  /** 1% ao mês × meses de atraso × valor pago (0 se carência de 180 dias não superada ou rescisão) */
  onePercentAmountPaid: number
  /** Multa de 50% sobre o valor pago = valor pago × 0,50 (aplicável se rescisão contratual) */
  fineFiftyPercent: number
  /** Alíquota de custas aplicada em % (ex: 3) */
  custasRate: number
  /** Base de incidência das custas judiciais */
  judicialCostsBase: number
  /** Custas judiciais = (custasRate)% sobre a base */
  judicialCosts: number
  /** Correção monetária habilitada */
  correctionEnabled: boolean
  /** Índice de correção selecionado */
  correctionIndex: CorrectionIndex
  /** Taxa mensal de correção/juros (%) */
  correctionRate: number
  /** Meses aplicados na correção monetária */
  correctionMonths: number
  /** Data inicial considerada na correção */
  correctionStartDate?: string
  /** Data de referência considerada no cálculo */
  referenceDate: string
  /** Valor apurado da correção monetária/juros */
  monetaryCorrectionAmount: number
  /** Total estimado a receber pelo cliente (rubrica principal + correção quando ativa; sem custas) */
  estimatedTotal: number
  /** Potencial de recuperação financeira estimada */
  potentialRecoveryTotal: number
}
