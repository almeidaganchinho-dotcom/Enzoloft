import type { NextApiRequest, NextApiResponse } from 'next';
import { resend } from '../../lib/resend';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, data } = req.body;

    // Verificar se a API key está configurada
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY não configurada!');
      return res.status(500).json({ error: 'RESEND_API_KEY não configurada no .env.local' });
    }

    let emailData;

    switch (type) {
      case 'reservation_confirmation':
        emailData = {
          from: 'Enzo Loft <onboarding@resend.dev>',
          to: data.guestEmail,
          subject: `Confirmação de Reserva - ${data.propertyName || 'Enzo Loft'}`,
          html: generateReservationConfirmationEmail(data),
        };
        break;

      case 'admin_notification':
        emailData = {
          from: 'Enzo Loft <onboarding@resend.dev>',
          to: process.env.ADMIN_EMAIL || 'admin@enzoloft.com',
          subject: `Nova Reserva Recebida - ${data.guestName}`,
          html: generateAdminNotificationEmail(data),
        };
        break;

      case 'reservation_cancelled':
        emailData = {
          from: 'Enzo Loft <onboarding@resend.dev>',
          to: data.guestEmail,
          subject: 'Cancelamento de Reserva',
          html: generateCancellationEmail(data),
        };
        break;

      default:
        return res.status(400).json({ error: 'Invalid email type' });
    }

    console.log('📧 Enviando email:', { type, to: emailData.to, from: emailData.from });
    
    const result = await resend.emails.send(emailData);

    if (result.error) {
      console.error('❌ Erro do Resend:', result.error);
      return res.status(500).json({ 
        error: result.error.message || 'Erro ao enviar email',
        details: result.error 
      });
    }

    console.log('✅ Email enviado com sucesso! ID:', result.data?.id);
    res.status(200).json({ 
      success: true, 
      id: result.data?.id,
      message: 'Email enviado com sucesso' 
    });
  } catch (error: any) {
    console.error('❌ Erro ao enviar email:', error);
    res.status(500).json({ 
      error: error.message || 'Erro ao enviar email',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// Template de confirmação de reserva para o hóspede
function generateReservationConfirmationEmail(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #92400e 0%, #b45309 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .details { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-row:last-child { border-bottom: none; }
          .label { font-weight: bold; color: #92400e; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #b45309; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✓ Reserva Confirmada!</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${data.guestName}</strong>,</p>
            <p>A sua reserva foi recebida com sucesso! Aguarde a confirmação final da nossa equipe.</p>
            
            <div class="details">
              <h3 style="margin-top: 0; color: #92400e;">Detalhes da Reserva</h3>
              <div class="detail-row">
                <span class="label">Check-in:</span>
                <span>${formatDate(data.startDate)}</span>
              </div>
              <div class="detail-row">
                <span class="label">Check-out:</span>
                <span>${formatDate(data.endDate)}</span>
              </div>
              <div class="detail-row">
                <span class="label">Noites:</span>
                <span>${data.nights}</span>
              </div>
              <div class="detail-row">
                <span class="label">Hóspedes:</span>
                <span>${data.guestsCount}</span>
              </div>
              <div class="detail-row">
                <span class="label">Valor Total:</span>
                <span style="font-size: 18px; font-weight: bold; color: #b45309;">€${data.totalPrice.toFixed(2)}</span>
              </div>
              ${data.discount ? `
              <div class="detail-row">
                <span class="label">Desconto Aplicado:</span>
                <span style="color: #059669;">-€${data.discount.toFixed(2)}</span>
              </div>
              ` : ''}
            </div>

            <p><strong>O que acontece agora?</strong></p>
            <ul>
              <li>A nossa equipe irá confirmar a disponibilidade</li>
              <li>Receberá um email com as instruções de pagamento</li>
              <li>Após o pagamento, enviaremos todas as informações para o check-in</li>
            </ul>

            <p>Se tiver alguma dúvida, não hesite em contactar-nos.</p>
          </div>
          <div class="footer">
            <p>Enzo Loft - Retiro de charme no coração do Alentejo</p>
            <p>Vila Ruiva, Cuba - Beja | info@enzoloft.com</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Template de notificação para o admin
function generateAdminNotificationEmail(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1f2937; color: white; padding: 20px; text-align: center; }
          .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; }
          .details { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-row:last-child { border-bottom: none; }
          .label { font-weight: bold; display: inline-block; min-width: 120px; }
          .button { display: inline-block; background: #b45309; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🔔 Nova Reserva Recebida</h2>
          </div>
          <div class="content">
            <h3>Informações do Hóspede</h3>
            <div class="details">
              <div class="detail-row">
                <span class="label">Nome:</span>
                <span>${data.guestName}</span>
              </div>
              <div class="detail-row">
                <span class="label">Email:</span>
                <span>${data.guestEmail}</span>
              </div>
              <div class="detail-row">
                <span class="label">Telefone:</span>
                <span>${data.guestPhone || 'Não fornecido'}</span>
              </div>
            </div>

            <h3>Detalhes da Reserva</h3>
            <div class="details">
              <div class="detail-row">
                <span class="label">Check-in:</span>
                <span>${formatDate(data.startDate)}</span>
              </div>
              <div class="detail-row">
                <span class="label">Check-out:</span>
                <span>${formatDate(data.endDate)}</span>
              </div>
              <div class="detail-row">
                <span class="label">Noites:</span>
                <span>${data.nights}</span>
              </div>
              <div class="detail-row">
                <span class="label">Hóspedes:</span>
                <span>${data.guestsCount}</span>
              </div>
              <div class="detail-row">
                <span class="label">Valor Total:</span>
                <span style="font-weight: bold; font-size: 18px;">€${data.totalPrice.toFixed(2)}</span>
              </div>
            </div>

            <p style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://enzoloft-51508.web.app'}/admin/dashboard" class="button">
                Ver no Dashboard
              </a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Template de cancelamento
function generateCancellationEmail(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✗ Reserva Cancelada</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${data.guestName}</strong>,</p>
            <p>Informamos que a sua reserva foi cancelada.</p>
            <p><strong>Período:</strong> ${formatDate(data.startDate)} - ${formatDate(data.endDate)}</p>
            ${data.reason ? `<p><strong>Motivo:</strong> ${data.reason}</p>` : ''}
            <p>Se tiver alguma dúvida, não hesite em contactar-nos.</p>
          </div>
          <div class="footer">
            <p>Enzo Loft - Retiro de charme no coração do Alentejo</p>
            <p>Vila Ruiva, Cuba - Beja | info@enzoloft.com</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Função auxiliar para formatar datas
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}
