# 🚀 CLAUDE CODE — Prompts Prontos para Colar (V3)

> **Contexto:** SPEC_V3.md (Controle Financeiro + Governança) + Fase 1.4 concluída
> **Foco:** Central de pedidos com controle financeiro, não sistema de produção completo
> **Economia:** Cada prompt já tem contexto; não repete SPEC_V3.md

---

## 📋 ANTES DE COMEÇAR

```bash
# 1. Estude o contexto
cd "Puro Sabor IA"
cat SPEC_V3.md          # Leia SPEC_V3, não SPEC.md antigo

# 2. Verifique o que já existe (Fase 1.4 concluída)
ls apps/admin/          # login, auth context, types já prontos
ls packages/supabase/   # client.ts, types.ts existem

# 3. Prepare o projeto
pnpm install
pnpm dev                # Confirme que roda sem erros
```

---

# FASE 1.5 — CORRIGIR LOGIN & BANCO FINANCEIRO

## ✅ TAREFA 1.5: Corrigir sincronismo do LoginForm (30 min)

```
Problema: LoginForm.tsx usa setTimeout(500ms) frágil para verificar profile.
Solução: Remover setTimeout, deixar o redirect para o Dashboard (que já tem lógica correta).

Arquivo: apps/admin/components/Auth/LoginForm.tsx

MUDE DE:
  const onSubmit = async (data: LoginFormData) => {
    await signIn(data.email, data.password)
    setTimeout(() => {  // ❌ Remove isto
      if (profile && (profile.role === 'ADMIN' || profile.role === 'GERENTE')) {
        router.push('/dashboard')
      }
    }, 500)
  }

PARA:
  const onSubmit = async (data: LoginFormData) => {
    await signIn(data.email, data.password)
    // ✅ Deixar para o AuthContext sincronizar
    // ✅ Dashboard já redireciona automaticamente quando profile carregar
  }

TESTE:
1. pnpm dev
2. Login com credenciais válidas
3. Deve ir para /dashboard (não ficar em /auth/login)
4. Se ficar, significa profile ainda não está sendo buscado → ver AuthContext

Saída esperada: Login funciona sem setTimeout, redireciona para dashboard automaticamente.
```

---

## ✅ TAREFA 2.1: Migration SQL — Tabelas financeiras (1h)

```
Criar arquivo: supabase/migrations/002_financial_fields.sql

Use o conteúdo da seção "SCHEMA — ADIÇÕES NECESSÁRIAS" do SPEC_V3.md

Este arquivo precisa:
1. Criar ENUMs: payment_status, payment_confirmation_status, payment_type
2. Adicionar colunas em orders: payment_status, sinal_valor, sinal_confirmado, conta_corrente
3. Criar tabela payment_entries (registra cada pagamento)
4. Criar tabela order_changes (histórico de alterações)
5. Configurar RLS policies em payment_entries e order_changes

IMPORTANTE:
- Não modificar orders que já existe, apenas ADD COLUMN
- RLS policies devem permitir:
  - ATENDENTE: SELECT + INSERT (registrar pagamento)
  - ADMIN/GERENTE: SELECT + UPDATE (confirmar pagamento)

TESTE NO SUPABASE SQL EDITOR:
1. Copie TODO o arquivo 002_financial_fields.sql
2. Abra: https://rattlzwpfwjuhxktxduu.supabase.co → SQL Editor
3. Cole e execute
4. Confirme sem erros
5. Verifique: SELECT * FROM payment_entries LIMIT 1; (deve ser vazia, sem erro)

Saída esperada: Tabelas criadas, RLS policies ativas, types.ts atualizado com novos tipos.
Próximo: Execute: supabase gen types typescript --project-id rattlzwpfwjuhxktxduu
```

---

## ✅ TAREFA 2.2: Regenerar types.ts com novos campos (15 min)

```
Após criar a migration SQL, regenere os tipos:

cd "Puro Sabor IA"
supabase gen types typescript --project-id rattlzwpfwjuhxktxduu > packages/supabase/src/types.ts

Confirme que novos tipos aparecem em types.ts:
- type PaymentStatus = 'SINAL_PENDENTE' | 'SINAL_PAGO' | 'QUITADO' | 'CONTA_CORRENTE'
- type PaymentEntry = Database['public']['Tables']['payment_entries']['Row']
- type OrderChange = Database['public']['Tables']['order_changes']['Row']

Saída esperada: types.ts atualizado com tipos financeiros, sem erros de compilação.
```

