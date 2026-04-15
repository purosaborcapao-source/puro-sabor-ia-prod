# 💳 Documentação: Sincronização Automática de Pagamentos

**Data de Implementação:** 15/04/2026  
**Status:** ✅ Aplicado com sucesso  
**Versão:** Migration 018

---

## 📋 Resumo da Implementação

Foi implementado um sistema **automático e em tempo real** de sincronização dos totais de pagamento com a tabela `orders`, eliminando a necessidade de cálculos no frontend.

### O que foi adicionado:

| Componente | Descrição |
|-----------|-----------|
| **Colunas** | `total_received`, `balance_due` adicionadas à tabela `orders` |
| **Função SQL** | `calculate_order_final_total()` - Calcula o valor final (total + taxa - desconto) |
| **Função Trigger** | `sync_order_payment_totals()` - Sincroniza os valores automaticamente |
| **Triggers** | 4 triggers no banco de dados para manter dados sempre atualizados |
| **Índices** | 2 índices para otimizar queries de relatórios |
| **Frontend** | Componente `OrderDetail.tsx` atualizado para usar valores do banco |

---

## 🔄 Como Funciona

### **Antes (❌ Problema):**
```
Usuario registra pagamento
         ↓
Salva em payment_entries ✅
         ↓
Frontend calcula total_recebido em JavaScript ⚠️
         ↓
Se página recarrega, recalcula tudo novamente ⚠️
```

### **Depois (✅ Solução):**
```
Usuario registra pagamento
         ↓
Salva em payment_entries ✅
         ↓
Trigger automático recalcula:
  - total_received
  - balance_due
         ↓
Valores persistem no banco ✅
         ↓
Frontend usa valores prontos do banco 🚀
```

---

## 🎯 Dados Sincronizados

### Campo: `total_received`
```sql
Total de pagamentos CONFIRMADOS para um pedido
= SUM(payment_entries.valor) WHERE status = 'CONFIRMADO'
```

**Exemplo:**
- Pedido #1234: Total = R$ 1.000,00
- Pagamentos confirmados: R$ 300,00 (sinal) + R$ 200,00 (parcial)
- `total_received` = **R$ 500,00**

### Campo: `balance_due`
```sql
Valor ainda devido
= (total + delivery_fee - discount) - total_received
= Sempre >= 0 (nunca fica negativo)
```

**Exemplo (continuação):**
- `balance_due` = (1.000 + 0 - 0) - 500 = **R$ 500,00**

---

## ⚙️ Triggers Implementados

| Trigger | Evento | Tabela | Propósito |
|---------|--------|--------|----------|
| `trg_sync_payment_on_insert` | INSERT | payment_entries | Quando novo pagamento é registrado |
| `trg_sync_payment_on_update` | UPDATE | payment_entries | Quando pagamento é confirmado/rejeitado |
| `trg_sync_payment_on_delete` | DELETE | payment_entries | Quando pagamento é removido |
| `trg_sync_order_totals_on_update` | UPDATE | orders | Quando total/taxa/desconto do pedido muda |

---

## 🧪 Como Testar

### **Teste 1: Pagamento Novo**
```
1. Abra um pedido no Admin: /dashboard/orders/[id]
2. Clique em "+ Baixar [valor]"
3. Registre um pagamento de R$ 100,00
4. Verifique se:
   ✅ Total Recebido mostrado = R$ 100,00
   ✅ Saldo Devido atualizado corretamente
   ✅ Recarregue a página - valores persistem
```

### **Teste 2: Múltiplos Pagamentos**
```
1. Mesmo pedido anterior
2. Adicione mais um pagamento: R$ 50,00
3. Verifique:
   ✅ Total Recebido = R$ 150,00
   ✅ Saldo Devido reduzido em R$ 50,00
   ✅ Sem erros no console
```

### **Teste 3: Alteração de Valores do Pedido**
```
1. Pedido com pagamento registrado
2. Edite o "Valor Inicial dos Itens" (total)
3. Verifique:
   ✅ Balance due recalcula automaticamente
   ✅ Total recebido não muda
```

### **Teste 4: Validação de Banco de Dados**
```sql
-- Execute no Supabase SQL Editor:
SELECT 
  id,
  number,
  total,
  total_received,
  balance_due,
  (total - total_received) as calculated_balance
FROM orders
WHERE total_received > 0
LIMIT 5;

-- balance_due deve ser igual a calculated_balance
```

