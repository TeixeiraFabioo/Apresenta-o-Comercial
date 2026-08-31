import { CalculationBreakdown, SimulationType } from '@/types/simulation'

/**
 * Realiza a computação centralizada e unificada dos cálculos judiciais do contrato imobiliário:
 *
 * Regra de negócio: "Se aplicável 1% pelo atraso, a multa de 50% não é devida."
 *
 * - "indenizacao_atraso" (Indenização por Atraso):
 *    • Aplica o cálculo de 1% do valor efetivamente pago e NÃO aplica a multa de 50% (0).
 *    • Total a receber pelo cliente = apenas o 1% do valor efetivamente pago.
 *    • Custas judiciais = 3% sobre o valor efetivamente pago (já que a multa não é devida).
 *    • Potencial de recuperação = valor efetivamente pago + 1% por atraso.
 *
 * - "rescisao_contratual" (Rescisão Contratual):
 *    • Aplica a multa de 50% sobre o valor efetivamente pago e NÃO aplica o 1% por atraso (0).
 *    • Total a receber pelo cliente = apenas a multa de 50% sobre o valor efetivamente pago.
 *    • Custas judiciais = 3% sobre (valor efetivamente pago + multa de 50%).
 *    • Potencial de recuperação = restituição integral (100% pago) + multa de 50%.
 *
 * * Em ambos os casos, as custas judiciais continuam sendo uma despesa isolada que NÃO entra
 *   no "TOTAL ESTIMADO A RECEBER PELO CLIENTE".
 */
export function calculateLegalCosts(
  propertyValueInput: number | string | undefined | null,
  amountPaidInput: number | string | undefined | null,
  simulationType: SimulationType = 'rescisao_contratual',
): CalculationBreakdown {
  const propertyValue = sanitizeNumber(propertyValueInput)
  const amountPaid = sanitizeNumber(amountPaidInput)
  const type: SimulationType =
    simulationType === 'indenizacao_atraso' ? 'indenizacao_atraso' : 'rescisao_contratual'

  const rawOnePercent = roundToTwoDecimals(amountPaid * 0.01)
  const rawFiftyPercent = roundToTwoDecimals(amountPaid * 0.5)

  let onePercentAmountPaid = 0
  let fineFiftyPercent = 0
  let judicialCostsBase = 0
  let estimatedTotal = 0
  let potentialRecoveryTotal = 0

  if (type === 'indenizacao_atraso') {
    // Indenização por Atraso: 1% aplicável, multa 50% NÃO devida
    onePercentAmountPaid = rawOnePercent
    fineFiftyPercent = 0
    // Custas incidem apenas sobre o valor efetivamente pago
    judicialCostsBase = amountPaid
    // Total a receber: apenas o 1% do valor efetivamente pago
    estimatedTotal = onePercentAmountPaid
    potentialRecoveryTotal = roundToTwoDecimals(amountPaid + onePercentAmountPaid)
  } else {
    // Rescisão Contratual: multa 50% aplicável, 1% por atraso NÃO aplicável
    onePercentAmountPaid = 0
    fineFiftyPercent = rawFiftyPercent
    // Custas incidem sobre (valor pago + multa de 50%)
    judicialCostsBase = roundToTwoDecimals(amountPaid + fineFiftyPercent)
    // Total a receber: apenas a multa de 50% sobre o valor efetivamente pago
    estimatedTotal = fineFiftyPercent
    potentialRecoveryTotal = roundToTwoDecimals(amountPaid + fineFiftyPercent)
  }

  const judicialCosts = roundToTwoDecimals(judicialCostsBase * 0.03)
  const paidPercentage = propertyValue > 0 ? (amountPaid / propertyValue) * 100 : 0

  return {
    simulationType: type,
    propertyValue,
    amountPaid,
    paidPercentage,
    onePercentAmountPaid,
    fineFiftyPercent,
    judicialCostsBase,
    judicialCosts,
    estimatedTotal,
    potentialRecoveryTotal,
  }
}

/**
 * Converte entradas numéricas ou strings formatadas para número float limpo
 */
export function sanitizeNumber(value: number | string | undefined | null): number {
  if (value === undefined || value === null) return 0
  if (typeof value === 'number') {
    return isNaN(value) || !isFinite(value) ? 0 : Math.max(0, value)
  }

  // Remove formatações como 'R$', pontos de milhar e substitui vírgula por ponto
  const cleanStr = String(value)
    .replace(/[^\d,-]/g, '')
    .replace(',', '.')

  const parsed = parseFloat(cleanStr)
  return isNaN(parsed) || !isFinite(parsed) ? 0 : Math.max(0, parsed)
}

function roundToTwoDecimals(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100
}

/**
 * Formata um valor numérico para o padrão de moeda brasileiro (BRL - R$)
 * com numerais tabulares alinhados.
 */