---

# FASE 2 — INTERFACE FINANCEIRA

## ✅ TAREFA 2.3: Criar FieldWithPermission (componente padrão) (45 min)

```
Criar: apps/admin/components/UI/FieldWithPermission.tsx

Este componente é CRÍTICO para toda a governança do sistema.
Exibe um campo como read-only (com 🔒) ou editável baseado no role.

ESTRUTURA:
interface FieldWithPermissionProps {
  label: string
  value: string | number
  canEdit: boolean           // true se role pode editar
  onEdit?: (newValue: string | number) => Promise<void>
  variant?: 'text' | 'currency' | 'number'
  disabled?: boolean
}

COMPORTAMENTO:
- canEdit = false → <span> + ícone 🔒, nenhum input
- canEdit = true → <input> editável com save button
- variant='currency' → formata como R$ 1.234,56
- onEdit é async (para salvar no Supabase)

EXEMPLO DE USO:
const { profile } = useAuth()
const canEditFinancial = profile?.role === 'ADMIN' || profile?.role === 'GERENTE'

<FieldWithPermission
  label="Valor do sinal"
  value={order.sinal_valor}
  canEdit={canEditFinancial}
  onEdit={async (v) => {
    await supabase.from('orders').update({ sinal_valor: v }).eq('id', order.id)
  }}
  variant="currency"
/>

Saída esperada: Componente reutilizável, usado em todas as telas de pedidos daqui em diante.
```

---

## ✅ TAREFA 2.4: Dashboard de Pendências (1-2 dias)

```
Reescrever: apps/admin/pages/dashboard/index.tsx

FOCO: Resolver pendências AGORA, depois ver números do dia.

ESTRUTURA VISUAL:
┌─────────────────────────────────────────────────┐
│  Bom dia, Maria 👋              [Sair]           │
├─────────────────────────────────────────────────┤
│ 📥 PENDÊNCIAS (resolver agora)                  │
│ ┌────────────────────────────────────────────┐  │
│ │ 💬 3 mensagens WhatsApp não respondidas     │  │
│ │ 📦 2 pedidos aguardando confirmação         │  │
│ │ 💰 4 sinais a receber (entrega nos próx. 3d)│  │
│ │ ✏️  1 alteração de pedido solicitada        │  │
│ │ 🟡 2 pagamentos aguardando confirmação [ADM]│  │
│ └────────────────────────────────────────────┘  │
│                                                 │
│ 📊 HOJE — 9 de Abril                           │
│ ┌────────────┬────────────┬────────────┐        │
│ │ Entregas   │ A receber  │ Recebido   │        │
│ │    5       │ R$740,00   │ R$320,00   │        │
│ └────────────┴────────────┴────────────┘        │
│                                                 │
│ [Ver pedidos de hoje] [Ver todos os pedidos]    │
└─────────────────────────────────────────────────┘

COMPONENTES A CRIAR:
1. PendenciasList.tsx — exibe os 5 tipos de pendência
2. DayMetrics.tsx — números do dia (entregas, a receber, recebido)

DATA QUERIES (ver SPEC_V3.md seção "DASHBOARD"):
- Mensagens não respondidas (últimas 24h)
- Pedidos com status PENDENTE
- Sinais a receber (status SINAL_PENDENTE, próx. 3 dias)
- Alterações solicitadas (há registros em order_changes não processados)
- Pagamentos aguardando confirmação (only ADMIN/GERENTE veem isto)
- Números do dia (SELECT total, sinal_valor, payment_status FROM orders WHERE delivery_date >= TODAY)

PERMISSÕES:
- ADMIN/GERENTE: veem "pagamentos aguardando confirmação"
- ATENDENTE: não veem este item
- Todos veem: mensagens, pedidos, sinais, alterações

Saída esperada: Dashboard mostra pendências + números, dados carregam via Supabase RLS.
```

---

## ✅ TAREFA 2.5: Lista de Pedidos com filtros (1-2 dias)

