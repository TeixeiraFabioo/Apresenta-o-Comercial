import {
  CalculationBreakdown,
  CalculationOptions,
  CorrectionIndex,
  SimulationType,
} from '@/types/simulation'

export const CORRECTION_INDEX_LABELS: Record<CorrectionIndex, { label: string; fullName: string }> =
  {
    inpc: { label: 'INPC', fullName: 'Índice Nacional de Preços ao Consumidor (IBGE)' },
    igpm: { label: 'IGP-M', fullName: 'Índice Geral de Preços do Mercado (FGV)' },
    ipca_e: {
      label: 'IPCA-E',
      fullName: 'Índice Nacional de Preços ao Consumidor Amplo Especial (IBGE)',
    },
  }

/**
 * Realiza a computação centralizada e unificada dos cálculos judiciais do contrato imobiliário:
 *
 * Regras de negócio:
 * 1. "Se aplicável 1% pelo atraso, a multa de 50% não é devida" (e vice-versa).
 * 2. 1% AO MÊS REAL:
 *    • Valor = 1% × quantidade de meses de atraso × valor efetivamente pago.
 *    • Meses de atraso apurados entre a data prevista de entrega e a data de referência.
 * 3. CARÊNCIA DE 180 DIAS:
 *    • Atrasos inferiores a 180 dias ainda não geram direito ao 1% por atraso (valor = 0).
 *    • Flag indicando carência ativa e dias restantes.
 * 4. DATA DE REFERÊNCIA:
 *    • Atraso e correção calculados contra data de referência fixa (ou hoje se não informada).
 * 5. CUSTAS JUDICIAIS AJUSTÁVEIS:
 *    • Alíquota configurável (padrão 3%).
 *    • Despesa processual isolada que NÃO compõe o total a receber pelo cliente.
 * 6. CORREÇÃO MONETÁRIA / JUROS (opcional):
 *    • Quando ativa, calcula (taxa mensal × meses decorridos × base da rubrica principal)
 *      ou juros simples mensais estimados entre data inicial e data de referência.
 *    • Entra no total estimado a receber pelo cliente.
 */
