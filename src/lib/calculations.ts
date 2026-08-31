import { CalculationBreakdown } from '@/types/simulation'

/**
 * Realiza a computação centralizada e unificada dos cálculos judiciais do contrato imobiliário:
 *
 * 1. 1% do valor efetivamente pago = valor pago × 0,01 (ex.: R$ 240.000,00 × 1% = R$ 2.400,00)
 * 2. Custas judiciais = valor do imóvel × 0,03 (ex.: R$ 480.000,00 × 3% = R$ 14.400,00)
 * 3. Multa de 50% sobre o valor efetivamente pago = valor pago × 0,50 (ex.: R$ 240.000,00 × 50% = R$ 120.000,00)
 * 4. Total estimado = soma dos três itens acima (ex.: R$ 136.800,00)
 */
export function calculateLegalCosts(
  propertyValueInput: number | string | undefined | null,
  amountPaidInput: number | string | undefined | null,
): CalculationBreakdown {
  const propertyValue = sanitizeNumber(propertyValueInput)
  const amountPaid = sanitizeNumber(amountPaidInput)

  const onePercentAmountPaid = roundToTwoDecimals(amountPaid * 0.01)
  const judicialCosts = roundToTwoDecimals(propertyValue * 0.03)
  const fineFiftyPercent = roundToTwoDecimals(amountPaid * 0.5)
  const estimatedTotal = roundToTwoDecimals(onePercentAmountPaid + judicialCosts + fineFiftyPercent)

  const paidPercentage = propertyValue > 0 ? (amountPaid / propertyValue) * 100 : 0
  const potentialRecoveryTotal = roundToTwoDecimals(amountPaid + fineFiftyPercent)

  return {
    propertyValue,
    amountPaid,
    paidPercentage,
    onePercentAmountPaid,
    judicialCosts,
    fineFiftyPercent,
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
