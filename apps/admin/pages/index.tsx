import Head from 'next/head'

export default function Home() {
  return (
    <>
      <Head>
        <title>Atendimento IA - Admin</title>
        <meta name="description" content="Painel administrativo de atendimento" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-blue-900 dark:text-blue-50 mb-4">
              Painel Admin
            </h1>
            <p className="text-xl text-blue-700 dark:text-blue-200 mb-8">
              Gerenciamento da plataforma de atendimento
            </p>
            <div className="bg-white dark:bg-blue-900 rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
              <p className="text-blue-700 dark:text-blue-300">
                ✅ Painel administrativo configurado
              </p>
              <p className="text-blue-700 dark:text-blue-300 mt-2">
                ✅ Acesso a gerenciamento de atendimentos
              </p>
              <p className="text-blue-700 dark:text-blue-300 mt-2">
                ✅ Integração com IA e banco de dados
              </p>
              <p className="text-blue-700 dark:text-blue-300 mt-2">
                ✅ Dashboard em desenvolvimento
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
