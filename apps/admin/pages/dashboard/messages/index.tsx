import Head from "next/head";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import { MessageInbox } from "@/components/Messages/MessageInbox";
import { useEffect } from "react";

export default function MessagesPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  // Verificar autenticação
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }

    if (!loading && user && profile) {
      // Permitir ADMIN, GERENTE, ATENDENTE
      if (
        !["ADMIN", "GERENTE", "ATENDENTE"].includes(profile.role)
      ) {
        router.push("/auth/login");
      }
    }
  }, [user, profile, loading, router]);

  // O DashboardLayout garante o user básico.
  if (!user) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Mensagens - Painel Admin</title>
      </Head>

      <MessageInbox />
    </>
  );
}
