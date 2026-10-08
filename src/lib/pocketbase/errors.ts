import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Verifica se um erro retornado pelo PocketBase é um 404 (Not Found / Registro não encontrado)
 */
export function isNotFoundError(error: unknown): boolean {
  if (error instanceof ClientResponseError) {
    return error.status === 404
  }
  if (typeof error === 'object' && error !== null && 'status' in error) {
    return (error as { status: unknown }).status === 404
  }
  return false
}

export function extractFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ClientResponseError)) return {}
  const data = error.response?.data
  if (!data || typeof data !== 'object') return {}
  const errors: FieldErrors = {}
  for (const [field, detail] of Object.entries(data)) {
    if (
      detail &&
      typeof detail === 'object' &&
      'message' in detail &&
      typeof (detail as { message: unknown }).message === 'string'
    ) {
      errors[field] = (detail as { message: string }).message
    }
  }
  return errors
}

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'An unexpected error occurred.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  return msgs.length > 0 ? msgs.join(' ') : error.message || 'An unexpected error occurred.'
}