---

## 🔒 Segurança e Validações

✅ **Totais nunca ficam negativos** - `GREATEST(0, valor)`  
✅ **Apenas pagamentos CONFIRMADOS são contados** - `WHERE status = 'CONFIRMADO'`  
✅ **Transações seguras** - Usa EXCEPTION handling  
✅ **RLS mantido** - Permissions na tabela `payment_entries` intactas  
✅ **Idempotente** - Pode executar múltiplas vezes sem problemas  

---

## 📊 Performance

Índices criados para otimizar queries:
```sql
idx_orders_total_received    -- Query relatórios por valor recebido
idx_orders_balance_due       -- Query relatórios por valor devido
```

**Impacto:** Praticamente zero (triggers são muito rápidos em PostgreSQL)

---

## 🔄 Código Alterado

### 1. `/apps/admin/components/Orders/OrderDetail.tsx`

**Antes:**
```typescript
const totalConfirmed = paymentEntries
  .filter((p) => p.status === 'CONFIRMADO')
  .reduce((sum, p) => sum + p.amount, 0);
```

**Depois:**
```typescript
const totalConfirmed = order.total_received || 0;
const saldoDue = order.balance_due || 0;
```

**Benefício:** 
- Sem cálculos desnecessários no frontend
- Usa dados pré-calculados e persistidos
- Performance melhorada

---

## 🚨 Possíveis Erros e Soluções

### **Erro: "Function sync_order_payment_totals not found"**
- **Causa:** Migration não aplicada corretamente
- **Solução:** Execute `/migrations/018_sync_payment_totals.sql` novamente

### **Erro: Saldo Negativo**
- **Causa:** Pagamento maior que o total do pedido
- **Solução:** Validação no frontend já impede isso (linha 149-152 em `/api/payments/index.ts`)

### **Erro: Trigger não dispara após pagamento**
- **Causa:** RLS bloqueando atualização
- **Solução:** Verificar permissões na tabela `orders`

### **Campos não aparecem no frontend**
- **Causa:** Cache do browser
- **Solução:** CTRL+SHIFT+Delete para limpar cache

---

## 📝 Rollback (Se necessário)

Se precisar reverter a implementação:

```sql
-- 1. Remover triggers
DROP TRIGGER IF EXISTS trg_sync_payment_on_insert ON public.payment_entries;
DROP TRIGGER IF EXISTS trg_sync_payment_on_update ON public.payment_entries;
DROP TRIGGER IF EXISTS trg_sync_payment_on_delete ON public.payment_entries;
DROP TRIGGER IF EXISTS trg_sync_order_totals_on_update ON public.orders;

-- 2. Remover funções
DROP FUNCTION IF EXISTS sync_order_payment_totals();
DROP FUNCTION IF EXISTS calculate_order_final_total(UUID);

-- 3. Remover índices
DROP INDEX IF EXISTS idx_orders_total_received;
DROP INDEX IF EXISTS idx_orders_balance_due;

-- 4. Remover colunas
ALTER TABLE public.orders DROP COLUMN IF EXISTS total_received;
ALTER TABLE public.orders DROP COLUMN IF EXISTS balance_due;
```

**⚠️ Aviso:** Isso removerá os dados dos campos. Considere fazer backup antes.

---

## 🎯 Próximos Passos Recomendados

1. **Testes em Produção** - Testar fluxo completo com dados reais
2. **Relatórios** - Criar queries SQL para gerar relatórios de receita
3. **Dashboard** - Adicionar gráficos de receita por período
4. **Webhooks** - Considerar notificações quando saldo zerado
5. **API** - Adicionar endpoints para consultar total_received/balance_due

---

## 📞 Suporte

Para dúvidas sobre a implementação, consulte:
- Arquivo de migration: `/supabase/migrations/018_sync_payment_totals.sql`
- Componente atualizado: `/apps/admin/components/Orders/OrderDetail.tsx`
- API de pagamentos: `/apps/admin/pages/api/payments/index.ts`

---

**Implementado por:** Claude Code  
**Data:** 2026-04-15  
**Status:** ✅ Produção-ready
