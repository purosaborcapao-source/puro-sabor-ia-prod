# 📊 DASHBOARD DO PROPRIETÁRIO — Puro Sabor IA
**Perfil:** Dono do negócio / Administrador  
**Objetivo:** Visão completa e rápida do dia — financeiro, pedidos e saúde do negócio  
**Acesso:** Exclusivo para role `admin`

---

## 🎯 FILOSOFIA DA DASHBOARD

> O proprietário não tem tempo de abrir planilhas. Em **30 segundos** ele precisa saber:
> - Quanto vai entrar hoje?
> - Tem dinheiro em aberto que precisa de ação?
> - O mês está indo bem ou mal?

Toda informação deve responder uma **pergunta de negócio real**, não ser apenas número.

---

## 🗂️ ESTRUTURA EM BLOCOS — LAYOUT VISUAL

```
┌─────────────────────────────────────────────────────────────┐
│  🌅 BOM DIA, [NOME] — HOJE É [DIA/MÊS]  |  [HORA ATUAL]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  BLOCO 1: SÍNTESE FINANCEIRA DO DIA                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ A RECEBER│ │ RECEBIDO │ │PENDENTE  │ │TOTAL DIA │      │
│  │  HOJE    │ │  HOJE    │ │ CONFIRMAR│ │ PREVISTO │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                             │
│  BLOCO 2: PEDIDOS DO DIA                                   │
│  ┌───────────────────────────┐ ┌───────────────────────┐   │
│  │   ENTREGAS DE HOJE        │ │   STATUS DOS PEDIDOS  │   │
│  │   (lista por horário)     │ │   (gráfico pizza)     │   │
│  └───────────────────────────┘ └───────────────────────┘   │
│                                                             │
│  BLOCO 3: ALERTAS E AÇÕES NECESSÁRIAS                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ⚠️  REQUER SUA ATENÇÃO AGORA                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  BLOCO 4: VISÃO DO MÊS                                     │
│  ┌──────────────────────────┐ ┌──────────────────────┐     │
│  │   FATURAMENTO DO MÊS    │ │  COMPARATIVO C/ MÊS  │     │
│  │   (barra de progresso)  │ │  ANTERIOR            │     │
│  └──────────────────────────┘ └──────────────────────┘     │
│                                                             │
│  BLOCO 5: CALENDÁRIO — PRÓXIMOS 7 DIAS                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [SEG] [TER] [QUA] [QUI] [SEX] [SAB] [DOM]         │   │
│  │   5     3     8     2     7     12    -             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 💰 BLOCO 1 — SÍNTESE FINANCEIRA DO DIA

### Indicador 1: A RECEBER HOJE
> "Quanto os clientes ainda me devem de pedidos que entregam hoje?"

- **Fonte:** pedidos com `delivery_date = hoje` + `payment_status ≠ pago_total`
- **Fórmula:** SUM(valor_total - valor_pago) dos pedidos de hoje
- **Cor:** Azul (informativo — dinheiro a caminho)
- **Ação rápida:** Clicar abre lista dos pedidos com saldo pendente

---

### Indicador 2: RECEBIDO HOJE
> "Quanto já entrou no caixa hoje (sinal + saldos confirmados)?"

- **Fonte:** `payment_entries` com `confirmed_at = hoje` e `status = confirmado`
- **Fórmula:** SUM(valor) das entradas confirmadas hoje
- **Cor:** Verde (positivo, dinheiro já na mão)
- **Detalhe:** Separado em duas linhas menores:
  - Sinais recebidos: R$ X
  - Saldos recebidos: R$ X

---

### Indicador 3: PENDENTE DE CONFIRMAÇÃO
> "Tem dinheiro que a operadora registrou mas eu ainda não confirmei?"

- **Fonte:** `payment_entries` com `status = pendente`
- **Fórmula:** COUNT + SUM(valor)
- **Cor:** Amarelo/Laranja (requer ação)
- **Ação rápida:** Clicar abre fila de aprovação de pagamentos
- **Urgência:** Se > 0, badge pulsante aparece no ícone

---

### Indicador 4: FATURAMENTO PREVISTO DO DIA
> "Se tudo der certo, quanto vou faturar hoje no total?"

- **Fonte:** pedidos com `delivery_date = hoje` (status ≠ cancelado)
- **Fórmula:** SUM(valor_total) dos pedidos de hoje
- **Cor:** Cinza escuro (projeção, não realidade ainda)
- **Detalhe:** Mostra também quantos pedidos compõem esse valor

---

## 📦 BLOCO 2 — PEDIDOS DO DIA

### Indicador 5: ENTREGAS DE HOJE (Lista)
> "O que sai da cozinha hoje e para quem vai?"

Cada linha mostra:
```
[HORÁRIO] [NOME CLIENTE] [PRODUTO PRINCIPAL] [VALOR SALDO] [STATUS PGTO]
  14h00    Maria Aparecida  Bolo casamento 3 andares   R$ 800   🟡 Saldo pendente
  16h00    João Carlos      10 pães de mel              R$ 0    ✅ Quitado
  17h30    Loja Flores      Torta morango              R$ 150   🔴 Não confirmado
