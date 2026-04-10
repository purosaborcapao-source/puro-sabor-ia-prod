import Head from 'next/head'
import { LoginForm } from '@/components/Auth/LoginForm'

export default function LoginPage() {
  return (
    <>
      <Head>
        <title>Login - Painel Admin</title>
        <meta name="description" content="Login no painel administrativo" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <LoginForm />
    </>
  )
}
