# 🔍 ANÁLISE: Fluxo de Pedidos Quebrado

**Data:** 14 de Abril de 2026  
**Status:** ❌ Incompleto - Faltam etapas críticas

---

## 📊 O QUE ESTÁ FUNCIONANDO ✅

### Etapa 1: Cliente Acessa Catálogo (Web App)
- **Arquivo:** `apps/web/pages/pedido/index.tsx`
- ✅ Cliente vê produtos
- ✅ Cliente seleciona data/horário
- ✅ Cliente confirma quantidade e customizações

### Etapa 2: Gera Resumo e Envia WhatsApp
- **Arquivo:** `apps/web/pages/pedido/index.tsx` (linhas 59-89)
- ✅ Função `generateOrderSummary()` cria formatação correta
- ✅ Redireciona para WhatsApp com: `https://wa.me/5551999056903?text=...`
- ✅ Resumo segue padrão: `Gostaria de fazer um pedido:\nData...\nHorário...\nItens...\nTotal...`

**Exemplo de resumo enviado:**
```
Gostaria de fazer um pedido:
Data da Encomenda: 2026-04-16
Horário: 14:30
• 151x Beijinho
• 233x Brigadeiro
• 3x Rocambole
Total: R$ 700.67
```

### Etapa 3: Extração via Regex ✅
- **Arquivo:** `supabase/functions/process-message/index.ts` (linhas 103-168)
- ✅ Detecta padrão `isWebAppOrder` (linha 103)
- ✅ Extrai via regex:
  - `dateMatch` → Data da Encomenda
  - `timeMatch` → Horário
  - `totalMatch` → Valor total
  - `productLines` → Itens (linhas começando com `•`)
- ✅ Mapeia produtos aos IDs do catálogo
- ✅ Calcula quantidade de cada item

### Etapa 4: Cria Rascunho de Pedido ✅
- **Arquivo:** `supabase/functions/process-message/index.ts` (linhas 340-407)
- ✅ Função `createDraftOrder()` cria:
  - `orders` com `status: "PENDENTE"`
  - `order_items` com produtos e quantidades
  - Nota: `Criado via WhatsApp`

### Etapa 5: Exibe na Aba Lateral ✅
- **Arquivo:** `apps/admin/components/Messages/OrderContextPanel.tsx` (linhas 94-96)
- ✅ Carrega pedido com status `PENDENTE`
- ✅ Auto-seleciona na aba "Pedido"
- ✅ Mostra `OrderDetail` compacto

---

## ❌ O QUE ESTÁ FALTANDO

### 🚨 Etapa 6: Operadora NÃO consegue CONFIRMAR o pedido
- ❌ Não há botão "Confirmar Pedido" na interface
- ❌ `OrderDetail` não tem ação de confirmação
- ❌ Status não muda de `PENDENTE` para `CONFIRMADO`

**Arquivo afetado:** `apps/admin/components/Orders/OrderDetail.tsx`
**Necessário:** Adicionar botão "✅ Confirmar Pedido" que:
1. Valida se todos os itens têm produto_id
2. UPDATE orders SET status = 'CONFIRMADO'
3. INSERT em order_changes com "Confirmado pela operadora"

---

### 🚨 Etapa 7: Sistema NÃO gera PIX após confirmação
- ❌ Não há integração com Pix (Mercado Pago, Infomaniak, etc.)
- ❌ Não há cálculo de sinal (30% padrão)
- ❌ Não há endpoint para gerar link PIX

**Necessário:**
1. Configurar provider de Pix (qual usar?)
2. Após confirmação → Gerar link PIX para sinal (30%)
3. Armazenar link PIX em `orders.pix_url` ou tabela `payments`

---

### 🚨 Etapa 8: Operadora NÃO envia PIX para cliente
- ❌ Sem botão "Enviar PIX via WhatsApp"
- ❌ Sem integração com Z API para enviar mensagem
- ❌ Cliente nunca recebe o link do PIX

**Necessário:**
1. Após PIX ser gerado, mostrar botão "📤 Enviar PIX para Cliente"
2. Clicar → Enviar via Z API para `customers.phone`
3. Mensagem padrão:
   ```
   ✅ Seu pedido foi confirmado!
   
   💰 PIX para pagar o sinal:
   [Link ou Cópia e Cola]
   
   Valor: R$ 210.20
   
   Pedido: #IA-123456
   Data de Retirada: 16/04/2026 às 14:30
   ```

---

## 🔧 RESUMO DA QUEBRA

| Etapa | Status | Arquivo | Ação Necessária |
|-------|--------|---------|-----------------|
| 1. Cliente acessa catálogo | ✅ OK | `pedido/index.tsx` | - |
| 2. Envia resumo via WhatsApp | ✅ OK | `pedido/index.tsx` | - |
| 3. Extrai via regex | ✅ OK | `process-message/index.ts` | - |
| 4. Cria rascunho | ✅ OK | `process-message/index.ts` | - |
| 5. Mostra na aba lateral | ✅ OK | `OrderContextPanel.tsx` | - |
| **6. Operadora confirma** | ❌ FALTA | `OrderDetail.tsx` | Adicionar botão + API |
| **7. Gera PIX** | ❌ FALTA | Novo endpoint | Integração com Pix |
| **8. Envia PIX para cliente** | ❌ FALTA | Novo endpoint | Z API + Z SMS |

---

## 📝 PRÓXIMOS PASSOS

Para completar o fluxo, você precisará implementar:

1. **Botão de Confirmação** em `OrderDetail`
   - Arquivo: `apps/admin/components/Orders/OrderDetail.tsx`
   - Validação de itens
   - UPDATE status → CONFIRMADO

2. **Geração de PIX**
   - Qual provider usar? (Mercado Pago, Infomaniak, etc.)
   - Endpoint: `POST /api/payments/generate-pix`
   - Body: `{ orderId, amount }`

3. **Envio de PIX via WhatsApp**
   - Endpoint: `POST /api/payments/send-pix-via-zapi`
   - Integração com Z API
   - Template de mensagem

4. **Armazenamento de PIX**
   - Criar tabela `payments` ou adicionar em `orders`:
   ```sql
   ALTER TABLE orders ADD COLUMN (
     pix_url VARCHAR,
     pix_qr_code TEXT,
     sinal_valor DECIMAL,
     sinal_status VARCHAR -- PENDENTE, PAGO
   );
   ```

---

## ✨ FLUXO CORRETO ESPERADO

```
CLIENTE
  ↓
1. Acessa /pedido (catálogo web)
  ↓
2. Seleciona produtos + data/hora
  ↓
3. Clica "Finalizar Pedido"
  ↓
4. Redireciona para WhatsApp com resumo
  ↓
5. Operador vê em supabase orders (PENDENTE)

OPERADOR (Painel Admin)
  ↓
6. Abre OrderContextPanel
  ↓
7. Vê pedido PENDENTE na aba lateral
  ↓
8. Clica "✅ CONFIRMAR PEDIDO"
  ↓
9. Sistema gera PIX (30% do total)
  ↓
10. Operador clica "📤 ENVIAR PIX PARA CLIENTE"
  ↓
11. Z API envia mensagem com link PIX
  ↓
12. Cliente copia PIX e paga
  ↓
13. Webhook recebe confirmação
  ↓
14. Status muda para "SINAL_PAGO"
```

---

*Análise completa do fluxo de pedidos. Aguardando implementação das etapas 6-8.*
