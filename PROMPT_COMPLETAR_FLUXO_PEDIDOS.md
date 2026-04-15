# 🚀 PROMPT PARA COMPLETAR O FLUXO DE PEDIDOS

Use este prompt no Claude Code para implementar as etapas faltantes (6-8) do fluxo.

---

## PARTE 1: Adicionar Botão de Confirmação no OrderDetail

### Cole este prompt:

```
Atualize o componente OrderDetail em apps/admin/components/Orders/OrderDetail.tsx

Contexto:
- Esse componente exibe os detalhes de um pedido (itens, valor, data, status)
- Atualmente ele SÓ EXIBE, sem nenhuma ação
- Precisa adicionar um botão "✅ CONFIRMAR PEDIDO" quando status = PENDENTE
- Ao clicar, deve:
  1. Validar que todos os order_items têm product_id válido
  2. UPDATE orders SET status = 'CONFIRMADO' WHERE id = orderId
  3. INSERT em order_changes com changed_by, field='status', old_value='PENDENTE', new_value='CONFIRMADO'
  4. Recarregar a página ou atualizar estado

Implementação:

1. ENCONTRAR O ARQUIVO:
   apps/admin/components/Orders/OrderDetail.tsx

2. ADICIONAR NO FINAL DO COMPONENTE (antes do return):
   
   const [isConfirming, setIsConfirming] = useState(false);
   const [confirmError, setConfirmError] = useState<string | null>(null);

   const handleConfirmOrder = async () => {
     try {
       setIsConfirming(true);
       setConfirmError(null);

       // 1. Validar que todos os itens têm product_id
       if (!orderItems || orderItems.length === 0) {
         setConfirmError("Nenhum item no pedido");
         return;
       }

       const itemsWithoutProduct = orderItems.filter(item => !item.product_id);
       if (itemsWithoutProduct.length > 0) {
         setConfirmError("Alguns itens não têm produto válido");
         return;
       }

       // 2. UPDATE orders SET status = CONFIRMADO
       const { error: updateError } = await supabase
         .from("orders")
         .update({ status: "CONFIRMADO" })
         .eq("id", orderId);

       if (updateError) throw updateError;

       // 3. Log em order_changes
       const { data: { user } } = await supabase.auth.getUser();
       await supabase.from("order_changes").insert({
         order_id: orderId,
         changed_by: user?.id,
         field: "status",
         old_value: "PENDENTE",
         new_value: "CONFIRMADO",
         reason: "Confirmado manualmente pela operadora"
       });

       // 4. Recarregar
       window.location.reload();

     } catch (err) {
       const message = err instanceof Error ? err.message : "Erro ao confirmar";
       setConfirmError(message);
       console.error("Erro:", err);
     } finally {
       setIsConfirming(false);
     }
   };

3. ADICIONAR BOTÃO NO JSX (dentro da seção de status):
   
   {order?.status === "PENDENTE" && (
     <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
       <p className="text-sm font-semibold text-yellow-800 mb-3">
         ⚠️ Este pedido está pendente de confirmação
       </p>
       <button
         onClick={handleConfirmOrder}
         disabled={isConfirming}
         className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
       >
         {isConfirming ? "Confirmando..." : "✅ CONFIRMAR PEDIDO"}
       </button>
       {confirmError && (
         <p className="text-xs text-red-600 mt-2">{confirmError}</p>
       )}
     </div>
   )}

RESULTADO ESPERADO:
- Ao abrir um pedido com status PENDENTE, aparece botão amarelo
- Clicar no botão confirma o pedido
- Status muda para CONFIRMADO no banco
- Página recarrega e botão desaparece
```

---

## PARTE 2: Gerar Link PIX após Confirmação

### Cole este prompt:

