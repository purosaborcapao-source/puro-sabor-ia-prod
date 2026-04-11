import Head from 'next/head'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { GeneralSettings } from '@/components/Settings/GeneralSettings'
import { PaymentSettings } from '@/components/Settings/PaymentSettings'
import { AISettings } from '@/components/Settings/AISettings'
import { useState, useEffect } from 'react'
import { Settings, CreditCard, Bot } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const { user, profile, loading } = useAuth()
  const [activeTab, setActiveTab] = useState<'general' | 'payment' | 'ai'>('general')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }

    if (!loading && user && profile) {
      // Allow ADMIN, GERENTE to view, only ADMIN to edit
      if (!['ADMIN', 'GERENTE', 'ATENDENTE'].includes(profile.role)) {
        router.push('/dashboard')
      }
    }
  }, [user, profile, loading, router])

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    )
  }

  const canEdit = profile.role === 'ADMIN'

  return (
    <>
      <Head>
        <title>Configurações - Admin</title>
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Configurações
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Gerencie as configurações gerais da padaria
              </p>
            </div>
            {!canEdit && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm text-blue-800 dark:text-blue-200">
                Apenas administradores podem editar estas configurações.
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Aba Navigation */}
          <div className="flex gap-4 mb-8 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-2 py-4 px-2 border-b-2 transition-colors font-medium text-sm ${
                activeTab === 'general'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Settings className="w-4 h-4" />
              Geral
            </button>
            <button
              onClick={() => setActiveTab('payment')}
              className={`flex items-center gap-2 py-4 px-2 border-b-2 transition-colors font-medium text-sm ${
                activeTab === 'payment'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Pagamentos
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-2 py-4 px-2 border-b-2 transition-colors font-medium text-sm ${
                activeTab === 'ai'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Bot className="w-4 h-4" />
              IA & Chat
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 shadow-sm">
            {activeTab === 'general' && <GeneralSettings canEdit={canEdit} />}
            {activeTab === 'payment' && <PaymentSettings />}
            {activeTab === 'ai' && <AISettings />}
          </div>
        </main>
      </div>
    </>
  )
}
