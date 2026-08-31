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
  /** 1% do valor efetivamente pago = valor pago × 0,01 (aplicável se indenização por atraso) */
  onePercentAmountPaid: number
  /** Multa/Indenização de 50% sobre o valor efetivamente pago = valor pago × 0,50 (aplicável se rescisão contratual) */
  fineFiftyPercent: number
  /** Base de incidência das custas judiciais */
  judicialCostsBase: number
  /** Custas judiciais = 3% sobre a base (pago + multa se rescisão, ou apenas pago se atraso) */
  judicialCosts: number
  /** Total estimado a receber pelo cliente (apenas 1% pago se atraso OU apenas multa 50% se rescisão; sem custas) */
  estimatedTotal: number
  /** Potencial de recuperação financeira estimada */
  potentialRecoveryTotal: number
}
