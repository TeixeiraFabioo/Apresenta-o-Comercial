import pb from '@/lib/pocketbase/client'
import {
  SimulationRecord,
  SimulationFormData,
  StatusHistoryRecord,
  SimulationStatus,
} from '@/types/simulation'

const COLLECTION = 'simulacoes'
const HISTORY_COLLECTION = 'status_history'

/**
 * Obtém a lista de todas as simulações pertencentes ao usuário autenticado,
 * ordenadas da mais recente para a mais antiga.
 */
export async function getSimulations(
  searchQuery?: string,
  userId?: string,
): Promise<SimulationRecord[]> {
  try {
    const currentUserId = userId || pb.authStore.record?.id
    if (!currentUserId) {
      return []
    }

    const filters: string[] = [`user = '${currentUserId}'`]

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().replace(/'/g, "\\'")
      filters.push(
        `(client_name ~ '${q}' || property_name ~ '${q}' || contract_number ~ '${q}' || developer_name ~ '${q}')`,
      )
    }

    const filterString = filters.join(' && ')

    const records = await pb.collection(COLLECTION).getFullList<SimulationRecord>({
      sort: '-created',
      filter: filterString,
    })

    return records
  } catch (error) {
    console.error('Erro ao buscar simulações:', error)
    throw error
  }
}

/**
 * Obtém uma simulação específica pelo ID
 */
export async function getSimulationById(id: string, userId?: string): Promise<SimulationRecord> {
  try {
    const record = await pb.collection(COLLECTION).getOne<SimulationRecord>(id)
    const currentUserId = userId || pb.authStore.record?.id

    if (currentUserId && record.user && record.user !== currentUserId) {
      const notFoundErr = new Error(
        'Esta simulação não foi encontrada ou pertence a outro usuário.',
      )
      ;(notFoundErr as unknown as { status: number }).status = 404
      throw notFoundErr
    }

    return record
  } catch (error) {
    console.error(`Erro ao buscar simulação id ${id}:`, error)
    throw error
  }
}

/**
 * Cria uma nova simulação vinculada ao usuário autenticado
 */
export async function createSimulation(data: SimulationFormData): Promise<SimulationRecord> {
  const currentUserId = pb.authStore.record?.id
  if (!currentUserId) {
    throw new Error('Usuário não autenticado para criar simulação.')
  }

  try {
    // Normaliza datas para formato ISO válido
    const normalizeDate = (d?: string) => {
      if (!d) return undefined
      if (d.includes('T') || d.includes('Z')) return d
      return new Date(`${d}T00:00:00.000Z`).toISOString()
    }

    const payload: Record<string, unknown> = {
      ...data,
      user: currentUserId,
      expected_delivery_date: normalizeDate(data.expected_delivery_date),
      reference_date: normalizeDate(data.reference_date),
      correction_start_date: normalizeDate(data.correction_start_date),
      custas_rate: typeof data.custas_rate === 'number' ? data.custas_rate : 3,
      correction_enabled: Boolean(data.correction_enabled),
      correction_index: data.correction_index || 'inpc',
      correction_rate: typeof data.correction_rate === 'number' ? data.correction_rate : 1,
      status: data.status || 'em_negociacao',
    }

    // Se houver arquivo File para upload, cria via FormData
    let record: SimulationRecord
    if (data.contract_file instanceof File) {
      const formData = new FormData()
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== undefined && v !== null && k !== 'contract_file') {
          formData.append(k, String(v))
        }
      })
      formData.append('contract_file', data.contract_file)
      record = await pb.collection(COLLECTION).create<SimulationRecord>(formData)
    } else {
      record = await pb.collection(COLLECTION).create<SimulationRecord>(payload)
    }

    // Registra histórico inicial de status
    try {
      await pb.collection(HISTORY_COLLECTION).create({
        simulation: record.id,
        user: currentUserId,
        previous_status: '',
        new_status: record.status || 'em_negociacao',
      })
    } catch (hErr) {
      console.warn('Falha ao registrar histórico inicial de status:', hErr)
    }

    return record
  } catch (error) {
    console.error('Erro ao criar simulação:', error)
    throw error
  }
}

/**
 * Atualiza os dados de uma simulação existente
 */
