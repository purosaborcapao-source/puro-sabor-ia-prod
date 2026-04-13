# RELATÓRIO DE AUDITORIA TÉCNICA — PURO SABOR IA

**Data de execução:** 13 de Abril de 2026
**Projeto Supabase:** Atendimento IA (`rattlzwpfwjuhxktxduu`)
**Aplicação:** Monorepo Next.js — `apps/admin` + `apps/web`
**Região:** sa-east-1 | PostgreSQL 17

> Este relatório documenta o estado da aplicação **antes** das correções, o que foi **alterado e implantado**, e o que ainda **precisa ser feito** em uma próxima iteração. Serve como referência técnica para implantação em outro sistema ou continuidade do trabalho.

---

## SEÇÃO 1 — O QUE FOI CORRIGIDO E IMPLANTADO

### 1.1 ✅ Bug crítico na trigger `sync_order_payment_status`

**Problema:** A função usava `NEW.order_id` em todas as operações, mas operações DELETE só possuem `OLD` — sem `NEW`. Qualquer exclusão de payment_entry falhava silenciosamente, deixando o `payment_status` do pedido desatualizado.

**Correção aplicada no banco:**
```sql
-- Antes (quebrado em DELETE):
v_order_id := NEW.order_id;

-- Depois (correto):
v_order_id := COALESCE(NEW.order_id, OLD.order_id);
```

Migration aplicada: `fix_sync_order_payment_status_delete_bug`

---

### 1.2 ✅ Bug crítico em `confirm.ts` — campo inexistente `total_valor`

**Problema:** A API `/api/payments/confirm` buscava `paymentEntry.orders?.total_valor`, mas o campo real na tabela `orders` é `total`. Isso fazia `orderTotal` retornar sempre `undefined → 0`, causando qualquer pagamento confirmado (> R$0) marcar o pedido como **QUITADO imediatamente**, independente do valor real.

**Arquivo:** `apps/admin/pages/api/payments/confirm.ts`

**Correção aplicada no código:**
- Select corrigido para `orders(id, total, payment_status)`
- Removida a dupla gravação manual de `payment_status` — a trigger `sync_order_payment_status` já cuida disso automaticamente, evitando conflito de escrita
- Adicionada verificação de idempotência: bloqueia reconfirmação de pagamento já confirmado
- Após confirmar o pagamento, busca o pedido atualizado pelo banco (não recalcula no código)

---

### 1.3 ✅ Bug em `ConfirmPaymentButton.tsx` — anon client + código duplicado

**Problema:** O componente usava o cliente anon do Supabase diretamente para confirmar pagamentos (`supabase.from('payment_entries').update(...)`), **bypassando a API route** e a verificação de role. Além disso, havia `if (updateErr) throw updateErr` duplicado na mesma função (linhas 45 e 47).

**Arquivo:** `apps/admin/components/Orders/ConfirmPaymentButton.tsx`

**Correção aplicada:**
- Removida dependência do cliente anon (`import { supabase }`)
- Confirmação agora passa pela API `/api/payments/confirm` via `fetch`, que verifica se o usuário tem role `ADMIN` ou `GERENTE` antes de prosseguir
- Código duplicado removido

---

### 1.4 ✅ Bug em `log_order_item_changes` — `changed_by` podia ser NULL

**Problema:** A trigger que loga adição/remoção de itens usava `auth.uid()` diretamente. Quando o bot ou uma Edge Function inseria itens sem usuário autenticado, `changed_by` ficava NULL e causava violação de NOT NULL constraint, fazendo a inserção do item falhar silenciosamente.

**Correção aplicada no banco:**
```sql
-- Fallback: se não há usuário logado, busca assigned_to do pedido
SELECT COALESCE(auth.uid(), assigned_to_id)
INTO v_user_id
FROM orders WHERE id = v_order_id;

-- Se ainda nulo (pedido sem atendente atribuído), não registra log mas não quebra
IF v_user_id IS NULL THEN
  RETURN COALESCE(NEW, OLD);
END IF;
```

Mesma proteção aplicada em `log_order_changes`.

Migration aplicada: `fix_log_order_item_null_user_and_dedup_policies`

---

### 1.5 ✅ Bug em `audit_payment_to_ledger` — violação de FK no DELETE