```
Criar: apps/admin/pages/dashboard/orders/index.tsx

FEATURES:
- Tabela com colunas: #Pedido | Cliente | Produto | Entrega | Total | Status Financeiro | [Ações]
- Filtros: status (Pendente/Confirmado/Entregue), data, status financeiro
- Busca por cliente ou número de pedido
- Ordenação: mais urgentes primeiro (sinais a receber antes)
- Cada linha tem badge de status financeiro com cor:
  - 🔴 SINAL_PENDENTE (vermelho)
  - 🔵 SINAL_PAGO (azul)
  - 🟢 QUITADO (verde)
  - 🟣 CONTA_CORRENTE (roxo)

COMPONENTES:
- OrderList.tsx (tabela principal)
- PaymentStatusBadge.tsx (exibe status com cor + ícone)
- OrderFilters.tsx (filtros de status, data)

QUERIES:
SELECT orders.*, customers.name, order_items.*, products.name as product_name
FROM orders
JOIN customers ON orders.customer_id = customers.id
LEFT JOIN order_items ON orders.id = order_items.order_id
LEFT JOIN products ON order_items.product_id = products.id
WHERE status != 'CANCELADO'
ORDER BY delivery_date ASC, payment_status DESC

FILTRO FINANCEIRO SENSÍVEL:
- ADMIN/GERENTE: veem todas as colunas financeiras
- ATENDENTE: veem sinal_valor e saldo, mas read-only (use FieldWithPermission)

Saída esperada: Lista de pedidos filtrada, clicável para detalhe.
```

---

## ✅ TAREFA 2.6: Detalhe do Pedido com governança (2 dias)

```
Criar: apps/admin/pages/dashboard/orders/[id].tsx

ESTRUTURA DO PEDIDO:
┌──────────────────────────────────────────────────┐
│ Pedido #PD-042                      [Editar] [⋮] │
├──────────────────────────────────────────────────┤
│ Cliente: João Silva  📞 11 99999-9999            │
│ Produto: Bolo Chocolate 2kg                      │
│ Entrega: 15/Abr às 14h — Retirada               │
│                                                  │
│ ─── FINANCEIRO ──────────────────────────────── │
│ Valor total:    R$ 200,00  [🔒 só admin edita]  │
│ Sinal pago:     R$  60,00  ✅ Confirmado        │
│ Saldo devido:   R$ 140,00                       │
│ Status:         🔵 Sinal pago                   │
│                                                  │
│  [+ Registrar recebimento] ← Operadora pode     │
│  [Modal: Receber novo pagamento]                │
│                                                  │
│ ─── HISTÓRICO DE ALTERAÇÕES ──────────────────  │
│ 08/Abr 10:23 - Maria alterou data: 14/Abr → ...│
│ 07/Abr 09:15 - Sinal R$60 registrado           │
│ 07/Abr 09:18 - Sinal confirmado por Admin       │
└──────────────────────────────────────────────────┘

COMPONENTES:
1. OrderDetail.tsx (layout principal)
2. FieldWithPermission (campos financeiros)
3. RegisterPaymentModal.tsx (modal para registrar recebimento)
4. ChangeHistory.tsx (histórico de alterações)
5. ConfirmPaymentButton.tsx (só para ADMIN/GERENTE)

FLUXO DE PAGAMENTO:
1. OPERADORA clica [+ Registrar recebimento]
2. Modal abre: tipo (SINAL/SALDO), valor, notas
3. Clica "Registrar" → insere em payment_entries com status AGUARDANDO_CONFIRMACAO
4. ADMIN/GERENTE vê "Pagamento aguardando confirmação" no dashboard
5. ADMIN clica [Confirmar] → UPDATE payment_entries.status = CONFIRMADO
6. Atualiza order.payment_status (SINAL_PAGO ou QUITADO)
7. Histórico atualiza automaticamente

PERMISSÕES COM FieldWithPermission:
- Valor total: somente ADMIN/GERENTE pode editar
- Sinal pago: ATENDENTE vê (read-only), ADMIN edita
- Saldo: ATENDENTE registra, ADMIN confirma
- Cancelar pedido: somente ADMIN/GERENTE

Saída esperada: Tela de detalhe funcional, fluxo de pagamentos em 2 passos.
```

---

## ✅ TAREFA 2.7: API Route para criar usuário (1h)