export async function updateSimulation(
  id: string,
  data: Partial<SimulationFormData>,
): Promise<SimulationRecord> {
  const currentUserId = pb.authStore.record?.id
  try {
    // Obtém registro anterior para detectar mudança de status
    let previousRecord: SimulationRecord | null = null
    try {
      previousRecord = await pb.collection(COLLECTION).getOne<SimulationRecord>(id)
    } catch {
      /* intentionally ignored */
    }

    const normalizeDate = (d?: string) => {
      if (!d) return undefined
      if (d.includes('T') || d.includes('Z')) return d
      return new Date(`${d}T00:00:00.000Z`).toISOString()
    }

    const payload: Record<string, unknown> = { ...data }
    if (payload.expected_delivery_date) {
      payload.expected_delivery_date = normalizeDate(payload.expected_delivery_date as string)
    }
    if (payload.reference_date) {
      payload.reference_date = normalizeDate(payload.reference_date as string)
    }
    if (payload.correction_start_date) {
      payload.correction_start_date = normalizeDate(payload.correction_start_date as string)
    }

    let record: SimulationRecord
    if (data.contract_file instanceof File) {
      const formData = new FormData()
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== undefined && v !== null && k !== 'contract_file') {
          formData.append(k, String(v))
        }
      })
      formData.append('contract_file', data.contract_file)
      record = await pb.collection(COLLECTION).update<SimulationRecord>(id, formData)
    } else if (data.contract_file === null) {
      // Remover anexo existente
      payload.contract_file = null
      record = await pb.collection(COLLECTION).update<SimulationRecord>(id, payload)
    } else {
      if (typeof data.contract_file === 'string' && data.contract_file) {
        // mantém arquivo anterior
        delete payload.contract_file
      }
      record = await pb.collection(COLLECTION).update<SimulationRecord>(id, payload)
    }

    // Se o status mudou, registrar na collection status_history
    if (data.status && previousRecord && previousRecord.status !== data.status && currentUserId) {
      try {
        await pb.collection(HISTORY_COLLECTION).create({
          simulation: id,
          user: currentUserId,
          previous_status: previousRecord.status,
          new_status: data.status,
        })
      } catch (hErr) {
        console.warn('Falha ao registrar alteração no histórico de status:', hErr)
      }
    }

    return record
  } catch (error) {
    console.error(`Erro ao atualizar simulação ${id}:`, error)
    throw error
  }
}

/**
 * Arquiva uma simulação (altera status para 'arquivado')
 */
export async function archiveSimulation(id: string): Promise<SimulationRecord> {
  return updateSimulation(id, { status: 'arquivado' })
}

/**
 * Duplica uma simulação existente do usuário logado:
 * - Copia todos os campos relevantes
 * - Título/Nome acrescido de " (cópia)"
 * - Status resetado para 'em_negociacao'
 * - Registra novo histórico
 */
export async function duplicateSimulation(id: string): Promise<SimulationRecord> {
  const currentUserId = pb.authStore.record?.id
  if (!currentUserId) {
    throw new Error('Usuário não autenticado.')
  }

  const original = await getSimulationById(id, currentUserId)

  const copyData: SimulationFormData = {
    client_name: `${original.client_name} (cópia)`,
    client_document: original.client_document,
    property_name: original.property_name,
    unit_description: original.unit_description,
    property_value: original.property_value,
    amount_paid: original.amount_paid,
    expected_delivery_date: original.expected_delivery_date,
    contract_number: original.contract_number,
    developer_name: original.developer_name,
    notes: original.notes,
    status: 'em_negociacao',
    simulation_type: original.simulation_type || 'rescisao_contratual',
    reference_date: original.reference_date,
    custas_rate: original.custas_rate,
    correction_enabled: original.correction_enabled,
    correction_index: original.correction_index,
    correction_rate: original.correction_rate,
    correction_start_date: original.correction_start_date,
    custom_fundamentacao: original.custom_fundamentacao,
  }

  return createSimulation(copyData)
}

/**
 * Obtém o histórico de status de uma simulação
 */
export async function getStatusHistory(
  simulationId: string,
  userId?: string,
): Promise<StatusHistoryRecord[]> {
  try {
    const currentUserId = userId || pb.authStore.record?.id
    if (!currentUserId) return []

    const records = await pb.collection(HISTORY_COLLECTION).getFullList<StatusHistoryRecord>({
      filter: `simulation = '${simulationId}' && user = '${currentUserId}'`,
      sort: 'created',
    })
    return records
  } catch (error) {
    console.warn(`Erro ao buscar histórico de status para simulação ${simulationId}:`, error)
    return []
  }
}

/**
 * Retorna a URL pública de download/visualização do arquivo de contrato anexado
 */
export function getContractFileUrl(record: SimulationRecord): string | null {
  if (!record.contract_file) return null
  return pb.files.getURL(record, record.contract_file)
}

/**
 * Exclui uma simulação
 */
export async function deleteSimulation(id: string): Promise<boolean> {
  try {
    await pb.collection(COLLECTION).delete(id)
    return true
  } catch (error) {
    console.error(`Erro ao deletar simulação ${id}:`, error)
    throw error
  }
}