**Problema:** Ao deletar um `payment_entry` confirmado, a trigger tentava inserir no `financial_ledger` com `payment_entry_id = OLD.id`. Como o registro já foi deletado antes do trigger AFTER rodar, a FK falhava com erro `Key is not present in table payment_entries`.

**Correção aplicada — dois pontos:**

1. FK da tabela `financial_ledger` alterada para `ON DELETE SET NULL`:
```sql
ALTER TABLE financial_ledger
  ADD CONSTRAINT financial_ledger_payment_entry_id_fkey
  FOREIGN KEY (payment_entry_id)
  REFERENCES payment_entries(id)
  ON DELETE SET NULL;
```

2. Trigger corrigida para usar `NULL` como `payment_entry_id` em DELETE (o registro original já não existe):
```sql
ELSIF TG_OP = 'DELETE' THEN
  v_payment_id := NULL; -- NULL pois o payment_entry foi deletado
```

Migration aplicada: `fix_ledger_fk_on_delete_and_trigger`

---

### 1.6 ✅ Policy RLS aberta demais em `messages`

**Problema:** A policy `service_role_can_manage_messages` usava `cmd: ALL, qual: true` para o role `public` — qualquer usuário autenticado (ou anon com token válido) podia ler, inserir, atualizar e deletar mensagens.

**Correção aplicada no banco:**
- Policy `service_role_can_manage_messages` **removida**
- Substituída por duas policies restritas:
  - `messages_update`: apenas `ADMIN`, `GERENTE`, `ATENDENTE`
  - `service_role_messages_all`: apenas `auth.role() = 'service_role'` (Edge Functions)

Migration aplicada: `fix_messages_rls_policy`

---

### 1.7 ✅ Policies duplicadas em `payment_entries` removidas

**Problema:** Existiam 6 policies em `payment_entries`, sendo 3 pares duplicados com nomes diferentes mas mesma lógica:
- `payment_entries_insert` duplicava `payment_entries: atendente insert`
- `payment_entries_read` duplicava `payment_entries: authenticated read`
- `payment_entries_update` duplicava `payment_entries: admin confirm`

**Correção:** Removidas as versões genéricas, mantidas as descritivas. Adicionada policy `payment_entries_service_role` para que triggers via service_role funcionem corretamente.

---

### 1.8 ✅ DELETE de pedidos bloqueado via RLS

**Problema:** A policy `orders_delete` permitia que usuários com role `ADMIN` deletassem pedidos — uma operação destrutiva e não auditável.

**Correção:** Policy `orders_delete` **removida**. Nenhum role pode mais deletar pedidos via cliente. Para cancelar, usa-se `status = 'CANCELADO'`, que é auditado automaticamente.

---

### 1.9 ✅ Log automático de todas as alterações de pedidos

**O que foi criado:**

**Trigger `trg_log_all_order_changes`** em `orders` — registra em `order_changes` qualquer mudança nos campos:
`status`, `payment_status`, `total`, `delivery_date`, `delivery_type`, `address`, `notes`, `assigned_to_id`, `sinal_valor`, `sinal_confirmado`, `conta_corrente`, `discount`, `discount_reason`, `delivery_fee`

**Trigger `trg_log_order_item_changes`** em `order_items` — registra adição, alteração de quantidade/preço e remoção de cada item, com nome do produto, quantidade e valor.

Ambas registram o `changed_by` com o nome real do usuário e são acionadas automaticamente pelo banco — não dependem do código da aplicação.

Migration aplicada: `orders_remove_delete_add_comprehensive_logging`

---

### 1.10 ✅ Tabelas `slots` e `delivery_slots` removidas

Ambas as tabelas existiam com propósito idêntico (controle de agenda):
- `slots` — 0 registros, legado abandonado
- `delivery_slots` — 78 registros, mas removida a pedido

Triggers, policies e funções associadas também foram removidas (`update_delivery_slots_updated_at`, `initialize_delivery_slots`).

Migration aplicada: `drop_slots_and_delivery_slots`

**Impacto no código:** O hook `apps/admin/hooks/useDeliverySlots.ts` e o componente `SchedulingWidget.tsx` ainda referenciam `delivery_slots`. Precisam ser removidos ou adaptados (ver Seção 2).

---

### 1.11 ✅ 64 clientes órfãos e dados associados removidos

**O que existia:** 65 customers no banco, sendo 64 sem nenhum pedido — originados de testes e cadastros do bot que nunca converteram.

