import Head from 'next/head'

export default function Home() {
  return (
    <>
      <Head>
        <title>Atendimento IA - Cliente</title>
        <meta name="description" content="Plataforma de atendimento com IA" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Atendimento IA
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              Plataforma de atendimento potenciada por IA
            </p>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
              <p className="text-gray-700 dark:text-gray-300">
                ✅ Monorepo com Turborepo configurado
              </p>
              <p className="text-gray-700 dark:text-gray-300 mt-2">
                ✅ Next.js 14 + TypeScript
              </p>
              <p className="text-gray-700 dark:text-gray-300 mt-2">
                ✅ Tailwind CSS + shadcn/ui
              </p>
              <p className="text-gray-700 dark:text-gray-300 mt-2">
                ✅ Supabase integrado
              </p>
              <p className="text-gray-700 dark:text-gray-300 mt-2">
                ✅ Claude API pronto
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
