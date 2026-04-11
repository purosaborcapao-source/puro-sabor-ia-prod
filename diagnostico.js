
async function runDiagnosis() {
  const supabaseUrl = 'https://rattlzwpfwjuhxktxduu.supabase.co';
  const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdHRsendwZndqdWh4a3R4ZHV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY2NDg0NiwiZXhwIjoyMDkxMjQwODQ2fQ.wwkAZ76FntZOw6LdB8-wwARs3hlbkL1S6fn3Iz6Lsa0';
  const zapiInstance = '3F175AF7F1DD51672580B20DE66F3711';
  const zapiToken = 'AF53FC81B3501F7AC37AEC66';

  console.log('--- DIAGNÓSTICO PURO SABOR (STANDALONE V2) ---');

  // 2. Test Z-API Instance Info
  console.log('\n2. Testando Z-API Instance Info...');
  try {
    const res = await fetch(`https://api.z-api.io/instances/${zapiInstance}/token/${zapiToken}/instance-info`);
    if (!res.ok) {
        console.error(`❌ Z-API falhou com status: ${res.status}`);
        const text = await res.text();
        console.error(`Detalhes: ${text}`);
    } else {
        const info = await res.json();
        console.log('✅ Z-API Instance Info:', JSON.stringify(info, null, 2));
    }
  } catch (err) {
    console.error('❌ Erro na Z-API:', err.message);
  }
}

runDiagnosis();
