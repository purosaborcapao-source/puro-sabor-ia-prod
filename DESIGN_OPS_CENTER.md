# Ops Center - Design System & Feeling Visual

Este documento garante a padronização estética do painel de administração da Puro Sabor IA, operando sob uma filosofia de "Centro de Comando" (Ops Center), muito superior aos painéis administrativos básicos (estilo "SaaS Padrão").

## Filosofia Principal
- **Luxo e Utilidade:** A interface não é apenas utilitária; ela deve transmitir a sensação de controle absoluto e tecnologia de ponta. Nada de "fofo" ou frágil. 
- **Hierarquia Extrema (Cockpit):** Informações críticas (pendências urgentes, valores pendentes) piscam forte. Dados normais (calendário, listas vazias) ficam discretos no fundo. O olhar do operador deve ser "puxado" instantaneamente para onde há fogo.
- **Law of Prägnanz (Simplicidade de Forma):** Menos "caixas brancas soltas", mais grids coesos e blocos visuais de alta densidade sem divisórias pesadas.

## 1. Cores e Constrastes
O ambiente alternará as cores baseado no tema, mas sob as seguintes diretrizes de Ops Center:
- **Painéis HUD e Status:** Utilizam background denso e opaco. No modo escuro, tons absolutos de grafite/preto profundo (`bg-gray-950`), com acentos luminosos. No modo claro, um fundo neutro muito nítido (`bg-white`), usando sombras duras e mínimas.
- **Sinais de Urgência (Ações Imediatas):**
  - **Laranja/Vermelho Vibrante:** Apenas para itens que precisam da resolução do operador naquele exato segundo (ex: Pagamento Atrasado, Mensagem Não Lida de 2 horas atrás).
  - **Verde Neon/Esmeralda:** Para indicar vitória ou status operacional limpo (ex: Sem Pendências, Entregas Concluídas).
  - **Azul Cyber/Teal:** Para dados analíticos (ex: Total Previsto).

## 2. Tipografia (Massive Typography)
Os tamanhos de fonte não são graduais. Usamos contrastes dramáticos (*Golden Ratio Scaling*).
- Títulos de Seção: Pequenos, pesados, espaçamento de letra largo (UPPERCASE + Tracking Wide) estilo militar/dashboard analítico. Ex: `TEXT-XS FONT-BOLD TRACKING-WIDER TEXT-GRAY-500`.
- Números e Métricas do HUD: Gigantes! A fonte é a protagonista e preenche a tela. Ex: `TEXT-5XL FONT-BLACK TRACKING-TIGHT`.

## 3. Elementos Estruturais
- **Remoção de Bordas Suaves:** Preferência por divisórias ósseas (`border-r`, `border-b`) muito sutis, formando blocos que lembram terminais modernos, substituindo os cards de "sombra fofinha e bordas extremamente arredondadas". Usar cantos `rounded-sm` ou `rounded-none` em grids internos, e `rounded-lg` apenas para a embalagem externa.
- **Dock de Comandos:** Navegação rápida e ações devem lembrar instâncias de terminal em vez de botões flutuantes grandes, garantindo que o usuário sinta que está orquestrando a operação e não navegando em um site.

## 4. O Sistema "Zero Distração" (Peak-End Rule + Von Restorff)
- Uma tela em estado de repouso (zero tarefas) deve parecer elegante e adormecida, recompensando o usuário por "limpar a mesa".
- Elementos novos, quando chegam, quebram esse padrão usando o Efeito Von Restorff (são coloridos, ganham destaque, exigem atuação do *Operator*).

---
> **Regra de Ouro:** "Se eu tirar todas as linhas e bordas da tela, o tamanho puro dos textos em si e a distribuição das cores diz perfeitamente ao operador para onde ele deve olhar primeiro?" Se sim, o design está aprovado.
