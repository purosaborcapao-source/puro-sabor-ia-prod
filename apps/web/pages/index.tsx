import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    router.push('/pedido')
  }, [router])

  return (
    <>
      <Head>
        <title>Atendimento IA - Cliente</title>
        <meta name="description" content="Plataforma de atendimento com IA" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-screen bg-[#FDF6EC] flex items-center justify-center font-['Fraunces'] text-[#C8562A] uppercase tracking-widest font-black text-sm animate-pulse">
        Carregando Puro Sabor...
      </main>
    </>
  )
}