```
Criar: apps/admin/pages/api/users/index.ts

PROPÓSITO: Criar usuários de forma segura no servidor (usando service_role key).

IMPLEMENTAÇÃO:
- POST /api/users → recebe { email, password, name, role }
- Valida permissões: somente ADMIN pode chamar
- Usa createRouteHandlerClient() (não cliente frontend)
- Chama supabase.auth.admin.createUser()
- Passa role no user_metadata
- Retorna { data, error }

CÓDIGO ESQUELETO:
export async function POST(req: NextRequest) {
  const { email, password, name, role } = await req.json()
  
  // 1. Verificar se usuário logado é ADMIN
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.user_metadata?.role === 'ADMIN') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }
  
  // 2. Criar usuário (isso dispara trigger para criar profile)
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: { name, role }
  })
  
  if (error) return Response.json({ error }, { status: 400 })
  return Response.json(data)
}

TRIGGER JÁ EXISTE (criado na migration 002):
- Ao criar user em auth.users, trigger cria registro em profiles
- Pega name e role de user_metadata

TESTE:
- POST /api/users com { email, password, name, role }
- Confirme que profile foi criado em Supabase

Saída esperada: API route segura para criar usuários, usada pelo UserForm.tsx.
```

---

## ✅ TAREFA 2.8: API Route para confirmar pagamento (1h)

```
Criar: apps/admin/pages/api/payments/confirm.ts

PROPÓSITO: Confirmar pagamento registrado pela operadora (somente ADMIN/GERENTE).

IMPLEMENTAÇÃO:
- POST /api/payments/confirm → recebe { payment_entry_id, confirm: true/false }
- Valida: somente ADMIN/GERENTE
- UPDATE payment_entries.status = CONFIRMADO ou REJEITADO
- UPDATE order.payment_status baseado no novo status

CÓDIGO ESQUELETO:
export async function POST(req: NextRequest) {
  const { payment_entry_id, confirm } = await req.json()
  
  // 1. Verificar permissão
  const supabase = createRouteHandlerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()
  
  if (!['ADMIN', 'GERENTE'].includes(profile?.role)) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }
  
  // 2. Atualizar payment_entry
  const newStatus = confirm ? 'CONFIRMADO' : 'REJEITADO'
  const { data, error } = await supabase
    .from('payment_entries')
    .update({
      status: newStatus,
      confirmed_by: user?.id,
      confirmed_at: new Date().toISOString()
    })
    .eq('id', payment_entry_id)
    .select()
    .single()
  
  if (error) return Response.json({ error }, { status: 400 })
  
  // 3. Atualizar order.payment_status (lógica: se total sinal_valor + saldos = total, é QUITADO)
  // TODO: Implementar lógica de cálculo de status
  
  return Response.json(data)
}

LÓGICA DE STATUS (após confirmar):
- Se total de pagamentos confirmados >= total do pedido → payment_status = QUITADO
- Se só sinal confirmado e < 100% → payment_status = SINAL_PAGO
- Se nenhum → payment_status = SINAL_PENDENTE

Saída esperada: API route para confirmar/rejeitar pagamentos.
```

---

# FASE 3 — CRUD E FERRAMENTAS

## ✅ TAREFA 3.1: CRUD de Produtos (1-2 dias)

```
Criar: apps/admin/pages/dashboard/products/

PÁGINAS:
- products/index.tsx (lista com tabela)
- products/new.tsx (form para criar)
- products/[id]/edit.tsx (form para editar)

FEATURES:
- Tabela: nome, preço, categoria, ativo/inativo, ações
- Busca por nome
- Criar novo: nome, descrição, preço, categoria, ativo
- Editar: idem
- Soft delete: apenas atualiza is_active = false (não deleta de verdade)

COMPONENTES:
- ProductTable.tsx
- ProductForm.tsx (reutilizado para create/edit)

PERMISSÕES:
- ADMIN/GERENTE: podem criar/editar/deletar
- ATENDENTE: somente leitura

Saída esperada: CRUD de produtos funcional.
```

---

## ✅ TAREFA 3.2: CRUD de Usuários (1 dia)

