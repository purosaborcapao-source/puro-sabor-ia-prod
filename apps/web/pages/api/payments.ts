import { NextApiRequest, NextApiResponse } from 'next'

type ResponseData = {
  success?: boolean
  message?: string
  error?: string
  qrCode?: string
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method === 'POST') {
    return handlePaymentRequest(req, res)
  }

  res.setHeader('Allow', ['POST'])
  return res.status(405).json({ error: 'Method Not Allowed' })
}

async function handlePaymentRequest(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  try {
    const { method, amount, orderId } = req.body

    // Validar campos obrigatórios
    if (!method || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: method, amount'
      })
    }

    // Se for PIX, gerar um QR Code (simulado)
    if (method.toUpperCase() === 'PIX') {
      // Nota: Em produção, integrar com a API real de PIX
      // Por enquanto, retornar uma resposta de sucesso
      return res.status(200).json({
        success: true,
        message: 'Pagamento PIX iniciado. Envie o comprovante via WhatsApp.',
        qrCode: `pix-qrcode-${orderId}-${Date.now()}` // Placeholder
      })
    }

    // Outros métodos
    return res.status(200).json({
      success: true,
      message: `Pagamento via ${method} solicitado. Entre em contato via WhatsApp para confirmar.`
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({
      error: `Internal server error: ${message}`
    })
  }
}
