import pb from '@/lib/pocketbase/client'
import { SimulationRecord, SimulationFormData } from '@/types/simulation'

const COLLECTION = 'simulacoes'

/**
 * Obtém a lista de todas as simulações pertencentes ao usuário autenticado,
 * ordenadas da mais recente para a mais antiga.
 */
export async function getSimulations(searchQuery?: string): Promise<SimulationRecord[]> {
  try {
    let filter = ''
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().replace(/'/g, "\\'")
      filter = `client_name ~ '${q}' || property_name ~ '${q}' || contract_number ~ '${q}' || developer_name ~ '${q}'`
    }

    const records = await pb.collection(COLLECTION).getFullList<SimulationRecord>({
      sort: '-created',
      filter: filter || undefined,
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
export async function getSimulationById(id: string): Promise<SimulationRecord> {
  try {
    const record = await pb.collection(COLLECTION).getOne<SimulationRecord>(id)
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
    // Normaliza a data para formato ISO válido
    let formattedDate = data.expected_delivery_date
    if (formattedDate && !formattedDate.includes('T') && !formattedDate.includes('Z')) {
      formattedDate = new Date(`${data.expected_delivery_date}T00:00:00.000Z`).toISOString()
    }

    const payload = {
      ...data,
      user: currentUserId,
      expected_delivery_date: formattedDate,
      status: data.status || 'em_negociacao',
    }

    const record = await pb.collection(COLLECTION).create<SimulationRecord>(payload)
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
  try {
    const payload = { ...data }
    if (
      payload.expected_delivery_date &&
      !payload.expected_delivery_date.includes('T') &&
      !payload.expected_delivery_date.includes('Z')
    ) {
      payload.expected_delivery_date = new Date(
        `${payload.expected_delivery_date}T00:00:00.000Z`,
      ).toISOString()
    }

    const record = await pb.collection(COLLECTION).update<SimulationRecord>(id, payload)
    return record
  } catch (error) {
    console.error(`Erro ao atualizar simulação ${id}:`, error)
    throw error
  }
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
