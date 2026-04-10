# 🚀 PROMPTS PARA PHASE 4 + 5 — WhatsApp + Agendamento

**Foco:** Pedidos + Financeiro (sem produção)  
**Timeline:** 5-6 dias  
**Resultado:** Sistema recebendo pedidos via WhatsApp + agendamento de entregas

---

# ⚡ PHASE 4.1 — WhatsApp Integration

## TAREFA 4.1.1: Criar Edge Function webhook-zapi

Cole este prompt no Claude Code:

```
Crie a Edge Function: supabase/functions/webhook-zapi/index.ts

Contexto:
- Projeto: Puro Sabor IA (Next.js + Supabase)
- Objetivo: Receber mensagens do WhatsApp via Z API
- Foco: Apenas RECEBER e ARMAZENAR mensagens (não processar agora)
- Segurança: Validar token antes de processar

Implementação:

1. FUNÇÃO PRINCIPAL:
   - Endpoint: POST /functions/v1/webhook-zapi
   - Validar header: X-ZApi-Token (comparar com env var ZAPI_SECURITY_TOKEN)
   - Retornar 401 se token inválido
   - Retornar 200 OK em < 3s (Z API exige resposta rápida)

2. FLUXO DE DADOS:
   a) Receber JSON da Z API:
      {
        "phone": "5511999999999",
        "message": "Oi, quero um bolo de chocolate",
        "type": "TEXT|IMAGE|AUDIO",
        "mediaUrl": "https://...",
        "messageId": "msg_12345"  // ID único para deduplicação
      }

   b) DEDUPLICAR por messageId:
      - SELECT * FROM messages WHERE message_ref = messageId
      - Se existe, retornar 200 OK (ignore duplicada)
      - Se não existe, continuar

   c) BUSCAR OU CRIAR CUSTOMER:
      - SELECT * FROM customers WHERE phone = phone
      - Se não existe, INSERT novo customer com phone e nome=phone

   d) INSERIR MENSAGEM na tabela:
      - INSERT INTO messages (customer_id, phone, direction, type, content, media_url, message_ref, ai_handled)
      - direction = 'INBOUND'
      - ai_handled = false (será processado depois)

   e) RETORNAR 200 OK (rápido, sem esperar processamento)

3. TRATAMENTO DE ERROS:
   - Erro no Supabase: log e retornar 200 (não perder mensagem)
   - Timeout: retornar 503 Service Unavailable
   - Corpo inválido: retornar 400

4. LOGS:
   - console.log() para cada passo importante
   - console.error() para erros críticos

RESULTADO ESPERADO:
- Mensagens do WhatsApp aparecem em supabase.from('messages')
- Console mostra: "Mensagem recebida de 5511999999999: Oi, quero um bolo"
- Sem erros
```

---

## TAREFA 4.1.2: Criar Edge Function process-message

Cole este prompt no Claude Code:

```
Crie a Edge Function: supabase/functions/process-message/index.ts

Contexto:
- Objetivo: Processar mensagem com Claude API e tomar decisão
- Entrada: messageId (a função busca message_ref no banco)
- Decisão: REPLY | CREATE_ORDER | REQUEST_INFO | ESCALATE
- Não bloqueia: webhook-zapi já retornou 200, isso é async

Implementação:

1. FUNÇÃO PRINCIPAL:
   - Recebe: { messageId: "msg_12345" }
   - Não retorna resposta específica (fire-and-forget)
   - Log de sucesso/erro

2. BUSCAR CONTEXTO:
   - Mensagem atual (content, phone)
   - Customer (id, name, phone)
   - Histórico de últimas 5 mensagens deste cliente
   - Produtos ativos (name, price, description)
   - Settings (bakery_name, opening_hours, ai_prompt)

3. CHAMAR CLAUDE API:
   
   Usar: Anthropic SDK ou fetch para Claude API
   Model: claude-3-5-haiku-20241022 (rápido, barato)
   
   System Prompt (customizável):
   "Você é assistente de vendas da Puro Sabor.
   Fale português, tom amigável e profissional.
   Catálogo disponível: [lista de produtos]
   Regras: prazo mínimo 48h, máximo desconto 15%
   
   Analise a mensagem do cliente e responda em JSON válido:
   {
     \"action\": \"REPLY\" | \"CREATE_ORDER\" | \"REQUEST_INFO\" | \"ESCALATE\",
     \"message\": \"Sua resposta para o cliente\",
     \"order\": { \"product\": \"...\", \"quantity\": 1, \"notes\": \"...\" },
     \"reason\": \"Por que tomou esta ação\"
   }"

4. PROCESSAR RESPOSTA DO CLAUDE:
   - Parse JSON da resposta
   - Se action = "REPLY": enviar mensagem de volta via Z API
   - Se action = "CREATE_ORDER": INSERT em orders table
   - Se action = "REQUEST_INFO": enviar REPLY questionando mais
   - Se action = "ESCALATE": marcar ai_handled = false para operadora

5. ATUALIZAR BANCO:
   - UPDATE messages SET ai_processed = true, ai_response = response
   - INSERT em order_changes se criou pedido
   - UPDATE orders se criou

6. TRATAMENTO DE ERROS:
   - Erro ao chamar Claude: log e não escalar (tenta depois)
   - Erro ao enviar resposta: retente 3x antes de desistir
   - Response inválida: escalate para operadora

RESULTADO ESPERADO:
- Mensagem é processada e resposta enviada ao cliente
- Se cliente quer pedir: order criada no dashboard
- Se quer mais info: Claude pede detalhes
- Se muito complexo: escalate para operadora ver
```