```

- **Ordenado por:** horário de entrega
- **Cores de status:**
  - 🟢 Verde: pago 100%
  - 🟡 Amarelo: sinal pago, saldo na entrega
  - 🔴 Vermelho: pagamento não confirmado
  - ⚫ Cinza: conta corrente (fatura mensal)

---

### Indicador 6: STATUS DOS PEDIDOS (Gráfico pizza ou contadores)
> "De todos os meus pedidos ativos, em que fase estão?"

| Status | Quantidade | Cor |
|--------|-----------|-----|
| Aguardando confirmação | N | 🟠 Laranja |
| Confirmados | N | 🔵 Azul |
| Em produção | N | 🟡 Amarelo |
| Prontos para entrega | N | 🟢 Verde |
| Entregues hoje | N | ✅ Cinza |
| Cancelados hoje | N | 🔴 Vermelho |

---

## ⚠️ BLOCO 3 — ALERTAS: REQUER SUA ATENÇÃO

> Este bloco só aparece quando há itens. Funciona como uma caixa de entrada de problemas.

### Alerta A: Pagamentos para Confirmar
```
💰 3 pagamentos aguardam sua confirmação — R$ 1.240,00 no total
   [VER E CONFIRMAR →]
```

### Alerta B: Pedidos Sem Sinal
```
⚠️ 2 pedidos confirmados ainda não têm sinal registrado
   Bolo de 15 anos — Ana Lima — entrega em 3 dias
   Torta empresarial — Empresa ABC — entrega amanhã
   [VER PEDIDOS →]
```

### Alerta C: Entrega Hoje Sem Pagamento Quitado
```
🔴 1 entrega HOJE ainda tem saldo não confirmado
   Maria Aparecida — Bolo casamento — saldo R$ 800
   [VER PEDIDO →]
```

### Alerta D: Capacidade Máxima Próxima
```
📅 Sábado 13/04 está quase cheio: 11 de 12 pedidos
   [GERENCIAR AGENDA →]
```

### Alerta E: Conta Corrente Vencendo
```
🗓️ Fatura da Empresa Flores vence em 2 dias — R$ 2.340,00
   [VER CONTA →]
```

---

## 📈 BLOCO 4 — VISÃO DO MÊS

### Indicador 7: FATURAMENTO DO MÊS
> "Quanto já faturei este mês (confirmado) e quanto ainda está previsto?"

```
ABRIL — META: R$ 15.000
████████████░░░░░░░░  62%

✅ Confirmado:   R$ 9.280
📅 Previsto:     R$ 4.100
💰 Total Mês:    R$ 13.380 (se tudo for pago)
```

- **Meta** configurável pelo próprio administrador nas Settings
- **Confirmado** = payment_entries com status confirmado no mês
- **Previsto** = pedidos com delivery_date no mês ainda não recebidos

---

### Indicador 8: COMPARATIVO MÊS ANTERIOR
> "Estou crescendo ou caindo?"

```
                MARÇO      ABRIL (até hoje)
