import Head from 'next/head'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { CustomerList } from '@/components/Customers/CustomerList'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeftIcon, Search, UserPlus } from 'lucide-react'

export default function CustomersPage() {
  const router = useRouter()
  const { user, profile, loading } = useAuth()
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }

    if (!loading && user && profile) {
      if (profile.role !== 'ADMIN' && profile.role !== 'GERENTE' && profile.role !== 'ATENDENTE') {
        router.push('/auth/login')
      }
    }
  }, [user, profile, loading, router])

  if (!user || !profile) {
    return null
  }

  return (
    <>
      <Head>
        <title>Clientes - Ops Center</title>
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-[#050505]">
        {/* Header Estilo Ops Center */}
        <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0A0A0A]">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link
                href="/dashboard"
                className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                title="Voltar ao Command Center"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-sm font-black tracking-[0.2em] text-gray-900 dark:text-white uppercase">
                  Database: <span className="text-blue-600 dark:text-blue-500">Customers</span>
                </h1>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider mt-0.5">
                  Gestão de Ativos e Histográfico de Clientes
                </p>
              </div>
            </div>
            
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-black text-[10px] font-black tracking-widest uppercase rounded hover:opacity-90 transition-opacity">
              <UserPlus className="w-3.5 h-3.5" />
              Novo Registro
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          
          {/* Dashboard HUD de Clientes (Opcional Futuro) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                <p className="text-[10px] font-black tracking-widest text-gray-400 uppercase mb-2">Total Base</p>
                <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">--</p>
            </div>
            <div className="bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                <p className="text-[10px] font-black tracking-widest text-gray-400 uppercase mb-2">Taxa Recorrência</p>
                <p className="text-3xl font-black text-emerald-600 tracking-tighter">--%</p>
            </div>
            <div className="bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                <p className="text-[10px] font-black tracking-widest text-gray-400 uppercase mb-2">LTV Médio</p>
                <p className="text-3xl font-black text-blue-600 tracking-tighter">R$ 0,00</p>
            </div>
          </div>

          {/* Barra de Busca Avançada */}
          <div className="bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 p-4 shadow-sm flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="PROCURAR POR NOME OU TELEFONE..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 text-[11px] font-bold tracking-wider uppercase focus:border-blue-500 focus:ring-0 transition-all text-gray-900 dark:text-white placeholder:text-gray-400"
              />
            </div>
            <div className="hidden sm:flex items-center gap-2">
                <div className="px-3 py-2 border border-blue-500/30 bg-blue-500/5 text-blue-500 text-[10px] font-black tracking-widest uppercase cursor-pointer hover:bg-blue-500/10 transition-all">
                    Todos
                </div>
                <div className="px-3 py-2 border border-gray-200 dark:border-gray-800 text-gray-500 text-[10px] font-black tracking-widest uppercase cursor-pointer hover:border-gray-400 transition-all">
                    VIPs
                </div>
                <div className="px-3 py-2 border border-gray-200 dark:border-gray-800 text-gray-500 text-[10px] font-black tracking-widest uppercase cursor-pointer hover:border-gray-400 transition-all">
                    Inativos
                </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
             <CustomerList filters={{ search }} />
          </div>
        </main>
      </div>
    </>
  )
}