export function formatCurrencyBRL(value: number | undefined | null): string {
  const num = typeof value === 'number' && !isNaN(value) ? value : 0
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

/**
 * Formata percentual para padrão pt-BR
 */
export function formatPercentBRL(value: number | undefined | null, decimals = 1): string {
  const num = typeof value === 'number' && !isNaN(value) ? value : 0
  return (
    new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num) + '%'
  )
}

/**
 * Formata data ISO (ex.: "2024-12-15" ou "2024-12-15 00:00:00.000Z") para "DD/MM/AAAA"
 */
export function formatDateBRL(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return 'Não informada'
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
    if (isNaN(d.getTime())) return String(dateStr)

    // Tratamento de fuso para não recuar o dia em strings no formato YYYY-MM-DD
    if (
      typeof dateStr === 'string' &&
      dateStr.includes('-') &&
      !dateStr.includes('T') &&
      !dateStr.includes(' ')
    ) {
      const [year, month, day] = dateStr.split('-')
      if (year && month && day) {
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`
      }
    }

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(d)
  } catch (_) {
    return String(dateStr)
  }
}

/**
 * Retorna se a entrega já está em atraso com base na data prevista
 */
export function getDeliveryDelayStatus(expectedDateStr: string | undefined | null): {
  isDelayed: boolean
  daysDiff: number
  monthsDiff: number
  text: string
} {
  if (!expectedDateStr) {
    return { isDelayed: false, daysDiff: 0, monthsDiff: 0, text: 'Data não informada' }
  }

  try {
    const expected = new Date(expectedDateStr)
    const today = new Date()
    // Normalizar horas
    expected.setUTCHours(0, 0, 0, 0)
    today.setUTCHours(0, 0, 0, 0)

    const diffTime = today.getTime() - expected.getTime()
    const daysDiff = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const monthsDiff = Math.floor(daysDiff / 30.4375)

    if (daysDiff > 0) {
      if (daysDiff > 180) {
        return {
          isDelayed: true,
          daysDiff,
          monthsDiff,
          text: `Atraso de ${daysDiff} dias (${monthsDiff} meses) — Ultrapassou a carência de 180 dias`,
        }
      }
      return {
        isDelayed: true,
        daysDiff,
        monthsDiff,
        text: `Atraso de ${daysDiff} dias (${monthsDiff} meses)`,
      }
    } else if (daysDiff === 0) {
      return { isDelayed: false, daysDiff: 0, monthsDiff: 0, text: 'Prazo vence hoje' }
    } else {
      const remainingDays = Math.abs(daysDiff)
      return {
        isDelayed: false,
        daysDiff,
        monthsDiff,
        text: `Dentro do prazo contratual (restam ${remainingDays} dias)`,
      }
    }
  } catch (_) {
    return { isDelayed: false, daysDiff: 0, monthsDiff: 0, text: 'Prazo contratual' }
  }
}

/**
 * Labels e badges de status
 */
/**
 * Configurações e labels para os tipos de simulação
 */
export const SIMULATION_TYPE_CONFIG: Record<
  SimulationType,
  {
    label: string
    shortLabel: string
    badgeLabel: string
    description: string
    clientTotalExplanation: string
    ruleExplanation: string
    colorClasses: string
  }
> = {
  rescisao_contratual: {
    label: 'Rescisão Contratual',
    shortLabel: 'Rescisão Contratual',
    badgeLabel: 'Rescisão Contratual',
    description:
      'Aplica multa de 50% sobre o valor efetivamente pago (não se aplica o 1% por atraso).',
    clientTotalExplanation: 'Multa de 50% sobre o valor pago',
    ruleExplanation:
      'Na Rescisão Contratual, aplica-se a multa compensatória de 50% sobre o valor quitado. O 1% por atraso não é aplicável.',
    colorClasses:
      'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700',
  },
  indenizacao_atraso: {
    label: 'Indenização por Atraso',
    shortLabel: 'Indenização por Atraso',
    badgeLabel: 'Indenização por Atraso',
    description: 'Aplica 1% ao mês sobre o valor efetivamente pago (multa de 50% não é devida).',
    clientTotalExplanation: '1% do valor efetivamente pago',
    ruleExplanation:
      'Na Indenização por Atraso, aplica-se a verba indenizatória de 1% do valor quitado. A multa rescisória de 50% não é devida.',
    colorClasses:
      'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700',
  },
}

export const STATUS_LABELS: Record<
  string,
  {
    label: string
    variant: 'default' | 'secondary' | 'outline' | 'destructive' | 'success'
    colorClasses: string
  }
> = {
  em_negociacao: {
    label: 'Em Negociação',
    variant: 'secondary',
    colorClasses:
      'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  },
  apresentado: {
    label: 'Apresentado ao Cliente',
    variant: 'outline',
    colorClasses:
      'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
  },
  contrato_fechado: {
    label: 'Contrato Fechado',
    variant: 'default',
    colorClasses:
      'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
  },
  em_andamento: {
    label: 'Ação Distribuída',
    variant: 'default',
    colorClasses:
      'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800',
  },
  arquivado: {
    label: 'Arquivado',
    variant: 'secondary',
    colorClasses:
      'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  },
}