**O que foi deletado (em ordem de FK):**
1. 4 mensagens associadas aos clientes órfãos
2. 62 conversas associadas
3. 64 customers

Restou: 1 customer real com 1 pedido real.

---

### 1.12 ✅ Proteção do script `seed-mock-data.ts`

**Arquivo:** `apps/admin/scripts/seed-mock-data.ts`

O script gera clientes e pedidos fictícios para testes. Não havia nenhuma proteção contra execução acidental em produção.

**Correção adicionada no início do arquivo:**
```typescript
if (process.env.NODE_ENV !== 'development') {
  console.error('BLOQUEADO: Este script só pode ser executado em ambiente de desenvolvimento.')
  process.exit(1)
}
```

---

### 1.13 ✅ 6 índices de performance criados

| Índice criado | Tabela | Coluna | Motivo |
|---------------|--------|--------|--------|
| `idx_orders_payment_status` | `orders` | `payment_status` | Filtrado no painel admin |
| `idx_orders_created_at` | `orders` | `created_at DESC` | Ordenação padrão |
| `idx_order_items_order_id` | `order_items` | `order_id` | FK sem índice |
| `idx_order_items_product_id` | `order_items` | `product_id` | JOIN com products |
| `idx_products_category` | `products` | `category` | Filtro do catálogo web |
| `idx_products_is_active` | `products` | `is_active` (WHERE true) | Filtro constante |

Migration aplicada: `create_missing_indexes`

---

### 1.14 ✅ Estrutura completa de auditoria financeira implantada

**Novas tabelas criadas:**

| Tabela | Função |
|--------|--------|
| `financial_ledger` | Livro-razão imutável — sem UPDATE ou DELETE possível via RLS |
| `daily_closing` | Fechamento de caixa diário |
| `payment_adjustments` | Registro de estornos e correções sem editar o original |

**Novas colunas em tabelas existentes:**

| Tabela | Coluna | Tipo | Descrição |
|--------|--------|------|-----------|
| `orders` | `discount` | numeric DEFAULT 0 | Valor de desconto concedido |
| `orders` | `discount_reason` | text | Motivo obrigatório do desconto |
| `orders` | `delivery_fee` | numeric DEFAULT 0 | Taxa de entrega cobrada |
| `order_items` | `cost_price_snapshot` | numeric | Custo do produto no momento da venda |

**Novas triggers:**

| Trigger | Tabela | O que faz |
|---------|--------|-----------|
| `trg_audit_payment_to_ledger` | `payment_entries` | Registra pagamentos confirmados e estornos no ledger |
| `trg_audit_order_cancellation` | `orders` | Registra cancelamentos com valor negativo no ledger |
| `trg_audit_order_confirmed` | `orders` | Registra confirmação de pedido como receita no ledger |
| `trg_snapshot_cost_price` | `order_items` | Copia custo do produto automaticamente no INSERT |

**Nova fórmula de total do pedido** (trigger `sync_order_total` atualizada):
```
total = SUM(itens × preço) - desconto + taxa_entrega
```

**Novas views:**

| View | O que retorna |
|------|--------------|
| `vw_resumo_financeiro` | Faturamento, recebido, pendente, cancelamentos, ticket médio — por mês |
| `vw_resumo_diario` | Pedidos, faturamento, recebido, pendente, cancelados — por dia |
| `vw_margem_produto` | Margem %, receita, custo, lucro bruto — por produto |

Migrations aplicadas: `create_financial_audit_tables`, `create_financial_triggers_and_views`

---

### 1.15 ✅ Inconsistência de dados corrigida

O único pedido real existente tinha `payment_status = SINAL_PAGO` sem nenhum `payment_entry` confirmado. Corrigido diretamente:
```sql
UPDATE orders SET payment_status = 'SINAL_PENDENTE'
WHERE payment_status != 'SINAL_PENDENTE'
  AND id NOT IN (
    SELECT DISTINCT order_id FROM payment_entries WHERE status = 'CONFIRMADO'
  );
```

---

### 1.16 ✅ Deduplicação de mensagens WhatsApp — 4 camadas de proteção

**Problema:** Mensagens enviadas pelo próprio aparelho (Z-API `fromMe: true`) e retries internos da Z-API estavam gerando duplicatas no banco. A causa raiz: `messageId` é opcional no schema — quando `null`, o `external_id` também ficava `null`, e o índice único parcial (`WHERE external_id IS NOT NULL`) deixava múltiplos `null` passarem.

