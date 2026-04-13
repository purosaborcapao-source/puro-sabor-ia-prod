# Manual de Auditoria Financeira — Puro Sabor

**Versão:** 1.0 | **Data:** 13/04/2026
**Para quem:** Proprietário, Gerente, e qualquer pessoa que opere o sistema financeiro

---

## O que foi implementado

O banco de dados agora registra automaticamente todas as movimentações financeiras. Nada precisa ser feito manualmente na maioria dos casos — os triggers (gatilhos automáticos) cuidam de tudo. Este manual explica o que cada pessoa precisa fazer no dia a dia para que a auditoria funcione corretamente.

---

## 1. Como funciona o registro automático

Toda vez que algo financeiro acontece, o sistema grava uma linha no **livro-razão** (`financial_ledger`). Isso acontece automaticamente quando:

| Ação | O que é gravado | Tipo no ledger |
|------|----------------|----------------|
| Pedido muda para CONFIRMADO | Receita do valor total | `RECEITA_PEDIDO` |
| Pagamento é confirmado | Valor recebido + método (PIX, cartão, etc.) | `PAGAMENTO_RECEBIDO` |
| Pedido é cancelado | Estorno do valor (negativo) | `CANCELAMENTO` |
| Pagamento confirmado é rejeitado depois | Estorno (negativo) | `ESTORNO` |

Ninguém consegue editar ou apagar esses registros. Eles são permanentes.

---

## 2. Rotina diária — O que cada pessoa faz

### ATENDENTE

O atendente trabalha normalmente com pedidos. O único cuidado é:

- **Ao registrar pagamento:** Escolher o método correto (PIX, Débito, Crédito, Dinheiro). Isso fica gravado para sempre no histórico.
- **Ao alterar um pedido:** A alteração é gravada automaticamente com seu nome. Não precisa fazer nada extra, mas deve ter certeza antes de alterar.
- **Ao adicionar/remover itens:** Cada adição ou remoção é registrada com o nome do produto, quantidade e valor.

### GERENTE / ADMIN

Além do que o atendente faz:

- **Confirmar pagamentos:** Quando um pagamento muda de "Aguardando Confirmação" para "Confirmado", o sistema grava no livro-razão automaticamente.
- **Fazer o fechamento diário** (ver seção 3).
- **Consultar relatórios** (ver seção 4).
- **Registrar ajustes manuais** quando necessário (ver seção 5).

---

## 3. Fechamento diário (OBRIGATÓRIO)

O fechamento diário é a única ação manual que PRECISA ser feita todos os dias. Ele garante que o que o sistema calculou confere com a realidade.

### Quando fazer
No final do expediente, ou no início do dia seguinte (referente ao dia anterior).

### Como fazer

Hoje não existe tela para isso. O registro deve ser feito via banco até a interface ser criada. Use o SQL abaixo no Supabase (SQL Editor):

```sql
INSERT INTO daily_closing (data, total_vendas, total_recebido, total_pendente, total_cancelamentos, pedidos_count, fechado_por, observacoes)
SELECT 
  '2026-04-13'::date,                                          -- Alterar para a data do dia
  COALESCE(SUM(CASE WHEN status != 'CANCELADO' THEN total END), 0),
  COALESCE(SUM(CASE WHEN payment_status = 'QUITADO' THEN total END), 0),
  COALESCE(SUM(CASE WHEN payment_status != 'QUITADO' AND status != 'CANCELADO' THEN total END), 0),
  COALESCE(SUM(CASE WHEN status = 'CANCELADO' THEN total END), 0),
  COUNT(*),
  NULL,                                                         -- Será preenchido com user_id quando tiver interface
  'Fechamento normal'                                           -- Observações do dia
FROM orders
WHERE delivery_date::date = '2026-04-13';                       -- Mesma data
```

### O que anotar nas observações
- Diferenças entre caixa físico e sistema
- Pagamentos recebidos fora do sistema
- Qualquer irregularidade

---

## 4. Como consultar relatórios

### Resumo mensal
```sql
SELECT * FROM vw_resumo_financeiro;
```
Retorna: faturamento bruto, descontos, taxas de entrega, cancelamentos, valor recebido, pendente, ticket médio — tudo por mês.

### Resumo diário
```sql
SELECT * FROM vw_resumo_diario;
```
Retorna: pedidos, faturamento, recebido, pendente, cancelados — por dia.

### Margem por produto
```sql
SELECT * FROM vw_margem_produto;
```
Retorna: preço de venda, custo, margem %, quantidade vendida, receita total, custo total, lucro bruto — por produto.

### Histórico de alterações de um pedido
```sql
SELECT 
  oc.field AS campo_alterado,
  oc.old_value AS valor_anterior,
  oc.new_value AS valor_novo,
  p.name AS alterado_por,
  oc.created_at AS quando
FROM order_changes oc
LEFT JOIN profiles p ON oc.changed_by = p.id
WHERE oc.order_id = 'ID_DO_PEDIDO_AQUI'
ORDER BY oc.created_at DESC;
```

### Livro-razão completo de um pedido
```sql
SELECT 
  fl.tipo,
  fl.valor,
  fl.descricao,
  p.name AS registrado_por,
  fl.created_at
FROM financial_ledger fl
LEFT JOIN profiles p ON fl.registrado_por = p.id
WHERE fl.order_id = 'ID_DO_PEDIDO_AQUI'
ORDER BY fl.created_at;
```

