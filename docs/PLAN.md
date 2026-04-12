# PLAN: Auto-generate Orders from Web App (No AI)

## Problem
Currently, when a customer uses the Web App catalog to format their cart, it sends a standardized message to WhatsApp (e.g., `"Olá! Gostaria de fazer um pedido: ... Total: R$ 474,50"`). The AI edge function attempts to process it, but only creates a `RASCUNHO_IA` order header with the items dumped as text in the `notes`. Operators have to manually type everything again.

## Goal
Bypass AI entirely for these specific catalog orders to ensure 100% accuracy, zero cost, and instant processing.

## Proposed Strategy: "Zero-AI Order Builder"

### Backend Component (`webhook-zapi` / `process-message`)
#### [MODIFY] `supabase/functions/webhook-zapi/index.ts` (ou utilitário similar)
- **Interceptão Exata:** Adicionar uma verificação rápida no momento que a mensagem chega.
  `if (content.startsWith("Olá! Gostaria de fazer um pedido:\n\n"))`
- **Extração com Código (Sem Inteligência):** Fazer um "split" do texto. Ler cada linha que começa com `•`.
- **Match no Banco de Dados:** Comparar o nome extraído (ex: "Branquinho") com a coluna `name` da tabela secundária `products` usando o Supabase Client para descobrir o `product_id`.
- **Criação do Pedido Definitivo:** Se tudo for encontrado, criar o pedido (`orders`) e preencher automaticamente o carrinho (`order_items`). Como não usamos IA e os dados vieram do app, o pedido já pode cair imediatamente como `NOVO` ou `PENDENTE` (pronto), em vez de `RASCUNHO_IA`.

### Frontend Component (`apps/admin/components/Orders`)
- Como a conversão foi feita sem IA e é garantida, a dashboard funcionará perfeitamente sem precisar de um botão extra para "Aprovar Pre-Pedido", pois o `order_items` foi preenchido de forma exata pela lógica de código.
- A operadora apenas vê o pedido prontinho com os itens para iniciar o atendimento ou o preparo.

---

## Verification Plan

### Automated Tests
- Run `lint_runner.py` e `security_scan.py`.

### Manual Verification
- Enviar a mensagem exata de exemplo do Web App.
- Confirmar se `order_items` foi criado com os `product_id` corretos instantaneamente.
- Confirmar que NENHUMA requisição foi feita à API do Claude para esta mensagem.
