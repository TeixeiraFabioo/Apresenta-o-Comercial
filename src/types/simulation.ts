/**
 * Tipos centrais da aplicação de Planilha de Cálculos de Custas Judiciais
 */

export type SimulationStatus =
  | 'em_negociacao'
  | 'apresentado'
  | 'contrato_fechado'
  | 'em_andamento'
  | 'arquivado'

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
}

export interface CalculationBreakdown {
  /** Valor do imóvel comprado */
  propertyValue: number
  /** Valor efetivamente pago pelo comprador */
  amountPaid: number
  /** Percentual pago sobre o valor total do imóvel (ex.: 50%) */
  paidPercentage: number
  /** 1% do valor efetivamente pago = valor pago × 0,01 */
  onePercentAmountPaid: number
  /** Custas judiciais = valor do imóvel × 0,03 (3%) */
  judicialCosts: number
  /** Multa de 50% sobre o valor efetivamente pago = valor pago × 0,50 */
  fineFiftyPercent: number
  /** Total estimado da operação = soma dos 3 itens acima */
  estimatedTotal: number
  /** Potencial de recuperação financeira estimada (Restituição integral + Multa) */
  potentialRecoveryTotal: number
}