```
Criar: apps/admin/pages/dashboard/users/

PÁGINAS:
- users/index.tsx (lista)
- users/new.tsx (form criar)
- users/[id]/edit.tsx (form editar)

FEATURES:
- Tabela: email, name, role, status, criado em, ações
- Criar novo: email, password, name, role selector
- Editar: name, role, status (ativo/inativo/congelado)
- Deletar: soft delete (status = INATIVO)
- Roles: ADMIN, GERENTE, PRODUTOR, ATENDENTE

PERMISSÕES:
- Somente ADMIN pode acessar (RLS no backend)

COMPONENTES:
- UserTable.tsx
- UserForm.tsx (reutilizado)

Saída esperada: Gerenciamento de usuários funcional.
```

---

## ✅ TAREFA 3.3: Configurações Gerais (1 dia)

```
Criar: apps/admin/pages/dashboard/settings/

CAMPOS EDITÁVEIS (salvam em tabela settings):
- bakery_name (string)
- bakery_phone (string)
- opening_hours (JSON: { seg: "08:00-18:00", ter: "08:00-18:00", ... })
- min_lead_time_hours (number: prazo mínimo em horas)
- max_orders_day (number: máximo de pedidos por dia)
- ai_prompt (textarea grande: prompt do Claude para processar mensagens)

COMPONENTES:
- GeneralSettings.tsx
- AIPromptEditor.tsx (textarea com botão "Testar")

PERMISSÕES:
- Somente ADMIN edita
- GERENTE/ATENDENTE: read-only

Saída esperada: Configurações editáveis da padaria.
```

---

# PRÓXIMAS FASES (depois do V3)

> Estas tarefas vêm DEPOIS do V3 estar 100% pronto.

## FASE 4 — Edge Functions & WhatsApp
```
- webhook-zapi: recebe mensagens do WhatsApp
- process-message: processa com Claude API
- send-notifications: job de notificações automáticas
```

## FASE 5 — Agendamento & Inteligência
```
- Sistema de slots (calendário de agendamento)
- Fila inteligente (algoritmo de urgência)
- Editor de prompt IA
```

## FASE 6 — Testes & Deploy
```
- Testes unit + integration
- GitHub Actions CI
- Deploy Vercel automático
- E2E tests
```

---

## 📊 PROGRESSO V3

| Tarefa | Semana | Status |
|--------|--------|--------|
| 1.5 — Corrigir login | W1 | Próximo |
| 2.1 — Migration SQL | W1 | Próximo |
| 2.2 — Regenerar types | W1 | Próximo |
| 2.3 — FieldWithPermission | W1 | Próximo |
| 2.4 — Dashboard pendências | W2 | Próximo |
| 2.5 — Lista de pedidos | W2 | Próximo |
| 2.6 — Detalhe do pedido | W2 | Próximo |
| 2.7 — API users | W2 | Próximo |
| 2.8 — API payments confirm | W2 | Próximo |
| 3.1 — CRUD produtos | W3 | Próximo |
| 3.2 — CRUD usuários | W3 | Próximo |
| 3.3 — Configurações | W3 | Próximo |

**Timeline:** 3 semanas para completar o MVP financeiro com governança.

---

## 🎯 COMO USAR

1. **Abra o SPEC_V3.md** — leia antes de começar qualquer tarefa
2. **Copie um prompt acima**
3. **Cole no Claude Code:**
   ```bash
   claude code "PROMPT_AQUI"
   ```
4. **Claude Code gera código**
5. **Você valida + testa**
6. **Próximo prompt**

---

## 📌 CONTEXTO PADRÃO PARA TODOS OS PROMPTS

Adicione isto ao começar cada tarefa:

```
Use SPEC_V3.md como referência principal (não SPEC.md antigo).

Lembre:
- Foco em CONTROLE FINANCEIRO, não produção
- FieldWithPermission para campos sensíveis
- RLS policies devem ser aplicadas
- Types do Supabase (Database['public']['Tables'][...])
- Sem Prisma, sem Express, sem Docker

Estrutura Pages Router (não App Router):
- apps/admin/pages/dashboard/...
- apps/admin/pages/api/...
```

---

*Versão: 3.0 — Foco Financeiro + Governança*  
*Atualizado: 9 de Abril de 2026*  
*Projeto: Puro Sabor IA*  
*Supabase: rattlzwpfwjuhxktxduu*