**Arquivo alterado:** `supabase/functions/webhook-zapi/index.ts`

**Solução — 4 camadas implementadas:**

**Camada 1 — `external_id` nunca nulo:**
```typescript
// Se messageId existe, usa ele. Caso contrário, gera hash determinístico.
const externalId = parsed.messageId
  ? `zapi:${parsed.messageId}`
  : buildFallbackExternalId(parsed.phone, content, parsed.momment);

// Fallback: hash(phone:conteúdo:timestamp_arredondado_a_10s)
// O arredondamento a 10s tolera pequenas diferenças de timing em reentregas.
function buildFallbackExternalId(phone, content, momment?) {
  const ts = momment ? Math.floor(momment / 10000) : Math.floor(Date.now() / 10000);
  return `fallback:${simpleHash(`${phone}:${content}:${ts}`)}`;
}
```

**Camada 2 — Early check antes de qualquer processamento:**
```typescript
// Verifica no banco ANTES de findOrCreateCustomer e process-message
const { data: existingMessage } = await supabase
  .from("messages").select("id")
  .eq("external_id", externalId).maybeSingle();

if (existingMessage) return already_processed_response;
```

**Camada 3 — Content dedup (janela de 30 segundos):**
```typescript
// Proteção contra retry da Z-API que gera messageId diferente para o mesmo conteúdo
const { data: contentDuplicate } = await supabase
  .from("messages").select("id")
  .eq("phone", normalizedPhone).eq("direction", direction)
  .eq("type", type).eq("content", content)
  .gte("created_at", thirtySecondsAgo).limit(1).maybeSingle();

if (contentDuplicate) return duplicate_content_response;
```

**Camada 4 — Upsert com `onConflict` no banco (last resort para race conditions):**
```typescript
.upsert({...}, { onConflict: "external_id" })
// Se duas instâncias paralelas passarem pelas camadas 1-3 simultaneamente,
// o banco garante que apenas uma será inserida.
```

**Também corrigido:** Race condition em `findOrCreateCustomer` — quando dois requests simultâneos tentam criar o mesmo customer, o segundo agora captura o erro `23505` (unique violation) e busca o registro criado pelo primeiro, em vez de retornar `null`.

**Deploy:** Versão 4 da Edge Function `webhook-zapi` implantada com sucesso.

**Índice no banco confirmado:**
```sql
CREATE UNIQUE INDEX idx_messages_external_id
ON public.messages USING btree (external_id)
WHERE (external_id IS NOT NULL);
-- Com external_id sempre preenchido, cobre 100% das mensagens.
```

---

## SEÇÃO 2 — O QUE AINDA PRECISA SER FEITO

Itens **não implantados** nesta sessão. Devem ser tratados na próxima iteração.

### 2.1 🔴 URGENTE: Verificar chaves nos arquivos `.env.local`