### Todos os pagamentos de um período
```sql
SELECT 
  fl.created_at::date AS data,
  fl.tipo,
  fl.valor,
  fl.descricao,
  o.number AS pedido,
  p.name AS responsavel
FROM financial_ledger fl
LEFT JOIN orders o ON fl.order_id = o.id
LEFT JOIN profiles p ON fl.registrado_por = p.id
WHERE fl.created_at >= '2026-04-01' AND fl.created_at < '2026-05-01'
ORDER BY fl.created_at;
```

---

## 5. Estornos e ajustes manuais

Quando um pagamento precisa ser corrigido (cliente pagou a mais, troco errado, estorno de cartão):

### Registrar ajuste
```sql
INSERT INTO payment_adjustments (payment_entry_id, order_id, tipo, valor, motivo, ajustado_por)
VALUES (
  'ID_DO_PAGAMENTO',     -- payment_entries.id
  'ID_DO_PEDIDO',        -- orders.id
  'ESTORNO',             -- ou 'CORRECAO' ou 'CHARGEBACK'
  -50.00,                -- valor negativo para estorno
  'Cliente pagou R$50 a mais no PIX',
  'SEU_USER_ID'          -- profiles.id de quem está fazendo
);
```

### Registrar entrada no livro-razão
```sql
INSERT INTO financial_ledger (order_id, tipo, valor, descricao, registrado_por)
VALUES (
  'ID_DO_PEDIDO',
  'AJUSTE_MANUAL',
  -50.00,
  'Estorno: cliente pagou R$50 a mais',
  'SEU_USER_ID'
);
```

---

## 6. O que NUNCA fazer

1. **NUNCA deletar registros** do `financial_ledger`. Se houve erro, crie um lançamento de `AJUSTE_MANUAL` com valor invertido.

2. **NUNCA editar diretamente** a tabela `payment_entries` no banco. Use sempre a interface do admin ou as queries de ajuste acima.

3. **NUNCA alterar o `total` de um pedido** diretamente. Altere os itens (adicione/remova) e o total recalcula sozinho.

4. **NUNCA ignorar o fechamento diário.** Sem ele, não tem como saber se o caixa bateu.

---

## 7. Campos que agora existem nos pedidos

| Campo | O que é | Quem preenche |
|-------|---------|---------------|
| `discount` | Valor do desconto dado | Atendente/Gerente ao criar/editar pedido |
| `discount_reason` | Motivo do desconto | Obrigatório quando há desconto |
| `delivery_fee` | Taxa de entrega | Atendente ao definir entrega |
| `cost_price_snapshot` (em order_items) | Custo do produto no momento do pedido | Automático (trigger) |

O **total do pedido** agora é calculado assim:
> Total = Soma dos itens - Desconto + Taxa de entrega

---

## 8. Resumo das tabelas novas

| Tabela | Função | Quem usa |
|--------|--------|----------|
| `financial_ledger` | Livro-razão imutável de toda movimentação | Sistema (automático) + Admin (ajustes) |
| `daily_closing` | Fechamento de caixa diário | Gerente/Admin (manual por enquanto) |
| `payment_adjustments` | Estornos e correções rastreáveis | Admin/Gerente |
| `order_changes` | Histórico de TODAS as alterações de pedidos | Sistema (automático) |

---

## 9. Próximos passos sugeridos para interface

Quando for possível criar telas no admin, estas são as prioridades:

1. **Tela de fechamento diário** — Um botão "Fechar caixa de hoje" que preenche `daily_closing` automaticamente e pede observações
2. **Aba "Financeiro"** no detalhe do pedido — Mostrando o histórico do `financial_ledger` e `order_changes` para aquele pedido
3. **Dashboard financeiro** — Cards com dados das views `vw_resumo_financeiro` e `vw_resumo_diario`
4. **Campo de desconto** no formulário de pedido — Com campo obrigatório de motivo
5. **Campo de taxa de entrega** — Preenchido automaticamente quando `delivery_type = 'ENTREGA'`
6. **Botão de estorno** — No detalhe do pagamento, para registrar em `payment_adjustments` + `financial_ledger`

---

## 10. Verificação de saúde do sistema financeiro

Execute esta query periodicamente para garantir que está tudo consistente:

```sql
SELECT 
  'Pedidos sem items' AS verificacao, 
  count(*) AS problemas
FROM orders o LEFT JOIN order_items oi ON o.id = oi.order_id 
WHERE oi.id IS NULL AND o.status != 'CANCELADO'

UNION ALL

SELECT 'Quitados sem paid_at', count(*)
FROM orders WHERE payment_status = 'QUITADO' AND paid_at IS NULL

UNION ALL

SELECT 'Items sem custo snapshot', count(*)
FROM order_items WHERE cost_price_snapshot IS NULL

UNION ALL

SELECT 'Fechamentos diarios faltando (ultimos 30d)', 
  30 - count(*)
FROM daily_closing WHERE data >= current_date - 30

UNION ALL

SELECT 'Produtos ativos sem custo', count(*)
FROM products WHERE is_active = true AND cost_price IS NULL;
```

Se qualquer valor retornar diferente de 0, é sinal de que algo precisa de atenção.