Faturamento:   R$ 12.400     R$ 9.280  (+↓ falta 15 dias)
Pedidos:          47            31
Ticket Médio:  R$ 263,83     R$ 299,35   ↑ 13,4%
Cancelamentos:     2             0
```

- Seta verde ↑ quando acima do mês anterior
- Seta vermelha ↓ quando abaixo

---

### Indicador 9: TICKET MÉDIO
> "Quanto cada pedido vale em média?"

- **Fórmula:** Faturamento total ÷ número de pedidos (mês)
- **Comparativo:** vs. mês anterior e vs. últimos 3 meses
- **Objetivo:** Identificar se está vendendo mais itens maiores

---

### Indicador 10: TAXA DE CANCELAMENTO
> "Quantos pedidos perdi este mês?"

- **Fórmula:** (pedidos cancelados ÷ pedidos criados) × 100
- **Meta ideal:** < 5%
- **Cor:** Verde se < 5%, amarelo se 5-10%, vermelho se > 10%

---

## 📅 BLOCO 5 — CALENDÁRIO PRÓXIMOS 7 DIAS

```
SEG 08    TER 09    QUA 10    QUI 11    SEX 12    SAB 13    DOM 14
━━━━━━━   ━━━━━━━   ━━━━━━━   ━━━━━━━   ━━━━━━━   ━━━━━━━   ━━━━━━━
  🟢 5      🟢 3      🟡 8      🟢 2      🟡 7      🔴 11     ⛔ 0
