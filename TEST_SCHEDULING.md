# 🧪 TESTE RÁPIDO — AGENDAMENTO + PEDIDOS

**Faça os testes abaixo para validar a implementação:**

---

## 1️⃣ ACESSAR CALENDÁRIO

```
URL: http://localhost:3000/dashboard/scheduling
Esperado:
- ✅ Calendário do mês atual carrega
- ✅ Dias têm cores (verde/amarelo/vermelho)
- ✅ Mostra quantidade de pedidos/capacidade
- ✅ Botões de navegação (< >) funcionam
```

**Se tiver erro:**
- Verificar que `delivery_slots` table existe
- Verificar que migration 004 foi aplicada
- Verificar types.ts tem `delivery_slots`

---

## 2️⃣ GERENCIAR DATA

```
Ação: Clicar em um dia verde (disponível)
Esperado:
- ✅ Modal abre
- ✅ Mostra: "X/20 pedidos"
- ✅ Há opção para "Bloquear Data" (ADMIN only)
- ✅ Há input para editar capacidade máxima

Ação: Bloquear uma data
Esperado:
- ✅ Modal fecha
- ✅ Dia fica vermelho
- ✅ Motivo aparece ao hover
- ✅ Botão muda para "Desbloquear"

Ação: Desbloquear data
Esperado:
- ✅ Dia volta à cor anterior
- ✅ Modal fecha
```

---

## 3️⃣ CRIAR NOVO PEDIDO

```
URL: http://localhost:3000/dashboard/orders/new
Esperado:
- ✅ Formulário carrega com:
  - [ ] Seleção de cliente (dropdown)
  - [ ] DeliveryDateSelector (com validação)
  - [ ] Seleção de tipo (ENTREGA/RETIRADA)
  - [ ] Grid de produtos para adicionar
  - [ ] Lista de itens selecionados
  - [ ] Cálculo automático de sinal
  - [ ] Botão "Criar Pedido"
```

**Teste 1: Data Válida**
```
1. Selecionar cliente
2. Selecionar data 5+ dias no futuro
3. DeliveryDateSelector deve mostrar:
   - ✅ "✅ Disponível - X slots"
   - ✅ Info "Prazo mínimo de 48 horas"
4. Adicionar 1+ produtos
5. Clicar "Criar Pedido"
Esperado:
- ✅ Mensagem "Pedido criado com sucesso!"
- ✅ Redireciona para detalhe do pedido
- ✅ Verificar em /dashboard/scheduling que slot foi incrementado
```

**Teste 2: Data Bloqueada**
```
1. Ir para /dashboard/scheduling
2. Bloquear uma data próxima
3. Voltar para /dashboard/orders/new
4. Tentar selecionar data bloqueada
Esperado:
- ✅ DeliveryDateSelector mostra erro em vermelho
- ✅ Mensagem: "Data indisponível: [motivo]"
- ✅ Botão "Criar Pedido" fica desabilitado
```

**Teste 3: Capacidade Cheia**
```
1. Ir para /dashboard/scheduling
2. Editar data para max_orders = 1
3. Se houver 1+ pedido nessa data, ela fica CHEIO
4. Tentar criar novo pedido para esse dia
Esperado:
- ✅ DeliveryDateSelector mostra erro
- ✅ Mensagem: "Capacidade atingida... Escolha outra data"
- ✅ Não consegue criar
```

**Teste 4: Prazo Mínimo**
```
1. Tentar selecionar data de hoje ou amanhã
Esperado:
- ✅ DeliveryDateSelector mostra erro
- ✅ Mensagem: "Prazo mínimo é 48 horas..."
- ✅ Sugere data futura válida
```

---

## 4️⃣ DASHBOARD WIDGETS

```
URL: http://localhost:3000/dashboard
Esperado na seção "AGENDAMENTO (Próximos 7 dias)":
- ✅ Widget mostra próximos 7 dias
- ✅ Cada dia tem ícone de status (✅/⚠️/🚫)
- ✅ Mostra X/Y pedidos
- ✅ Há link "Gerenciar calendário →"

Ação: Clicar no link
Esperado:
- ✅ Navega para /dashboard/scheduling
```

