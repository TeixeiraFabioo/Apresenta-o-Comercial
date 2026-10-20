import * as XLSX from 'xlsx'
import { SimulationRecord } from '@/types/simulation'
import {
  calculateLegalCosts,
  formatDateBRL,
  STATUS_LABELS,
  SIMULATION_TYPE_CONFIG,
} from '@/lib/calculations'

/**
 * Exporta uma lista de simulações para arquivo .xlsx com fórmulas vivas do Excel.
 *
 * Colunas na planilha:
 * A: Cliente/Caso (título)
 * B: Modalidade
 * C: Status
 * D: Valor do imóvel (R$)
 * E: Valor efetivamente pago (R$)
 * F: Data prevista de entrega
 * G: Data de referência
 * H: Meses de atraso
 * I: 1% ao mês (valor) -> Fórmula viva
 * J: Multa 50% -> Fórmula viva
 * K: Correção monetária (se ativa) -> Fórmula viva
 * L: Alíquota de custas (%)
 * M: Custas judiciais (valor) -> Fórmula viva
 * N: Total a receber -> Fórmula viva
 */
export function exportSimulationsToExcel(
  simulations: SimulationRecord[],
  fileName = 'simulacoes_custas_judiciais.xlsx',
): void {
  // Cabeçalhos das colunas
  const headers = [
    'Cliente / Caso',
    'Modalidade',
    'Status',
    'Valor do Imóvel (R$)',
    'Valor Pago (R$)',
    'Data Prevista de Entrega',
    'Data de Referência',
    'Meses de Atraso',
    '1% ao Mês (R$)',
    'Multa 50% (R$)',
    'Correção Monetária (R$)',
    'Alíquota de Custas (%)',
    'Custas Judiciais (R$)',
    'Total a Receber (R$)',
  ]

  // Monta linhas de dados
  const rows: (string | number | { f: string; v?: number; z?: string })[][] = []

  // Linha 1 = Cabeçalho (index 0 no array, row 1 no Excel)
  // Linhas de dados começam no row 2 no Excel (rowIdx = 2, 3, 4, ...)
  simulations.forEach((sim, index) => {
    const excelRow = index + 2 // 1-based index na planilha
    const calc = calculateLegalCosts(sim.property_value, sim.amount_paid, sim.simulation_type, {
      expectedDeliveryDate: sim.expected_delivery_date,
      referenceDate: sim.reference_date,
      custasRate: sim.custas_rate,
      correctionEnabled: sim.correction_enabled,
      correctionIndex: sim.correction_index,
      correctionRate: sim.correction_rate,
      correctionStartDate: sim.correction_start_date,
    })

    const isDelay = sim.simulation_type === 'indenizacao_atraso'
    const statusLabel = STATUS_LABELS[sim.status]?.label || sim.status || 'Em Negociação'
    const typeLabel =
      SIMULATION_TYPE_CONFIG[sim.simulation_type || 'rescisao_contratual']?.shortLabel ||
      'Rescisão Contratual'

    const expectedDate = formatDateBRL(sim.expected_delivery_date)
    const referenceDate = formatDateBRL(sim.reference_date || calc.referenceDate)
    const custasRateDec = (calc.custasRate || 3) / 100 // Ex: 0.03
    const correctionRateDec = (calc.correctionRate || 1) / 100 // Ex: 0.01

    /**
     * Mapeamento de Colunas na linha excelRow:
     * A: Cliente (string)
     * B: Modalidade (string)
     * C: Status (string)
     * D: Valor do imóvel (number)
     * E: Valor pago (number)
     * F: Data prevista entrega (string)
     * G: Data referência (string)
     * H: Meses atraso (number)
     * I: 1% ao mês -> Fórmula:
     *    Se modalidade atraso: =IF(B{row}="Indenização por Atraso", E{row}*0.01*H{row}, 0)
     * J: Multa 50% -> Fórmula:
     *    Se modalidade rescisão: =IF(B{row}="Rescisão Contratual", E{row}*0.5, 0)
     * K: Correção monetária -> Fórmula:
     *    Se ativa: =(I{row}+J{row})*{correctionRateDec}*{calc.correctionMonths}
     *    Se inativa: 0
     * L: Alíquota custas (%) (number percentual)
     * M: Custas judiciais -> Fórmula:
     *    Se atraso: =E{row}*(L{row}/100)
     *    Se rescisão: =(E{row}+J{row})*(L{row}/100)
     *    Unificada: =IF(B{row}="Rescisão Contratual", (E{row}+J{row})*(L{row}/100), E{row}*(L{row}/100))
     * N: Total a receber -> Fórmula:
     *    =I{row}+J{row}+K{row}
     */

    // Célula I (1% ao mês)
    const formulaOnePercent = isDelay
      ? `IF(B${excelRow}="Indenização por Atraso", E${excelRow}*0.01*H${excelRow}, 0)`
      : `0`

    // Célula J (Multa 50%)
    const formulaFineFifty = !isDelay
      ? `IF(B${excelRow}="Rescisão Contratual", E${excelRow}*0.5, 0)`
      : `0`

    // Célula K (Correção monetária)
    const formulaCorrection = calc.correctionEnabled
      ? `(I${excelRow}+J${excelRow})*${correctionRateDec}*${calc.correctionMonths}`
      : `0`

    // Célula M (Custas judiciais)
    const formulaCustas = `IF(B${excelRow}="Rescisão Contratual", (E${excelRow}+J${excelRow})*(L${excelRow}/100), E${excelRow}*(L${excelRow}/100))`

    // Célula N (Total a receber)
    const formulaTotal = `I${excelRow}+J${excelRow}+K${excelRow}`

    const rowData = [
      sim.client_name || 'Sem nome', // A
      typeLabel, // B
      statusLabel, // C
      calc.propertyValue, // D
      calc.amountPaid, // E
      expectedDate, // F
      referenceDate, // G
      calc.delayMonths, // H
      { f: formulaOnePercent, v: calc.onePercentAmountPaid }, // I
      { f: formulaFineFifty, v: calc.fineFiftyPercent }, // J
      { f: formulaCorrection, v: calc.monetaryCorrectionAmount }, // K
      calc.custasRate, // L
      { f: formulaCustas, v: calc.judicialCosts }, // M
      { f: formulaTotal, v: calc.estimatedTotal }, // N
    ]

    rows.push(rowData)
  })

  // Cria a planilha combinando cabeçalho e linhas
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

  // Formato BRL para as células numéricas monetárias
  // Formato Excel padrão de moeda BRL: "R$ #,##0.00"
  const BRL_FORMAT = '"R$"\\ #,##0.00'
  const PERCENT_FORMAT = '0.0"%"'

  // Itera sobre as células de dados para aplicar formatações
  simulations.forEach((_, index) => {
    const r = index + 2 // Linha 2 em diante (1-based)
    // D (Valor imóvel)
    const cellD = ws[`D${r}`]
    if (cellD) cellD.z = BRL_FORMAT
    // E (Valor pago)
    const cellE = ws[`E${r}`]
    if (cellE) cellE.z = BRL_FORMAT
    // I (1% ao mês)
    const cellI = ws[`I${r}`]
    if (cellI) cellI.z = BRL_FORMAT
    // J (Multa 50%)
    const cellJ = ws[`J${r}`]
    if (cellJ) cellJ.z = BRL_FORMAT
    // K (Correção)
    const cellK = ws[`K${r}`]
    if (cellK) cellK.z = BRL_FORMAT
    // L (Alíquota custas %)
    const cellL = ws[`L${r}`]
    if (cellL) cellL.z = PERCENT_FORMAT
    // M (Custas)
    const cellM = ws[`M${r}`]
    if (cellM) cellM.z = BRL_FORMAT
    // N (Total a receber)
    const cellN = ws[`N${r}`]
    if (cellN) cellN.z = BRL_FORMAT
  })

  // Ajusta larguras das colunas
  ws['!cols'] = [
    { wch: 28 }, // Cliente / Caso
    { wch: 22 }, // Modalidade
    { wch: 22 }, // Status
    { wch: 20 }, // Valor do Imóvel
    { wch: 20 }, // Valor Pago
    { wch: 18 }, // Data Prevista
    { wch: 18 }, // Data Referência
    { wch: 16 }, // Meses Atraso
    { wch: 18 }, // 1% ao Mês
    { wch: 18 }, // Multa 50%
    { wch: 22 }, // Correção Monetária
    { wch: 18 }, // Alíquota Custas
    { wch: 20 }, // Custas Judiciais
    { wch: 22 }, // Total a Receber
  ]

  // Monta o workbook e efetua o download no navegador
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Simulações de Custas')
  XLSX.writeFile(wb, fileName)
}
