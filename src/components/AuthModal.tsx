import React, { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Scale, ShieldCheck, Lock, Mail, User, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export const AuthModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { login, register, loginAsDemo } = useAuth()
  const { toast } = useToast()
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isRegister) {
        await register(email, password, name)
        toast({
          title: 'Conta criada com sucesso!',
          description: 'Bem-vindo ao sistema de cálculo de custas judiciais.',
        })
      } else {
        await login(email, password)
        toast({
          title: 'Login efetuado com sucesso!',
          description: 'Acesso autorizado às suas simulações.',
        })
      }
      onClose()
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Falha na autenticação'
      toast({
        variant: 'destructive',
        title: 'Erro ao autenticar',
        description: errorMsg || 'Verifique o e-mail e a senha informados.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setLoading(true)
    try {
      await loginAsDemo()
      toast({
        title: 'Acesso rápido com usuário padrão!',
        description: 'Conectado como Dr. Fabio Santos.',
      })
      onClose()
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Erro no acesso rápido',
        description: 'Não foi possível conectar com as credenciais padrão.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <Card className="w-full max-w-md shadow-2xl border-amber-500/20 bg-card">
        <CardHeader className="text-center space-y-2 pb-4">
          <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
            <Scale className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {isRegister ? 'Criar Conta de Acesso' : 'Acesso ao Sistema'}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Planilha de Cálculos de Custas Judiciais & Fechamento de Contrato
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {isRegister && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold">
                  Nome Completo / Advogado
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    required
                    placeholder="Ex: Dr. Roberto Alcantara"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9 h-10"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold">
                E-mail Profissional
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="advogado@escritorio.adv.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold">
                  Senha
                </Label>
                <span className="text-[11px] text-muted-foreground">Mínimo 8 dígitos</span>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2.5 pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-amber-600 dark:hover:bg-amber-700 h-10 font-medium"
            >
              {loading ? 'Processando...' : isRegister ? 'Cadastrar e Entrar' : 'Entrar no Sistema'}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full border-amber-400/50 bg-amber-50/50 hover:bg-amber-100/70 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800 h-10 text-xs font-semibold"
            >
              <ShieldCheck className="w-4 h-4 mr-1.5 text-amber-600" />
              Entrar como Usuário de Demonstração
            </Button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                className="text-xs text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100 transition-colors inline-flex items-center gap-1 font-medium"
              >
                {isRegister
                  ? 'Já tem conta? Clique para entrar'
                  : 'Primeiro acesso? Crie sua conta'}
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