Se `apps/admin/.env.local` ou `apps/web/.env.local` estiverem commitados no repositório Git, rotacionar imediatamente as chaves:
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_ZAPI_TOKEN`
- `ZAPI_CLIENT_TOKEN`

**Como verificar:**
```bash
git log --all --full-history -- "**/.env*"
git log --all --full-history -- "*.env.local"
```

**Como adicionar ao .gitignore:**
```
.env.local
.env.*.local
```

---

### 2.2 🔴 URGENTE: Remover referências a `delivery_slots` no código

A tabela foi dropada, mas o código ainda a referencia em dois lugares:

| Arquivo | Ação necessária |
|---------|----------------|
| `apps/admin/hooks/useDeliverySlots.ts` | Remover ou adaptar para novo modelo |
| `apps/admin/components/Dashboard/SchedulingWidget.tsx` | Remover ou adaptar para novo modelo |

A aplicação vai quebrar com erro 404/42P01 ao tentar acessar essas telas.

---

### 2.3 🟠 ALTO: Tela de fechamento diário

A tabela `daily_closing` existe, mas o preenchimento ainda é manual via SQL (descrito no manual de utilização). Precisa de uma tela ou botão no painel admin.

**O que a tela precisa fazer:**
1. Calcular automaticamente `total_vendas`, `total_recebido`, `total_pendente`, `total_cancelamentos`, `pedidos_count` com base nos pedidos do dia
2. Pedir campo de `observacoes` (texto livre)
3. Registrar `fechado_por` com o ID do usuário logado
4. Bloquear duplo fechamento para o mesmo dia (constraint UNIQUE já existe em `data`)

---

### 2.4 🟠 ALTO: Campos `discount` e `delivery_fee` na interface

As colunas existem no banco e são consideradas no cálculo do total, mas não há campos na interface para preenchê-las.

**Onde adicionar:**
- Formulário de edição de pedido (`apps/admin/pages/dashboard/orders/[id].tsx`)
- Campo `discount` com campo obrigatório `discount_reason` quando valor > 0
- Campo `delivery_fee` visível apenas quando `delivery_type = 'ENTREGA'`

---

### 2.5 🟠 ALTO: Número de WhatsApp hardcoded

**Arquivo:** `apps/web/pages/pedido/confirmacao/[id].tsx` (linha 165)

O número `5511999999999` está fixo no código. O número real (`5551999056903`) já está na tabela `settings` com a chave `bakery_phone`.

**Correção:** Buscar `bakery_phone` de `settings` ao carregar a página de confirmação.

---

### 2.6 🟡 MÉDIO: Rate limiting nas API routes

Nenhuma rota tem proteção contra abuso. Prioridade:
1. `/api/whatsapp/send` — pode ser usada para spam de WhatsApp
2. `/api/payments` — POST de pagamentos
3. `/api/orders` — criação de pedidos

**Solução recomendada:** Vercel Edge Middleware com `@upstash/ratelimit` ou middleware Next.js com contagem por IP.

---

### 2.7 🟡 MÉDIO: Validação de input com Zod

Nenhuma API route valida o schema do body com tipagem estrita. Usar `zod` para garantir que enums como `status` e `payment_status` recebem apenas valores válidos.

---

### 2.8 🟡 MÉDIO: Tab de histórico financeiro no pedido

No detalhe do pedido (`/dashboard/orders/[id]`), adicionar aba ou seção mostrando:
- Histórico do `order_changes` (quem alterou o quê e quando)
- Histórico do `financial_ledger` (movimentações financeiras do pedido)

---

### 2.9 🟡 MÉDIO: Dashboard financeiro

Usar as views criadas para exibir cards no painel:
- `vw_resumo_financeiro` → cards mensais
- `vw_resumo_diario` → cards do dia atual
- `vw_margem_produto` → tabela de produtos mais lucrativos

---

### 2.10 🟡 MÉDIO: Console.log em produção

Encontrados **13+ console.log** em `AuthContext.tsx`, **6+** em `OrderList.tsx`, e vários nas API routes. Vazam informações de debug e prejudicam performance.

**Ação:** Remover ou substituir por logger com níveis (`pino` ou equivalente).

---

### 2.11 🔵 BAIXO: Memoization no React

- `useCart.ts`: `addItem`/`removeItem`/`clearCart` deveriam usar `useCallback`
- `useProducts.ts`: `productsByCategory` deveria usar `useMemo`

---

### 2.12 🔵 BAIXO: TypeScript — uso excessivo de `any`

Encontrado em: `useProducts.ts` (3x), `AISuggestionPanel.tsx` (10+x), `MessageThread.tsx`, `AuthContext.tsx`, e `packages/supabase/src/client.ts` com `@ts-ignore`.

---

## SEÇÃO 3 — ESTADO DO BANCO APÓS AS ALTERAÇÕES

### Tabelas presentes

| Tabela | Registros | RLS | Observação |
|--------|-----------|-----|------------|
| `profiles` | 1 | ✅ | Usuário admin |
| `customers` | 1 | ✅ | Limpo — apenas real |
| `products` | 81 | ✅ | Catálogo completo |
| `orders` | 1 | ✅ | Pedido real de teste |
| `order_items` | 2 | ✅ | Itens do pedido acima |
| `order_changes` | 1 | ✅ | Log inicial |
| `messages` | 0 | ✅ | Limpo |
| `conversations` | 0 | ✅ | Limpo |
| `payment_entries` | 0 | ✅ | Sem pagamentos ainda |
| `payment_adjustments` | 0 | ✅ | **NOVA** |
| `financial_ledger` | 0 | ✅ | **NOVA** — imutável |
| `daily_closing` | 0 | ✅ | **NOVA** |
| `settings` | 12 | ✅ | Configurações do sistema |
| `quick_templates` | 6 | ✅ | Templates de mensagem |
| `reviews` | 0 | ✅ | Sem avaliações |
| `audit_logs` | 0 | ✅ | Tabela existente (não usada) |
| `slots` | — | — | **DROPADA** |
| `delivery_slots` | — | — | **DROPADA** |

### Migrations aplicadas nesta sessão (em ordem)

| # | Nome | O que fez |
|---|------|-----------|
| 1 | `fix_sync_order_payment_status_delete_bug` | Corrigiu `COALESCE(NEW, OLD).order_id` |
| 2 | `fix_messages_rls_policy` | Fechou policy `service_role_can_manage_messages` |
| 3 | `orders_remove_delete_add_comprehensive_logging` | Removeu DELETE de orders, criou triggers de log |
| 4 | `drop_slots_and_delivery_slots` | Dropou as duas tabelas de agenda |
| 5 | `create_financial_audit_tables` | Criou `financial_ledger`, `daily_closing`, `payment_adjustments`, colunas novas |
| 6 | `create_financial_triggers_and_views` | Criou triggers de auditoria e 3 views |
| 7 | `create_missing_indexes` | Criou 6 índices de performance |
| 8 | `fix_log_order_item_null_user_and_dedup_policies` | Corrigiu NULL em `changed_by`, removeu policies duplicadas |
| 9 | `fix_ledger_fk_on_delete_and_trigger` | FK `ON DELETE SET NULL`, trigger com `payment_entry_id = NULL` no DELETE |

### Arquivos de código alterados

| Arquivo | Tipo de alteração |
|---------|------------------|
| `apps/admin/pages/api/payments/confirm.ts` | Corrigido `total_valor → total`, removida dupla gravação de `payment_status`, adicionada verificação de idempotência |
| `apps/admin/components/Orders/ConfirmPaymentButton.tsx` | Removido cliente anon, agora usa API route, removido código duplicado |
| `apps/admin/scripts/seed-mock-data.ts` | Adicionado guard `NODE_ENV !== 'development'` |
| `supabase/functions/webhook-zapi/index.ts` | Reescrito com 4 camadas de deduplicação: external_id sempre preenchido (hash fallback), early check, content dedup 30s, upsert onConflict. Race condition de customer corrigida. Deploy: versão 4 |

---

## SEÇÃO 4 — REFERÊNCIA PARA IMPLANTAÇÃO EM NOVO SISTEMA

Se este modelo for replicado em outro ambiente ou sistema, os pontos abaixo são obrigatórios para manter a mesma integridade financeira.

### O que o banco precisa ter (além do schema base)

1. **`financial_ledger`** com RLS que bloqueie UPDATE e DELETE para todos os roles de cliente — somente INSERT e SELECT
2. **FK `payment_entry_id`** com `ON DELETE SET NULL` (não CASCADE, não RESTRICT)
3. **Trigger `trg_audit_payment_to_ledger`** em `payment_entries` — INSERT, UPDATE, DELETE
4. **Trigger `trg_audit_order_cancellation`** em `orders` — UPDATE (status → CANCELADO)
5. **Trigger `trg_audit_order_confirmed`** em `orders` — UPDATE (PENDENTE → CONFIRMADO)
6. **Trigger `trg_log_all_order_changes`** em `orders` — qualquer UPDATE
7. **Trigger `trg_log_order_item_changes`** em `order_items` — INSERT, UPDATE, DELETE
8. **Trigger `trg_snapshot_cost_price`** em `order_items` — BEFORE INSERT
9. **Trigger `trg_sync_order_total`** em `order_items` — AFTER INSERT, UPDATE, DELETE
10. **Trigger `trg_sync_order_payment_status`** em `payment_entries` — AFTER INSERT, UPDATE, DELETE

### O que a API deve garantir

- Confirmação de pagamento: passar **sempre** pela API route `/api/payments/confirm`, nunca direto pelo cliente Supabase
- A API route deve verificar role `ADMIN` ou `GERENTE` via `profiles.role` antes de confirmar
- Não recalcular `payment_status` manualmente na API — deixar o trigger cuidar
- Após confirmar, buscar o pedido atualizado do banco para retornar ao frontend

### Campos obrigatórios em `orders` para auditoria

- `discount` (numeric, default 0)
- `discount_reason` (text, null permitido apenas quando discount = 0)
- `delivery_fee` (numeric, default 0)

### Campo obrigatório em `order_items` para auditoria de margem

- `cost_price_snapshot` (numeric) — preenchido automaticamente pela trigger no INSERT