---

## 5️⃣ CANCELAR PEDIDO

**Preparar:**
1. Criar um pedido novo
2. Notar qual a data de entrega
3. Anotar quantos pedidos há para esse dia (ex: 5/20)

```
Ação: Clicar em "Cancelar Pedido" (no detalhe)
Esperado:
- ✅ Modal de confirmação aparece
- ✅ Após confirmar, pedido marcado como CANCELADO
- ✅ Ir para /dashboard/scheduling
- ✅ Data agora mostra 4/20 pedidos (decrementou)
```

---

## 6️⃣ PERMISSÕES

```
Teste como ATENDENTE:
- ✅ Botão "Novo Pedido" NÃO aparece em /dashboard/orders
- ✅ Se digitar /dashboard/orders/new manualmente:
  - Redireciona ou mostra erro (confirmar behavior)

Teste como ADMIN:
- ✅ Botão "Novo Pedido" aparece
- ✅ Consegue criar pedidos
- ✅ Consegue bloquear datas em calendário
- ✅ Consegue editar capacidade

Teste como GERENTE:
- ✅ Botão "Novo Pedido" aparece
- ✅ Consegue criar pedidos
- ✅ Consegue bloquear datas
- ✅ Consegue editar capacidade
```

---

## 7️⃣ BANCO DE DADOS

**Verificar dados em Supabase:**

```sql
-- Verificar slots criados
SELECT COUNT(*) FROM delivery_slots
-- Esperado: ~90 registros

-- Verificar slots com pedidos
SELECT date, current_orders, max_orders 
FROM delivery_slots 
WHERE current_orders > 0
ORDER BY date DESC

-- Verificar pedidos criados
SELECT number, delivery_date, status, payment_status
FROM orders
ORDER BY created_at DESC
LIMIT 5

-- Verificar histórico de mudanças
SELECT field, old_value, new_value, created_at
FROM order_changes
ORDER BY created_at DESC
```

---

## ❌ RESOLUÇÃO DE PROBLEMAS

### Erro: "delivery_slots table not found"
```
Solução:
1. Verificar que migration 004 foi executada
2. SELECT * FROM delivery_slots LIMIT 1;
3. Se falhar, executar migration novamente
```

### Erro: "DeliveryDateSelector não aparece"
```
Solução:
1. Verificar path: apps/admin/components/Orders/DeliveryDateSelector.tsx
2. Verificar import: import { DeliveryDateSelector } from '@/components/Orders/DeliveryDateSelector'
3. Verificar types.ts tem delivery_slots
```

### Calendário não mostra datas
```
Solução:
1. Verificar que initialize_delivery_slots() foi executado
2. Abrir Supabase SQL Editor
3. Executar: SELECT initialize_delivery_slots();
```

### Slot não decrementa ao criar pedido
```
Solução:
1. Verificar console para erros
2. Verificar que useDeliverySlots hook foi chamado
3. Verificar que incrementSlotCount() foi chamada no submit
```

---

## 📋 CHECKLIST FINAL

- [ ] Calendário carrega e mostra dias
- [ ] Consegue bloquear/desbloquear datas
- [ ] Consegue criar novo pedido
- [ ] Data válida é aceita
- [ ] Data bloqueada é rejeitada
- [ ] Capacidade cheia é rejeitada
- [ ] Prazo mínimo é validado
- [ ] Slot counter incrementa ao criar
- [ ] Slot counter decrementa ao cancelar
- [ ] Dashboard widget mostra próximos 7 dias
- [ ] Permissões funcionam (ATENDENTE não vê botão)
- [ ] Logs em order_changes são criados

---

Se tudo passar: **✅ Sistema de Agendamento Funcionando!**

Se algo falhar: Checar console (browser + servidor) para erros específicos.

---

*Teste criado em 9 de Abril de 2026*
