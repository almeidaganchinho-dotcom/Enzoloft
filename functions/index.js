const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const { Resend } = require('resend');

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
const ADMIN_EMAIL = defineSecret('ADMIN_EMAIL');

const allowedOrigins = [
  'https://enzoloft.pt',
  'https://enzoloft-51508.web.app',
  'http://localhost:3000',
];

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  const isAllowed = !origin || allowedOrigins.includes(origin);

  if (origin && isAllowed) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
  }

  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  return isAllowed;
}

function formatDate(dateValue) {
  if (!dateValue) {
    return '-';
  }

  return new Date(dateValue).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function reservationGuestTemplate(data) {
  const nights = Number(data.nights || 0);
  const total = Number(data.totalPrice || 0);

  return `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
      <h2 style="margin: 0 0 12px; color: #b45309;">Pedido de reserva recebido</h2>
      <p>Olá ${data.guestName || 'hóspede'},</p>
      <p>Recebemos o seu pedido de reserva no EnzoLoft. Em breve entraremos em contacto para confirmação.</p>
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px;margin:16px 0;">
        <p style="margin:4px 0;"><strong>Check-in:</strong> ${formatDate(data.startDate)}</p>
        <p style="margin:4px 0;"><strong>Check-out:</strong> ${formatDate(data.endDate)}</p>
        <p style="margin:4px 0;"><strong>Noites:</strong> ${nights}</p>
        <p style="margin:4px 0;"><strong>Hóspedes:</strong> ${Number(data.guestsCount || 0)}</p>
        <p style="margin:4px 0;"><strong>Total:</strong> ${data.priceOnRequest ? 'Sob consulta' : `EUR ${total.toFixed(2)}`}</p>
      </div>
      <p>Obrigado,<br/>EnzoLoft</p>
    </div>
  `;
}

function adminTemplate(data) {
  const nights = Number(data.nights || 0);
  const total = Number(data.totalPrice || 0);
  const specialRequests = (data.specialRequests || '').toString().trim();

  return `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
      <h2 style="margin: 0 0 12px; color: #b45309;">Novo pedido de reserva</h2>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;">
        <p style="margin:4px 0;"><strong>Nome:</strong> ${data.guestName || '-'}</p>
        <p style="margin:4px 0;"><strong>Email:</strong> ${data.guestEmail || '-'}</p>
        <p style="margin:4px 0;"><strong>Telefone:</strong> ${data.guestPhone || '-'}</p>
        <p style="margin:4px 0;"><strong>Check-in:</strong> ${formatDate(data.startDate)}</p>
        <p style="margin:4px 0;"><strong>Check-out:</strong> ${formatDate(data.endDate)}</p>
        <p style="margin:4px 0;"><strong>Noites:</strong> ${nights}</p>
        <p style="margin:4px 0;"><strong>Hóspedes:</strong> ${Number(data.guestsCount || 0)}</p>
        <p style="margin:4px 0;"><strong>Total:</strong> ${data.priceOnRequest ? 'Sob consulta' : `EUR ${total.toFixed(2)}`}</p>
        ${specialRequests ? `<p style="margin:4px 0;"><strong>Pedidos especiais:</strong> ${specialRequests}</p>` : ''}
        ${data.contactMessage ? `<p style="margin:8px 0 0;"><strong>Mensagem:</strong><br/>${data.contactMessage}</p>` : ''}
      </div>
    </div>
  `;
}

function statusUpdateTemplate(data) {
  const status = (data.status || '').toString();
  const title = status === 'confirmed' ? 'Reserva confirmada' : status === 'cancelled' ? 'Reserva cancelada' : 'Atualização da reserva';

  return `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
      <h2 style="margin: 0 0 12px; color: #b45309;">${title}</h2>
      <p>Olá ${data.guestName || 'hóspede'},</p>
      <p>O estado da sua reserva foi atualizado para <strong>${status}</strong>.</p>
      <p style="margin-top: 16px;">Datas: ${formatDate(data.startDate)} - ${formatDate(data.endDate)}</p>
      <p>EnzoLoft</p>
    </div>
  `;
}

function buildMessage(payload, adminEmailValue) {
  const type = payload.type;
  const data = payload.data || {};

  if (type === 'reservation_confirmation') {
    return {
      to: data.guestEmail,
      subject: 'EnzoLoft - Pedido de reserva recebido',
      html: reservationGuestTemplate(data),
    };
  }

  if (type === 'admin_notification') {
    const toEmail = (data.toEmail || adminEmailValue || '').toString();
    return {
      to: toEmail,
      subject: data.contactMessage ? 'EnzoLoft - Novo contacto' : 'EnzoLoft - Nova reserva',
      html: adminTemplate(data),
    };
  }

  if (type === 'status_update') {
    return {
      to: data.guestEmail,
      subject: `EnzoLoft - Estado da reserva: ${data.status || 'atualizado'}`,
      html: statusUpdateTemplate(data),
    };
  }

  return null;
}

exports.sendEmail = onRequest(
  {
    region: 'europe-west1',
    secrets: [RESEND_API_KEY, ADMIN_EMAIL],
    timeoutSeconds: 30,
  },
  async (req, res) => {
    const corsAllowed = setCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (!corsAllowed) {
      res.status(403).json({ error: 'Origin not allowed' });
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const payload = req.body || {};
      const adminEmailValue = process.env.ADMIN_EMAIL;
      const message = buildMessage(payload, adminEmailValue);

      if (!message) {
        res.status(400).json({ error: 'Invalid email type' });
        return;
      }

      if (!message.to) {
        res.status(400).json({ error: 'Missing destination email' });
        return;
      }

      const resend = new Resend(process.env.RESEND_API_KEY);
      const result = await resend.emails.send({
        from: 'EnzoLoft <onboarding@resend.dev>',
        to: message.to,
        subject: message.subject,
        html: message.html,
      });

      if (result.error) {
        logger.error('resend_send_failed', result.error);
        res.status(502).json({ error: 'Failed to send email' });
        return;
      }

      res.status(200).json({ ok: true, id: result.data?.id || null });
    } catch (error) {
      logger.error('send_email_unhandled_error', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);
