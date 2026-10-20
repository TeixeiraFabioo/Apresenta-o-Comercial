import React, { useEffect, useState, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface CurrencyInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange'
> {
  value: number
  onValueChange: (value: number) => void
  containerClassName?: string
}

/**
 * Converte valor numérico em reais (ex: 240000.5) para formato pt-BR sem o prefixo R$: "240.000,50"
 */
export function formatBRLValue(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value) || value <= 0) {
    return ''
  }
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Normaliza qualquer texto inserido pelo usuário (digitado, colado ou editado)
 * para um valor numérico em reais (float).
 *
 * Regras tratadas:
 * 1. Colou com vírgula (ex.: "240.000,50" ou "240000,50"): vírgula é o separador decimal.
 * 2. Colou com ponto como milhar (ex.: "240.000" ou "1.500.000"): interpreta como valor em reais.
 * 3. Colou com ponto americano (ex.: "240000.50"): interpreta como 240000.50.
 * 4. Digitação com vírgula em andamento (ex.: "240000,"): trata reais e centavos.
 * 5. Digitação apenas de dígitos inteiros (ex.: "240000"): interpreta como R$ 240.000,00 (conforme requisito).
 */
export function parseBRLInput(raw: string): number {
  if (!raw) return 0
  const trimmed = raw.trim().replace(/^R\$\s?/, '')
  if (!trimmed) return 0

  // Caso 1: Tem vírgula (padrão brasileiro explícito, ex.: "240.000,50" ou "240000,50" ou "500,5")
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',')
    const intPart = parts[0].replace(/\D/g, '') || '0'
    // Pega até 2 casas decimais da parte após a primeira vírgula
    const decPart = (parts[1] || '').replace(/\D/g, '').slice(0, 2)
    const floatStr = `${intPart}.${decPart.padEnd(decPart.length > 0 ? decPart.length : 0, '0')}`
    const parsed = parseFloat(floatStr)
    return isNaN(parsed) || !isFinite(parsed) ? 0 : Math.max(0, parsed)
  }

  // Caso 2: Tem ponto(s) sem vírgula
  if (trimmed.includes('.')) {
    const dotParts = trimmed.split('.')
    // Se a última parte após o ponto tem 1 ou 2 dígitos e só há 1 ponto (ex.: "240000.5" ou "240000.50"), padrão americano
    if (
      dotParts.length === 2 &&
      dotParts[1].length <= 2 &&
      dotParts[0].replace(/\D/g, '').length > 0
    ) {
      const parsed = parseFloat(trimmed.replace(/[^\d.]/g, ''))
      return isNaN(parsed) || !isFinite(parsed) ? 0 : Math.max(0, parsed)
    }

    // Se as partes após o primeiro ponto têm 3 dígitos (ex.: "240.000" ou "1.500.000"), é ponto de milhar pt-BR!
    const digitsOnly = trimmed.replace(/\D/g, '')
    const parsed = parseInt(digitsOnly, 10)
    return isNaN(parsed) || !isFinite(parsed) ? 0 : Math.max(0, parsed)
  }

  // Caso 3: Apenas dígitos (ex.: "240000") -> R$ 240.000,00
  const digitsOnly = trimmed.replace(/\D/g, '')
  if (!digitsOnly) return 0
  const parsed = parseInt(digitsOnly, 10)
  return isNaN(parsed) || !isFinite(parsed) ? 0 : Math.max(0, parsed)
}

/**
 * Formata o texto exibido ao vivo no input conforme o usuário digita.
 * Preserva se o usuário acabou de digitar a vírgula (ex: "240.000," ou "240.000,5")
 * sem apagar ou reiniciar o cursor.
 */