```
Crie o endpoint API para gerar links PIX após confirmação de pedido

Contexto:
- Quando operadora confirma um pedido (status muda para CONFIRMADO)
- Sistema precisa gerar um link PIX para cobrar o SINAL (30% do total)
- Exemplo: Se total é R$ 700, sinal = R$ 210
- Salvar link PIX em orders.pix_url para consultar depois

Pergunta 1: Qual provider usar para PIX?
- [ ] Mercado Pago (mais comum em Brasil)
- [ ] Infomaniak
- [ ] Pix manual (apenas QR code estático)
- [ ] Outro (qual?)

ASSUMINDO MERCADO PAGO:

1. CRIAR ARQUIVO:
   apps/admin/pages/api/payments/generate-pix.ts

2. IMPORTS:
   import { NextApiRequest, NextApiResponse } from 'next'
   import { supabaseServer } from '@atendimento-ia/supabase/server'
   import axios from 'axios'

3. LÓGICA:

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ error: 'orderId é obrigatório' });
  }

  try {
    // 1. Buscar order
    const { data: order, error: orderError } = await supabaseServer
      .from('orders')
      .select('id, number, total, customer_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    // 2. Calcular sinal (30%)
    const sinalValor = Math.round(order.total * 0.30 * 100) / 100;

    // 3. Gerar PIX via Mercado Pago
    // Você precisa de: MP_ACCESS_TOKEN do seu app
    const mpAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    const pixPayload = {
      transaction_amount: sinalValor,
      description: \`Sinal - Pedido #\${order.number}\`,
      payment_method_id: 'pix',
      payer: {
        email: 'noreply@purosabor.com.br'
      },
      statement_descriptor: 'Puro Sabor IA'
    };

    const mpResponse = await axios.post(
      'https://api.mercadopago.com/v1/payments',
      pixPayload,
      {
        headers: {
          'Authorization': \`Bearer \${mpAccessToken}\`,
          'Content-Type': 'application/json'
        }
      }
    );

    const pixUrl = mpResponse.data.point_of_interaction?.qr_code?.in_store_order_id;
    const pixQrCode = mpResponse.data.point_of_interaction?.qr_code?.qr_code;

    // 4. Salvar em orders
    await supabaseServer
      .from('orders')
      .update({
        pix_url: pixUrl,
        pix_qr_code: pixQrCode,
        sinal_valor: sinalValor
      })
      .eq('id', orderId);

    return res.status(200).json({
      success: true,
      pix_url: pixUrl,
      pix_qr_code: pixQrCode,
      sinal_valor: sinalValor
    });

  } catch (error) {
    console.error('Erro ao gerar PIX:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Erro ao gerar PIX' 
    });
  }
}

export default handler;

4. ATUALIZAR BANCO:
   ALTER TABLE orders ADD COLUMN (
     pix_url VARCHAR,
     pix_qr_code TEXT,
     sinal_valor DECIMAL(10, 2),
     sinal_confirmado BOOLEAN DEFAULT false
   );

5. ATUALIZAR HANDLECONFIRMORDER (PARTE 1):
   
   Após UPDATE de status para CONFIRMADO:
   
   // Gerar PIX
   const pixResponse = await fetch('/api/payments/generate-pix', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ orderId })
   });

   if (!pixResponse.ok) {
     throw new Error('Erro ao gerar PIX');
   }

   const pixData = await pixResponse.json();
   console.log('PIX gerado:', pixData.pix_url);

RESULTADO ESPERADO:
- POST /api/payments/generate-pix funciona
- Retorna pix_url e pix_qr_code
- Orders.pix_url é preenchido com o link
```

---

## PARTE 3: Enviar PIX para Cliente via WhatsApp

### Cole este prompt:

```
Crie endpoint para enviar PIX para cliente via Z API (WhatsApp)

Contexto:
- Após gerar PIX, operadora clica "Enviar PIX para Cliente"
- Sistema pega link PIX e envia via Z API para o WhatsApp do cliente
- Mensagem deve ter:
  - Confirmação do pedido
  - Valor do sinal
  - Link do PIX (cópia e cola)
  - Data de retirada

Implementação:

1. CRIAR ARQUIVO:
   apps/admin/pages/api/payments/send-pix-to-customer.ts

2. LÓGICA:

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId } = req.body;

  try {
    // 1. Buscar order + customer
    const { data: order } = await supabaseServer
      .from('orders')
      .select('*, customers:customer_id(phone, name)')
      .eq('id', orderId)
      .single();

    if (!order || !order.customers) {
      return res.status(404).json({ error: 'Pedido ou cliente não encontrado' });
    }

    const phone = order.customers.phone;
    const customerName = order.customers.name;

    if (!order.pix_url || !order.sinal_valor) {
      return res.status(400).json({ error: 'PIX ainda não foi gerado' });
    }

    // 2. Formatar mensagem
    const deliveryDate = order.delivery_date 
      ? new Date(order.delivery_date).toLocaleDateString('pt-BR')
      : 'A definir';

    const message = \`✅ *Pedido Confirmado!*

Olá \${customerName}!

Seu pedido foi confirmado com sucesso! 🎉

*💰 SINAL A PAGAR:*
R$ \${order.sinal_valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

*📋 DADOS DO PEDIDO:*
Número: #\${order.number}
Data de Retirada: \${deliveryDate}

*🔗 COPIE E COLE NO SEU BANCO:*
\${order.pix_url}

Qualquer dúvida, entre em contato!
Obrigado por escolher Puro Sabor! 🍰\`;

    // 3. Enviar via Z API
    const zapiToken = process.env.ZAPI_API_TOKEN;
    const zapiUrl = process.env.ZAPI_INSTANCE_ID;

    const zapiResponse = await axios.post(
      \`https://api.z-api.io/instances/\${zapiUrl}/token/\${zapiToken}/send-text\`,
      {
        phone: phone,
        message: message
      }
    );

    // 4. Log em messages
    await supabaseServer.from('messages').insert({
      customer_id: order.customer_id,
      phone: phone,
      direction: 'OUTBOUND',
      type: 'TEXT',
      content: message,
      ai_handled: true,
      notes: 'PIX enviado após confirmação do pedido'
    });

    // 5. UPDATE orders
    await supabaseServer
      .from('orders')
      .update({ payment_status: 'SINAL_ENVIADO' })
      .eq('id', orderId);

    return res.status(200).json({
      success: true,
      message: 'PIX enviado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao enviar PIX:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Erro ao enviar PIX' 
    });
  }
}

export default handler;

3. ATUALIZAR HANDLECONFIRMORDER NO ORDERDETAIL:

   Adicionar novo estado:
   const [showPixButton, setShowPixButton] = useState(false);

   Após confirmar, mostrar:
   {order?.status === "CONFIRMADO" && order?.pix_url && (
     <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
       <p className="text-sm font-semibold text-blue-800 mb-3">
         ✅ Pedido confirmado! PIX gerado.
       </p>
       <button
         onClick={handleSendPix}
         disabled={isSendingPix}
         className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
       >
         {isSendingPix ? "Enviando..." : "📤 ENVIAR PIX PARA CLIENTE"}
       </button>
     </div>
   )}

   Função:
   const handleSendPix = async () => {
     try {
       const response = await fetch('/api/payments/send-pix-to-customer', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ orderId })
       });

       if (!response.ok) throw new Error('Erro ao enviar');
       alert('PIX enviado com sucesso para o cliente!');
       window.location.reload();
     } catch (err) {
       alert(err instanceof Error ? err.message : 'Erro ao enviar PIX');
     }
   };

RESULTADO ESPERADO:
- POST /api/payments/send-pix-to-customer funciona
- Cliente recebe mensagem no WhatsApp com PIX
- payment_status muda para SINAL_ENVIADO
- Mensagem é registrada em messages table
```