export function calculateLegalCosts(
  propertyValueInput: number | string | undefined | null,
  amountPaidInput: number | string | undefined | null,
  simulationType: SimulationType = 'rescisao_contratual',
  options?: CalculationOptions,
): CalculationBreakdown {
  const propertyValue = sanitizeNumber(propertyValueInput)
  const amountPaid = sanitizeNumber(amountPaidInput)
  const type: SimulationType =
    simulationType === 'indenizacao_atraso' ? 'indenizacao_atraso' : 'rescisao_contratual'

  // Alíquota de custas (padrão 3%)
  const parsedCustasRate =
    options?.custasRate !== undefined && options?.custasRate !== null
      ? sanitizeNumber(options.custasRate)
      : 3
  const custasRate = parsedCustasRate >= 0 ? parsedCustasRate : 3

  // Datas e atraso
  const delayInfo = getDeliveryDelayStatus(options?.expectedDeliveryDate, options?.referenceDate)

  const delayMonths = delayInfo.monthsDiff > 0 ? delayInfo.monthsDiff : 0
  const delayDays = delayInfo.daysDiff > 0 ? delayInfo.daysDiff : 0
  const isWithinGracePeriod = delayInfo.isWithinGracePeriod
  const daysToGraceEnd = delayInfo.daysToGraceEnd

  // 1% ao mês REAL sobre valor efetivamente pago
  // Aplica apenas se modalidade for 'indenizacao_atraso' E carência de 180 dias tiver sido superada
  let onePercentAmountPaid = 0
  let fineFiftyPercent = 0
  let judicialCostsBase = 0

  if (type === 'indenizacao_atraso') {
    if (!isWithinGracePeriod && delayMonths > 0) {
      onePercentAmountPaid = roundToTwoDecimals(amountPaid * 0.01 * delayMonths)
    } else {
      onePercentAmountPaid = 0
    }
    fineFiftyPercent = 0
    judicialCostsBase = amountPaid
  } else {
    // Rescisão: multa de 50% sobre valor pago, 1% por atraso = 0
    onePercentAmountPaid = 0
    fineFiftyPercent = roundToTwoDecimals(amountPaid * 0.5)
    judicialCostsBase = roundToTwoDecimals(amountPaid + fineFiftyPercent)
  }

  // Base principal que serve de referência para o cliente (antes da correção monetária)
  const principalDue = type === 'indenizacao_atraso' ? onePercentAmountPaid : fineFiftyPercent

  // Correção Monetária / Juros Opcional
  const correctionEnabled = Boolean(options?.correctionEnabled)
  const rawIndex = options?.correctionIndex
  const correctionIndex: CorrectionIndex =
    rawIndex === 'igpm' || rawIndex === 'ipca_e' ? rawIndex : 'inpc'
  const parsedCorrectionRate =
    options?.correctionRate !== undefined && options?.correctionRate !== null
      ? sanitizeNumber(options.correctionRate)
      : 1
  const correctionRate = parsedCorrectionRate >= 0 ? parsedCorrectionRate : 1

  // Data inicial da correção monetária (se não informada, usa data prevista de entrega)
  const correctionStartDate =
    options?.correctionStartDate || options?.expectedDeliveryDate || undefined

  let correctionMonths = 0
  let monetaryCorrectionAmount = 0

  if (correctionEnabled && principalDue > 0) {
    correctionMonths = computeMonthsBetween(correctionStartDate, options?.referenceDate)
    if (correctionMonths > 0) {
      // Fórmula simples e transparente documentada:
      // Juros simples mensais estimados = Valor Devido × (Taxa Mensal % / 100) × Meses Decorridos
      const rateDecimal = correctionRate / 100
      monetaryCorrectionAmount = roundToTwoDecimals(principalDue * rateDecimal * correctionMonths)
    }
  }

  const judicialCosts = roundToTwoDecimals(judicialCostsBase * (custasRate / 100))
  const paidPercentage = propertyValue > 0 ? (amountPaid / propertyValue) * 100 : 0

  // Total estimado a receber: rubrica devida + correção monetária (custas são despesa isolada)
  const estimatedTotal = roundToTwoDecimals(principalDue + monetaryCorrectionAmount)

  // Potencial de recuperação global estimado:
  // Rescisão: valor pago + multa 50% + correção
  // Atraso: valor pago + 1% atraso + correção
  const potentialRecoveryTotal = roundToTwoDecimals(
    amountPaid + principalDue + monetaryCorrectionAmount,
  )

  const referenceDateString =
    getNormalizedDateString(options?.referenceDate) || new Date().toISOString()

  return {
    simulationType: type,
    propertyValue,
    amountPaid,
    paidPercentage,
    delayMonths,
    delayDays,
    isWithinGracePeriod,
    daysToGraceEnd,
    onePercentAmountPaid,
    fineFiftyPercent,
    custasRate,
    judicialCostsBase,
    judicialCosts,
    correctionEnabled,
    correctionIndex,
    correctionRate,
    correctionMonths,
    correctionStartDate: getNormalizedDateString(correctionStartDate),
    referenceDate: referenceDateString,
    monetaryCorrectionAmount,
    estimatedTotal,
    potentialRecoveryTotal,
  }
}

/**
 * Converte Date ou string para YYYY-MM-DD normalizado
 */
export function getNormalizedDateString(dateVal?: string | Date | null): string {
  if (!dateVal) return ''
  try {
    if (typeof dateVal === 'string') {
      const trimmed = dateVal.trim()
      if (trimmed.includes('T')) return trimmed.split('T')[0]
      if (trimmed.includes(' ')) return trimmed.split(' ')[0]
      return trimmed
    }
    const y = dateVal.getFullYear()
    const m = String(dateVal.getMonth() + 1).padStart(2, '0')
    const d = String(dateVal.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  } catch (_) {
    return ''
  }
}

/**
 * Calcula quantidade inteira de meses decorridos entre duas datas
 */
export function computeMonthsBetween(
  startDateStr?: string | Date | null,
  endDateStr?: string | Date | null,
): number {
  if (!startDateStr) return 0
  try {
    const start = parseDateLocal(startDateStr)
    const end = endDateStr ? parseDateLocal(endDateStr) : new Date()
    if (!start || !end) return 0
    start.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)

    const diffTime = end.getTime() - start.getTime()
    if (diffTime <= 0) return 0
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return Math.floor(diffDays / 30.4375)
  } catch (_) {
    return 0
  }
}