---

## TAREFA 4.1.3: Criar Mock Z API para testes

Cole este prompt no Claude Code:

```
Crie: apps/admin/pages/api/dev/mock-zapi.ts

Contexto:
- API local que simula Z API para desenvolvimento
- Não usar em produção
- Permite testar webhook-zapi sem contrato Z API real

Implementação:

1. ENDPOINT:
   POST /api/dev/mock-zapi
   
   Body:
   {
     "phone": "5511999999999",
     "message": "Oi, quero um bolo",
     "type": "TEXT",
     "mediaUrl": null
   }

2. FLUXO:
   - Gerar messageId único (uuid)
   - Construir payload igual Z API
   - Chamar webhook-zapi local: http://localhost:3001/api/webhooks/zapi
   - Retornar resultado

3. TESTES SUGERIDOS:
   - POST /api/dev/mock-zapi com mensagem simples
   - Verificar se apareceu em supabase.from('messages')
   - Testar mensagem duplicada (mesmo messageId)
   - Testar várias mensagens em sequência

RESULTADO ESPERADO:
- POST /api/dev/mock-zapi funciona
- Mensagem aparece no Supabase
- Console não tem erros
```

---

# 📅 PHASE 4.2 — Agendamento de Pedidos

## TAREFA 4.2.1: Criar Calendário de Agendamento

Cole este prompt no Claude Code:

```
Crie: apps/admin/pages/dashboard/scheduling/index.tsx

Contexto:
- Calendário para visualizar disponibilidade de entrega
- Mostrar dias abertos/bloqueados
- Permitir bloquear datas (feriado, manutenção)
- Mostrar capacidade restante por dia

Implementação:

1. TABELA NO BANCO:
   CREATE TABLE IF NOT EXISTS delivery_slots (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     date DATE NOT NULL,
     max_orders INT DEFAULT 20,
     current_orders INT DEFAULT 0,
     blocked BOOLEAN DEFAULT false,
     blocked_reason TEXT,
     created_at TIMESTAMP DEFAULT NOW()
   );

2. COMPONENTES:
   - Calendar view (usar: react-calendar ou date-fns)
   - Dia aberto: verde, mostra "12/20 pedidos"
   - Dia bloqueado: vermelho, mostra motivo
   - Dia cheio: amarelo, mostra "CHEIO"

3. FUNCIONALIDADES:
   a) Clicar em dia → modal para:
      - Ver pedidos agendados
      - Bloquear data (input motivo)
      - Desbloquear
      - Editar máximo de pedidos/dia

   b) Drag-drop para alterar capacidade (opcional)

4. QUERIES SUPABASE:
   - GET slots: SELECT * FROM delivery_slots WHERE date >= TODAY ORDER BY date
   - POST bloquear: INSERT ou UPDATE delivery_slots SET blocked = true
   - PUT desbloquear: UPDATE delivery_slots SET blocked = false
   - COUNT pedidos: SELECT COUNT(*) FROM orders WHERE delivery_date = DATE

5. PERMISSÕES:
   - Somente ADMIN/GERENTE podem bloquear/editar
   - ATENDENTE vê capacidade

RESULTADO ESPERADO:
- Calendário mostra dias com capacidade
- Pode bloquear/desbloquear datas
- Motivo do bloqueio aparece ao hover
```

---

## TAREFA 4.2.2: Integrar Agendamento com Criação de Pedidos

Cole este prompt no Claude Code:

