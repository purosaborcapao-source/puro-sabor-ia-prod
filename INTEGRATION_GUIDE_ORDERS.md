# 📋 GUIA DE INTEGRAÇÃO — ORDERS + SCHEDULING

**Data:** 9 de Abril de 2026  
**Status:** ✅ Completo

---

## 🎯 O QUE FOI INTEGRADO

### 1. Criação de Pedidos com Agendamento
- **Arquivo:** `apps/admin/pages/dashboard/orders/new.tsx`
- ✅ Formulário completo de criação de pedido
- ✅ Validação de agendamento (prazo mínimo + capacidade)
- ✅ Seleção de produtos com quantidade
- ✅ Cálculo automático de sinal (30% padrão)
- ✅ Incremento automático do slot counter

### 2. Cancelamento de Pedidos
- **Arquivo:** `apps/admin/pages/api/orders/cancel.ts`
- ✅ Endpoint seguro para cancelar pedidos
- ✅ Validação de permissões (ADMIN/GERENTE)
- ✅ Decremento automático do slot counter
- ✅ Registro em order_changes

### 3. Página de Lista com Botão
- **Arquivo:** `apps/admin/pages/dashboard/orders/index.tsx` (atualizado)
- ✅ Botão "Novo Pedido" no header
- ✅ Link para formulário de criação

---

## 🔄 FLUXO DE FUNCIONAMENTO

### Criar Pedido
```
1. Usuário clica em "Novo Pedido"
2. Página /dashboard/orders/new carrega
3. Usuário seleciona cliente
4. DeliveryDateSelector valida:
   - Prazo mínimo (48h)
   - Data não bloqueada
   - Capacidade disponível
5. Usuário adiciona produtos
6. Sistema calcula valores
7. Ao submeter:
   - Valida agendamento novamente
   - Cria ordem em banco
   - Cria order_items
   - Incrementa delivery_slots.current_orders
   - Redireciona para detalhe
```

### Cancelar Pedido
```
1. Usuário clica em "Cancelar" (em OrderDetail)
2. POST /api/orders/cancel com orderId
3. Server valida permissões
4. Atualiza order.status = CANCELADO
5. Decrementa delivery_slots.current_orders
6. Loga em order_changes
7. Retorna sucesso ao cliente
```

---

## 📚 COMO USAR

### Criar Novo Pedido (Frontend)
```tsx
// Simplesmente navegue para:
/dashboard/orders/new

// Ou adicione link:
<Link href="/dashboard/orders/new">Novo Pedido</Link>
```

### Cancelar Pedido (Frontend)
```tsx
const handleCancel = async () => {
  const response = await fetch('/api/orders/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId }),
  })

  if (response.ok) {
    // Sucesso - atualizar UI ou redirecionar
    window.location.reload()
  }
}
```

---

## 📊 ARQUITETURA

### Componentes
```
DeliveryDateSelector
├─ Integra useDeliverySlots hook
├─ Valida data em tempo real
├─ Mostra mensagens de status
└─ Impede seleção de datas inválidas

OrderForm (new.tsx)
├─ Seleção de cliente
├─ Seleção de data (via DeliveryDateSelector)
├─ Adição de produtos
├─ Cálculo de valores
└─ Submission com validação
```

### APIs
```
POST /api/orders/cancel
├─ Validação de JWT
├─ Verificação de role (ADMIN/GERENTE)
├─ Atualização de order
├─ Decremento de slots
└─ Log em order_changes
```

### Hooks
```
useDeliverySlots()
├─ validateDeliveryDate(date)
├─ incrementSlotCount(date)
├─ decrementSlotCount(date)
└─ getAvailableDates()
```

---

## 🔐 SEGURANÇA

✅ **Validação de Permissões**
- Somente ADMIN/GERENTE podem criar/cancelar
- JWT verificado em API routes

✅ **Validação de Dados**
- Prazo mínimo obrigatório
- Data não pode estar bloqueada
- Capacidade deve estar disponível

✅ **Logs**
- Todas as alterações registradas em order_changes
- Rastreamento de quem fez cada ação

---

## 🧪 CHECKLIST DE TESTES

- [ ] Criar novo pedido com agendamento válido
- [ ] Tentar criar com data bloqueada (deve falhar)
- [ ] Tentar criar com capacidade cheia (deve falhar)
- [ ] Adicionar múltiplos produtos
- [ ] Editar quantidade de produtos
- [ ] Validar cálculo de sinal (30% padrão)
- [ ] Cancelar pedido e verificar slot decrementado
- [ ] Verificar que calendar atualiza (próximos 7 dias)
- [ ] Tentar criar com role ATENDENTE (deve ter botão desabilitado)
- [ ] Verificar logs em order_changes

---

## 🚀 PRÓXIMOS PASSOS

### Curto Prazo
- [ ] Botão de cancelamento em OrderDetail
- [ ] Confirmação antes de cancelar (modal)
- [ ] Atualização em tempo real da capacidade
- [ ] Email/WhatsApp de confirmação

### Médio Prazo
- [ ] Edição de pedidos (com revalidação de agendamento)
- [ ] Exportar calendário (Google Calendar, iCal)
- [ ] Alertas de capacidade (95% cheio)
- [ ] Lembretes de entrega (24h antes)

### Longo Prazo
- [ ] Agendamento automático via WhatsApp
- [ ] Sugestão de datas via IA
- [ ] Histórico de agendamento por cliente
- [ ] Relatórios de utilização

---

## 📞 SUPORTE

### Perguntas Frequentes

**P: Como mudo o prazo mínimo padrão (48h)?**
A: Edite `apps/admin/hooks/useDeliverySlots.ts` linha 7:
```tsx
const MIN_LEAD_TIME_HOURS = 48 // Mude este valor
```

**P: Posso ter diferentes prazo mínimos por tipo de produto?**
A: Sim, mas requer mudanças no schema. Entre em contato para implementação.

**P: Como faço backup do calendário?**
A: Exportar via Supabase Dashboard > SQL Editor > SELECT * FROM delivery_slots

**P: Posso sincronizar com Google Calendar?**
A: Sim! Usar iCalendar format. Implementação em FASE 6.

---

## 📝 NOTAS IMPORTANTES

1. **Slots são criados automaticamente** para próximos 90 dias ao migrar
2. **Domingos são excluídos** por padrão
3. **Contador de slots** é atualizado em tempo real
4. **RLS policies** garantem que dados corretos são acessados
5. **Índices** foram criados para queries rápidas

---

*Documentação criada em 9 de Abril de 2026*