R$1.200   R$740    R$2.100   R$540    R$1.890   R$3.200    FECHADO
```

- 🟢 Verde: capacidade OK (< 70% cheio)
- 🟡 Amarelo: quase cheio (70-90%)
- 🔴 Vermelho: lotado ou máximo (>90%)
- ⛔ Bloqueado: não aceita pedidos

Clicar em qualquer dia abre os pedidos daquele dia.

---

## 📊 INDICADORES SECUNDÁRIOS (Rodapé / Aba de Relatórios)

### Indicador 11: PRODUTOS MAIS VENDIDOS
> "O que mais sai da minha padaria?"

Top 5 produtos do mês por:
- Quantidade de pedidos
- Valor gerado

---

### Indicador 12: CLIENTES MAIS FREQUENTES
> "Quem são meus melhores clientes?"

Top 5 por:
- Número de pedidos
- Valor total gasto

---

### Indicador 13: DISTRIBUIÇÃO DE PERFIS DE PAGAMENTO
> "Meus clientes preferem pagar como?"

```
Sinal + Saldo na entrega:  68%  ████████████████░░░░
Antecipado (100%):         22%  █████░░░░░░░░░░░░░░░
Conta Corrente mensal:     10%  ██░░░░░░░░░░░░░░░░░░
```

---

### Indicador 14: INADIMPLÊNCIA / SALDO EM ABERTO
> "Tem dinheiro que deveria ter entrado e não entrou?"

- Pedidos entregues com saldo ainda não confirmado
- Ordenado por data de entrega (mais antigos primeiro)
- **Sinal de alerta:** pedidos entregues há > 3 dias com saldo aberto

---

### Indicador 15: RECEITA POR DIA DA SEMANA
> "Qual dia da semana vende mais?"

```
SEG ████░░░░ R$ 1.200
TER ██░░░░░░ R$ 740
QUA ██████░░ R$ 2.100
QUI ███░░░░░ R$ 980
SEX █████░░░ R$ 1.890
SAB ████████ R$ 3.200
DOM ░░░░░░░░ R$ 0
```

Útil para decidir dias de bloqueio e planejamento de equipe.

---

## 🔄 LÓGICA DE ATUALIZAÇÃO DOS DADOS

| Indicador | Frequência de Atualização |
|-----------|--------------------------|
| A Receber Hoje | Tempo real (Supabase Realtime) |
| Recebido Hoje | Tempo real |
| Pendente de Confirmação | Tempo real |
| Entregas do dia | Tempo real |
| Alertas | A cada 5 minutos |
| Faturamento do mês | A cada 15 minutos |
| Comparativo | Calculado ao abrir a página |
| Calendário 7 dias | A cada 5 minutos |

---

## 🎨 REGRAS VISUAIS

### Hierarquia de Cores
| Cor | Significado | Quando usar |
|-----|------------|-------------|
| 🟢 Verde | Positivo / OK / Recebido | Dinheiro confirmado, pedido quitado |
| 🔵 Azul | Informativo / Previsto | Valores a receber, pedidos futuros |
| 🟡 Amarelo | Atenção / Parcial | Sinal pago, capacidade média |
| 🔴 Vermelho | Urgente / Problema | Sem pagamento, lotado, inadimplente |
| ⚫ Cinza | Neutro / Concluído | Entregue, histórico |
| 🟠 Laranja | Requer ação | Pendente de confirmação admin |

### Tipografia
- Valores em R$: **fonte grande, negrito**
- Variações (+/-): fonte menor, ao lado, colorida
- Labels: caixa alta, cinza, discreta

### Cards de Indicador
```
┌─────────────────────────┐
│  LABEL DO INDICADOR     │
│                         │
│     R$ 3.240,00         │  ← grande e em destaque
│                         │
│  ↑ 12% vs ontem         │  ← variação discreta
│  15 pedidos             │  ← detalhe de contexto
└─────────────────────────┘
```

---

## ⚙️ CONFIGURAÇÕES DO PROPRIETÁRIO

O admin deve poder configurar diretamente na dashboard:

| Configuração | Default | Descrição |
|--------------|---------|-----------|
| Meta de faturamento mensal | — | Exibida na barra de progresso |
| Prazo de alerta de saldo aberto | 3 dias | Alertas de inadimplência |
| Capacidade padrão por dia | 10 pedidos | Base para o calendário |
| Dias de folga recorrentes | Domingo | Bloqueio automático |
| Percentual padrão de sinal | 30% | Cálculo automático |

---

## 🧭 FLUXOS DE AÇÃO RÁPIDA DA DASHBOARD

Cada alerta ou indicador deve ter um botão que leva diretamente à ação:

```
[A RECEBER HOJE]  →  Lista de pedidos de hoje com saldo
[PENDENTE CONFIRMAR]  →  Fila de aprovação de pagamentos
[PEDIDO SEM SINAL]  →  Formulário de registro de entrada
[ALERTA ENTREGA]  →  Detalhe do pedido específico
[DIA CHEIO]  →  Gerenciador de calendário daquele dia
[CONTA CORRENTE]  →  Tela de cobrança do cliente
```

---

## 📱 VERSÃO RESUMIDA (Tela de Celular)

Para acesso rápido via mobile, mostrar apenas:

```
┌─────────────────────────┐
│  💰 HOJE — Quinta, 10/4 │
│                         │
│  Faturado:  R$ 1.240 ✅ │
│  A receber: R$ 2.100 📅 │
│  Confirmar: R$   800 ⚠️ │
│                         │
│  Entregas hoje: 5       │
│  ├ Quitados: 3 ✅       │
│  ├ Saldo pendente: 1 🟡 │
│  └ Sem confirmação: 1 🔴│
│                         │
│  [VER DETALHES →]       │
└─────────────────────────┘
```

---

## 📋 RESUMO DOS 15 INDICADORES

| # | Indicador | Responde | Prioridade |
|---|-----------|----------|------------|
| 1 | A Receber Hoje | Quanto ainda vai entrar? | 🔴 Alta |
| 2 | Recebido Hoje | Quanto já entrou? | 🔴 Alta |
| 3 | Pendente de Confirmação | Tem dinheiro esperando minha ação? | 🔴 Alta |
| 4 | Faturamento Previsto do Dia | Como vai ser o dia? | 🔴 Alta |
| 5 | Entregas do Dia (lista) | O que sai hoje e está pago? | 🔴 Alta |
| 6 | Status dos Pedidos | Meus pedidos estão em que fase? | 🟡 Média |
| 7 | Faturamento do Mês | Estou batendo minha meta? | 🔴 Alta |
| 8 | Comparativo Mês Anterior | Estou crescendo? | 🟡 Média |
| 9 | Ticket Médio | Cada pedido vale quanto? | 🟡 Média |
| 10 | Taxa de Cancelamento | Quantos pedidos perco? | 🟡 Média |
| 11 | Produtos Mais Vendidos | O que devo priorizar? | 🟢 Baixa |
| 12 | Clientes Mais Frequentes | Quem são meus VIPs? | 🟢 Baixa |
| 13 | Perfis de Pagamento | Como meus clientes pagam? | 🟢 Baixa |
| 14 | Inadimplência/Saldo Aberto | Estou perdendo dinheiro entregue? | 🔴 Alta |
| 15 | Receita por Dia da Semana | Qual dia mais fatura? | 🟢 Baixa |

---

*Puro Sabor IA — Dashboard do Proprietário*  
*Versão 1.0 — Abril 2026*