```
Atualize: apps/admin/pages/dashboard/orders/[id].tsx (ou novo form de pedido)

Contexto:
- Ao criar pedido, verificar capacidade do dia escolhido
- Se cheio, impedir ou oferecer alternativas
- Atualizar contador de delivery_slots

Implementação:

1. AO SELECIONAR DATA DE ENTREGA:
   a) Buscar: SELECT * FROM delivery_slots WHERE date = selected_date
   
   b) Verificar:
      - Se blocked = true: mostrar "Data indisponível: [motivo]"
      - Se current_orders >= max_orders: mostrar "Capacidade cheia"
      - Se data < 48h: mostrar "Prazo mínimo 48 horas"
   
   c) Se OK: mostrar "✅ Disponível (X/Y slots)"

2. AO CONFIRMAR PEDIDO:
   - INSERT orders com delivery_date = selected_date
   - UPDATE delivery_slots SET current_orders = current_orders + 1
   - Log em order_changes

3. AO CANCELAR PEDIDO:
   - UPDATE orders SET status = 'CANCELADO'
   - UPDATE delivery_slots SET current_orders = current_orders - 1

4. TRATAMENTO DE ERROS:
   - Se slot desapareceu entre seleção e confirmação: retry automático
   - Se capacidade mudou: notificar operadora

RESULTADO ESPERADO:
- Não consegue agendar em dia bloqueado
- Não consegue agendar com menos de 48h
- Capacidade diminui quando cria pedido
- Capacidade aumenta quando cancela pedido
```

---

## TAREFA 4.2.3: Dashboard de Agendamento (Próximos 7 dias)

Cole este prompt no Claude Code:

```
Atualize: apps/admin/pages/dashboard/index.tsx

Adicione ao "BLOCO PENDÊNCIAS":

┌─────────────────────────────────────────────┐
│ 📅 AGENDAMENTO (PRÓXIMOS 7 DIAS)            │
├─────────────────────────────────────────────┤
│ Hoje (9/Abr)         → 12/20 pedidos ✅    │
│ Amanhã (10/Abr)      → 18/20 pedidos ✅    │
│ 11/Abr               → 20/20 CHEIO ⚠️       │
│ 12/Abr               → BLOQUEADO 🚫         │
│ 13/Abr               → 5/20 pedidos ✅     │
│                                             │
│ [Gerenciar calendário →]                   │
└─────────────────────────────────────────────┘

Queries:
- SELECT date, blocked, blocked_reason, 
         current_orders, max_orders
  FROM delivery_slots 
  WHERE date BETWEEN TODAY AND TODAY + 7 days
  ORDER BY date

- Para cada dia: cor indicador (verde/amarelo/vermelho)

RESULTADO ESPERADO:
- Dashboard mostra capacidade dos próximos 7 dias
- Clique em dia leva ao calendário detalhado
```

---

# 📋 COMO USAR ESTES PROMPTS

```
1. Cole TAREFA 4.1.1 no Claude Code
   └─ Espere completar

2. Cole TAREFA 4.1.2 no Claude Code
   └─ Espere completar

3. Cole TAREFA 4.1.3 no Claude Code
   └─ Teste: POST /api/dev/mock-zapi

4. Cole TAREFA 4.2.1 no Claude Code
   └─ Teste calendário em /dashboard/scheduling

5. Cole TAREFA 4.2.2 no Claude Code
   └─ Teste criação de pedido com data

6. Cole TAREFA 4.2.3 no Claude Code
   └─ Teste dashboard com agendamento

7. Teste INTEGRAÇÃO:
   - POST /api/dev/mock-zapi com mensagem
   - Mensagem aparece em messages
   - Process-message responde
   - Se pedir bolo → order criada
   - Capacidade do dia atualizada
```

---

# ✅ CHECKLIST

```
PHASE 4.1 - WhatsApp:
[ ] webhook-zapi recebe mensagens
[ ] process-message processa com Claude
[ ] Mock Z API funciona
[ ] Console sem erros

PHASE 4.2 - Agendamento:
[ ] Calendário mostra disponibilidade
[ ] Pode bloquear/desbloquear datas
[ ] Pedido valida capacidade
[ ] Dashboard mostra próximos 7 dias
[ ] Capacidade atualiza ao criar/cancelar

INTEGRAÇÃO:
[ ] Mensagem via WhatsApp cria pedido
[ ] Pedido respeita limite de capacidade
[ ] Tudo sincronizado em tempo real
```

---

*Pronto para executar! Comece pela TAREFA 4.1.1* 🚀
