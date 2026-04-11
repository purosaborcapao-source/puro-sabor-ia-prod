
async function testSend() {
  const zapiInstance = '3F175AF7F1DD51672580B20DE66F3711';
  const zapiToken = 'AF53FC81B3501F7AC37AEC66';
  const zapiClientToken = 'F462ecd9dd68344e9a5004f6c4817b1d2S';
  const phone = '55519822373225';
  
  const endpoint = `https://api.z-api.io/instances/${zapiInstance}/token/${zapiToken}/send-text`;
  
  console.log(`--- TESTE DE ENVIO REAL ---`);
  console.log(`Enviando para: ${phone}`);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Token": zapiClientToken
      },
      body: JSON.stringify({
        phone: phone,
        message: "Olá! Teste de comunicação técnica do Agente Antigravity para a Puro Sabor IA. 🚀\nSe você recebeu isso, o sistema está operacional!"
      }),
    });

    const data = await res.json();
    if (res.ok) {
      console.log('✅ SUCESSO! Mensagem enviada.');
      console.log('ID da Mensagem:', data.messageId);
    } else {
      console.error('❌ FALHA NO ENVIO:');
      console.error(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('🔥 ERRO CRÍTICO:', err.message);
  }
}

testSend();