function parseDateLocal(d: string | Date): Date | null {
  if (d instanceof Date) return isNaN(d.getTime()) ? null : d
  if (typeof d !== 'string') return null
  const dateOnly = d.split('T')[0].split(' ')[0]
  const parts = dateOnly.split('-')
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1
    const day = parseInt(parts[2], 10)
    return new Date(year, month, day, 12, 0, 0)
  }
  const parsed = new Date(d)
  return isNaN(parsed.getTime()) ? null : parsed
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
 * Retorna se a entrega já está em atraso com base na data prevista e na data de referência do cálculo.
 * Trata o período de carência legal de 180 dias.
 */
export function getDeliveryDelayStatus(
  expectedDateStr: string | Date | undefined | null,
  referenceDateStr?: string | Date | null,
): {
  isDelayed: boolean
  daysDiff: number
  monthsDiff: number
  isWithinGracePeriod: boolean
  daysToGraceEnd: number
  text: string
  graceWarningText?: string
} {
  if (!expectedDateStr) {
    return {
      isDelayed: false,
      daysDiff: 0,
      monthsDiff: 0,
      isWithinGracePeriod: false,
      daysToGraceEnd: 180,
      text: 'Data prevista não informada',
    }
  }

  try {
    const expected = parseDateLocal(expectedDateStr)
    const ref = referenceDateStr ? parseDateLocal(referenceDateStr) : new Date()

    if (!expected || !ref) {
      return {
        isDelayed: false,
        daysDiff: 0,
        monthsDiff: 0,
        isWithinGracePeriod: false,
        daysToGraceEnd: 180,
        text: 'Data inválida',
      }
    }

    expected.setHours(0, 0, 0, 0)
    ref.setHours(0, 0, 0, 0)

    const diffTime = ref.getTime() - expected.getTime()
    const daysDiff = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const monthsDiff = Math.floor(daysDiff / 30.4375)

    if (daysDiff > 0) {
      if (daysDiff < 180) {
        const daysRemaining = 180 - daysDiff
        return {
          isDelayed: true,
          daysDiff,
          monthsDiff,
          isWithinGracePeriod: true,
          daysToGraceEnd: daysRemaining,
          text: `Atraso de ${daysDiff} dias (${monthsDiff} meses) — Dentro da carência de 180 dias`,
          graceWarningText: `O atraso (${daysDiff} dias) ainda está dentro do período de carência de 180 dias (faltam ${daysRemaining} dias). A indenização por atraso ainda não é devida.`,
        }
      }

      return {
        isDelayed: true,
        daysDiff,
        monthsDiff,
        isWithinGracePeriod: false,
        daysToGraceEnd: 0,
        text: `Atraso de ${daysDiff} dias (${monthsDiff} meses) — Ultrapassou a carência de 180 dias`,
      }
    } else if (daysDiff === 0) {
      return {
        isDelayed: false,
        daysDiff: 0,
        monthsDiff: 0,
        isWithinGracePeriod: true,
        daysToGraceEnd: 180,
        text: 'Prazo vence na data de referência',
        graceWarningText:
          'O imóvel está no prazo contratual. A carência de 180 dias inicia a partir desta data.',
      }
    } else {
      const remainingDays = Math.abs(daysDiff)
      return {
        isDelayed: false,
        daysDiff,
        monthsDiff,
        isWithinGracePeriod: true,
        daysToGraceEnd: 180 + remainingDays,
        text: `Dentro do prazo contratual (faltam ${remainingDays} dias para a entrega prevista)`,
        graceWarningText:
          'Contrato ainda vigente dentro do prazo estipulado. A indenização de 1% não é devida.',
      }
    }
  } catch (_) {
    return {
      isDelayed: false,
      daysDiff: 0,
      monthsDiff: 0,
      isWithinGracePeriod: false,
      daysToGraceEnd: 180,
      text: 'Prazo contratual',
    }
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
    description:
      'Aplica 1% ao mês sobre o valor efetivamente pago (multa de 50% não é devida). Carência de 180 dias.',
    clientTotalExplanation: '1% ao mês de atraso sobre o valor efetivamente pago',
    ruleExplanation:
      'Na Indenização por Atraso, aplica-se a verba de 1% ao mês de atraso sobre o valor quitado (após superada a carência de 180 dias). A multa de 50% não é devida.',
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