export function formatLiveDisplay(rawText: string, currentNumber: number): string {
  const trimmed = rawText.trim().replace(/^R\$\s?/, '')
  if (!trimmed && currentNumber === 0) return ''

  // Se o usuário está digitando com vírgula decimal
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',')
    const intDigits = parts[0].replace(/\D/g, '')
    const intNumber = intDigits ? parseInt(intDigits, 10) : 0
    const formattedInt = new Intl.NumberFormat('pt-BR').format(intNumber)
    const decDigits = parts[1].replace(/\D/g, '').slice(0, 2)

    // Se digitou apenas a vírgula após o número (ex: "240.000,")
    if (parts.length > 1 && parts[1] === '') {
      return `${formattedInt},`
    }
    return `${formattedInt},${decDigits}`
  }

  // Se for apenas número inteiro (ex: usuário digitou "240000")
  if (currentNumber > 0) {
    // Exibe formatado como moeda pt-BR completa ("240.000,00")
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(currentNumber)
  }

  // Se o número for 0 mas o usuário digitou "0"
  if (trimmed === '0') {
    return '0,00'
  }

  return ''
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      value,
      onValueChange,
      className,
      containerClassName,
      placeholder = 'R$ 0,00',
      id,
      required,
      disabled,
      ...props
    },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement | null>(null)
    // Estado do texto exibido no input
    const [displayValue, setDisplayValue] = useState<string>(() => {
      return value > 0 ? formatBRLValue(value) : ''
    })
    const isFocusedRef = useRef(false)
    // Guarda a posição desejada para reposicionar o cursor após a re-renderização
    const pendingCursorRef = useRef<number | null>(null)

    // Sincroniza se o valor numérico externo mudar enquanto o input não estiver com foco
    useEffect(() => {
      if (!isFocusedRef.current) {
        setDisplayValue(value > 0 ? formatBRLValue(value) : '')
      }
    }, [value])

    // Reposiciona o cursor de forma determinística após o novo valor estar refletido no DOM
    useEffect(() => {
      if (pendingCursorRef.current !== null && inputRef.current) {
        const targetPos = pendingCursorRef.current
        pendingCursorRef.current = null
        inputRef.current.setSelectionRange(targetPos, targetPos)
        // Reforço via requestAnimationFrame para garantir que renderizações concorrentes ou de terceiros não resetem
        requestAnimationFrame(() => {
          if (inputRef.current && document.activeElement === inputRef.current) {
            inputRef.current.setSelectionRange(targetPos, targetPos)
          }
        })
      }
    }, [displayValue])

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      isFocusedRef.current = true
      // Se tiver valor, mantém para edição fácil
      if (value > 0 && !displayValue) {
        setDisplayValue(formatBRLValue(value))
      }
      props.onFocus?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      isFocusedRef.current = false
      pendingCursorRef.current = null
      // No blur, padroniza com 2 casas decimais se houver valor
      if (value > 0) {
        setDisplayValue(formatBRLValue(value))
      } else {
        setDisplayValue('')
      }
      props.onBlur?.(e)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      const originalCursor = e.target.selectionStart ?? raw.length

      // Se apagou tudo ou restou apenas espaços
      const cleanRaw = raw.trim().replace(/^R\$\s?/, '')
      if (!cleanRaw) {
        pendingCursorRef.current = 0
        setDisplayValue('')
        onValueChange(0)
        return
      }

      // Se o usuário digitou ou colou
      const numericVal = parseBRLInput(raw)
      const liveText = formatLiveDisplay(raw, numericVal)

      // Cálculo do reposicionamento determinístico do cursor:
      // Se o cursor estava no final do texto original digitado, posiciona no final do texto reformatado
      if (originalCursor >= raw.length) {
        pendingCursorRef.current = liveText.length
      } else {
        // Conta quantos dígitos existiam antes da posição original do cursor
        const textBeforeCursor = raw.slice(0, originalCursor)
        const digitsBeforeCursor = (textBeforeCursor.match(/\d/g) || []).length

        // Se o cursor estava logo após uma vírgula (ex.: acabou de digitar vírgula ou estava na vírgula)
        const isRightAfterComma = originalCursor > 0 && raw[originalCursor - 1] === ','
        const liveCommaIndex = liveText.indexOf(',')

        if (isRightAfterComma && liveCommaIndex !== -1) {
          pendingCursorRef.current = liveCommaIndex + 1
        } else if (digitsBeforeCursor === 0) {
          // Se não havia dígitos antes do cursor, fica no início
          pendingCursorRef.current = 0
        } else {
          // Encontra a posição imediatamente após o dígito correspondente no texto reformatado
          let count = 0
          let newCursor = liveText.length
          for (let i = 0; i < liveText.length; i++) {
            if (/\d/.test(liveText[i])) {
              count++
              if (count === digitsBeforeCursor) {
                newCursor = i + 1
                break
              }
            }
          }
          pendingCursorRef.current = newCursor
        }
      }

      setDisplayValue(liveText)
      onValueChange(numericVal)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Permite navegação, backspace, delete, tab, enter, setas, etc.
      // Se pressionar vírgula ou ponto, permite
      props.onKeyDown?.(e)
    }

    // Combina a ref encaminhada com a ref interna
    const handleRef = (node: HTMLInputElement | null) => {
      inputRef.current = node
      if (typeof ref === 'function') {
        ref(node)
      } else if (ref) {
        ;(ref as React.MutableRefObject<HTMLInputElement | null>).current = node
      }
    }

    return (
      <div className={cn('relative flex items-center', containerClassName)}>
        <span
          className="absolute left-3.5 text-sm font-semibold text-slate-400 dark:text-slate-500 pointer-events-none select-none"
          aria-hidden="true"
        >
          R$
        </span>
        <Input
          {...props}
          ref={handleRef}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          required={required}
          disabled={disabled}
          placeholder={placeholder.replace(/^R\$\s?/, '') || '0,00'}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn('pl-11 text-base font-mono font-semibold h-11', className)}
        />
      </div>
    )
  },
)

CurrencyInput.displayName = 'CurrencyInput'