---

## PARTE 4: Atualizar Schema do Banco

Antes de usar os prompts acima, execute esta migration:

```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS (
  pix_url VARCHAR,
  pix_qr_code TEXT,
  sinal_valor DECIMAL(10, 2),
  sinal_confirmado BOOLEAN DEFAULT false,
  payment_status VARCHAR DEFAULT 'PENDENTE'
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_orders_pix_url ON orders(pix_url);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
```

---

## 📋 RESUMO DOS PROMPTS

| Parte | O Quê | Arquivo | Ação |
|-------|-------|---------|------|
| 1 | Botão de Confirmar | `OrderDetail.tsx` | Adicionar botão + handleConfirmOrder |
| 2 | Gerar PIX | `/api/payments/generate-pix.ts` | Novo endpoint |
| 3 | Enviar PIX | `/api/payments/send-pix-to-customer.ts` | Novo endpoint |
| 4 | Schema | Banco de dados | ALTER TABLE + índices |

---

## 🔑 VARIÁVEIS DE AMBIENTE NECESSÁRIAS

Adicione no seu `.env.local`:

```env
# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=your_mp_access_token

# Z API (WhatsApp)
ZAPI_API_TOKEN=your_zapi_token
ZAPI_INSTANCE_ID=your_instance_id
```

---

## 🧪 COMO TESTAR

1. **Teste LOCAL:**
   ```bash
   # Crie um pedido manualmente em /dashboard/orders/new
   # Ou simule um pedido via catálogo web
   ```

2. **Teste a CONFIRMAÇÃO:**
   - Abra o pedido PENDENTE
   - Clique "✅ CONFIRMAR PEDIDO"
   - Verifique se status mudou para CONFIRMADO
   - Verifique se `order_changes` foi preenchido

3. **Teste GERAÇÃO DE PIX:**
   - Confirme um pedido
   - Verifique se `orders.pix_url` foi preenchido
   - Tente gerar manualmente: `POST /api/payments/generate-pix`

4. **Teste ENVIO VIA WHATSAPP:**
   - Com PIX gerado, clique "📤 ENVIAR PIX PARA CLIENTE"
   - Cliente deve receber mensagem no WhatsApp
   - Verifique se `messages` foi preenchida

---

## ✅ CHECKLIST

- [ ] Parte 1: Botão de confirmação funciona
- [ ] Status muda de PENDENTE para CONFIRMADO
- [ ] order_changes é preenchido
- [ ] Parte 2: PIX é gerado após confirmação
- [ ] pix_url é salvo em orders
- [ ] Parte 3: PIX é enviado via WhatsApp
- [ ] Cliente recebe mensagem corretamente
- [ ] payment_status muda para SINAL_ENVIADO
- [ ] Fluxo completo funciona de ponta a ponta

---

*Pronto! Agora você tem os prompts para completar todo o fluxo de pedidos.*
