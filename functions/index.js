const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const { Resend } = require('resend');

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
const ADMIN_EMAIL = defineSecret('ADMIN_EMAIL');
const RESEND_FROM_EMAIL = defineSecret('RESEND_FROM_EMAIL');
const OPERATIONAL_NOTIFICATION_EMAIL = 'alentejo.enzoloft@gmail.com';

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

function asText(value, fallback = '-') {
  if (value === null || value === undefined) {
    return fallback;
  }

  const text = String(value).trim();
  return text || fallback;
}

function calculateNights(startDate, endDate, fallbackNights) {
  const parsedFallback = Number(fallbackNights || 0);
  if (parsedFallback > 0) {
    return parsedFallback;
  }

  const start = new Date(startDate || '').getTime();
  const end = new Date(endDate || '').getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 0;
  }

  return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
}

function buildReservationConfirmationVariables(data) {
  const guestName = asText(data.guestName, 'Hóspede');
  const checkIn = formatDate(data.startDate);
  const checkOut = formatDate(data.endDate);
  const nightsValue = calculateNights(data.startDate, data.endDate, data.nights);
  const guestsValue = Number(data.guestsCount || 0);
  const totalValue = Number(data.totalPrice || 0);
  const totalLabel = data.priceOnRequest ? 'Sob consulta' : `EUR ${totalValue.toFixed(2)}`;
  const specialRequests = asText(data.specialRequests, 'Sem pedidos especiais');
  const propertyName = 'EnzoLoft';
  const propertyLocation = 'Vila Ruiva, Cuba - Beja';

  return {
    guestName,
    guest_name: guestName,
    name: guestName,
    checkIn,
    check_in: checkIn,
    startDate: checkIn,
    start_date: checkIn,
    checkOut,
    check_out: checkOut,
    endDate: checkOut,
    end_date: checkOut,
    nights: String(nightsValue),
    numberOfNights: String(nightsValue),
    number_of_nights: String(nightsValue),
    guests: String(guestsValue),
    guestsCount: String(guestsValue),
    guests_count: String(guestsValue),
    total: totalLabel,
    totalPrice: totalLabel,
    total_price: totalLabel,
    specialRequests,
    special_requests: specialRequests,
    propertyName,
    property_name: propertyName,
    propertyLocation,
    property_location: propertyLocation,
  };
}

function buildPreReservationVariables(data) {
  const guestName = asText(data.guestName, 'Hóspede');
  const checkIn = formatDate(data.startDate);
  const checkOut = formatDate(data.endDate);
  const nightsValue = calculateNights(data.startDate, data.endDate, data.nights);
  const guestsValue = Number(data.guestsCount || 0);
  const totalValue = Number(data.totalPrice || 0);
  const totalLabel = data.priceOnRequest ? 'Sob consulta' : `EUR ${totalValue.toFixed(2)}`;
  const specialRequests = asText(data.specialRequests, 'Sem pedidos especiais');
  const propertyName = 'EnzoLoft';
  const propertyLocation = 'Vila Ruiva, Cuba - Beja';

  return {
    guestName,
    guest_name: guestName,
    name: guestName,
    checkIn,
    check_in: checkIn,
    startDate: checkIn,
    start_date: checkIn,
    checkOut,
    check_out: checkOut,
    endDate: checkOut,
    end_date: checkOut,
    nights: String(nightsValue),
    numberOfNights: String(nightsValue),
    number_of_nights: String(nightsValue),
    guests: String(guestsValue),
    guestsCount: String(guestsValue),
    guests_count: String(guestsValue),
    total: totalLabel,
    totalPrice: totalLabel,
    total_price: totalLabel,
    specialRequests,
    special_requests: specialRequests,
    propertyName,
    property_name: propertyName,
    propertyLocation,
    property_location: propertyLocation,
  };
}

function buildRecipients(...values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
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

function systemAlertTemplate(data) {
  const alerts = Array.isArray(data.alerts) ? data.alerts : [];
  const listItems = alerts
    .map((alert) => `<li style="margin:4px 0;">${String(alert || '-')}</li>`)
    .join('');

  return `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
      <h2 style="margin: 0 0 12px; color: #b45309;">${data.title || 'Alerta operacional'}</h2>
      ${listItems ? `<ul style="margin: 0 0 16px 20px; padding: 0;">${listItems}</ul>` : '<p>Sem detalhes adicionais.</p>'}
      ${data.dashboardUrl ? `<p><a href="${data.dashboardUrl}">Abrir dashboard</a></p>` : ''}
      <p>EnzoLoft</p>
    </div>
  `;
}

function reservationConfirmedTemplate(data) {
  const nights = calculateNights(data.startDate, data.endDate, data.nights);
  const total = Number(data.totalPrice || 0);

  return `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
      <h2 style="margin: 0 0 12px; color: #16a34a;">Reserva confirmada! ✅</h2>
      <p>Olá ${data.guestName || 'hóspede'},</p>
      <p>A sua reserva no <strong>EnzoLoft</strong> foi confirmada. Aguardamos a sua visita!</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;margin:16px 0;">
        <p style="margin:4px 0;"><strong>Check-in:</strong> ${formatDate(data.startDate)}</p>
        <p style="margin:4px 0;"><strong>Check-out:</strong> ${formatDate(data.endDate)}</p>
        <p style="margin:4px 0;"><strong>Noites:</strong> ${nights}</p>
        <p style="margin:4px 0;"><strong>Hóspedes:</strong> ${Number(data.guestsCount || 0)}</p>
        <p style="margin:4px 0;"><strong>Total:</strong> ${data.priceOnRequest ? 'Sob consulta' : `EUR ${total.toFixed(2)}`}</p>
      </div>
      <p>Para qualquer questão, contacte-nos em <a href="mailto:info@enzoloft.com">info@enzoloft.com</a>.</p>
      <p>Até breve,<br/>Equipa EnzoLoft<br/>Vila Ruiva, Cuba - Beja</p>
    </div>
  `;
}

function testEmailTemplate(data) {
  return `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
      <h2 style="margin: 0 0 12px; color: #16a34a;">Teste de email bem-sucedido</h2>
      <p>Este email confirma que a integração Resend do EnzoLoft está operacional.</p>
      <p><strong>Ambiente:</strong> produção</p>
      <p><strong>Disparado por:</strong> ${data.requestedBy || 'admin'}</p>
      <p><strong>Data:</strong> ${new Date().toLocaleString('pt-PT')}</p>
      <p>EnzoLoft</p>
    </div>
  `;
}

function buildMessage(payload, adminEmailValue) {
  const type = payload.type;
  const data = payload.data || {};

  const preReservationTemplateCandidates = [
    (process.env.RESEND_TEMPLATE_PRERESERVA || '').trim() || 'prereserva',
  ];

  const reservationConfirmationTemplateCandidates = [
    (process.env.RESEND_TEMPLATE_RESERVATION_CONFIRMATION || '').trim() || 'reservation-confirmation',
  ];

  if (type === 'reservation_confirmation') {
    const templateVariables = buildReservationConfirmationVariables(data);
    const recipients = buildRecipients(data.guestEmail, OPERATIONAL_NOTIFICATION_EMAIL);
    return {
      to: recipients,
      subject: 'EnzoLoft - Reserva confirmada! ✅',
      templateCandidates: reservationConfirmationTemplateCandidates,
      templateVariables,
      html: reservationConfirmedTemplate(data),
    };
  }

  if (type === 'prereserva') {
    const templateVariables = buildPreReservationVariables(data);
    const recipients = buildRecipients(data.guestEmail || data.toEmail, OPERATIONAL_NOTIFICATION_EMAIL);
    return {
      to: recipients,
      subject: 'EnzoLoft - Pré-reserva recebida',
      templateCandidates: preReservationTemplateCandidates,
      templateVariables,
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

  if (type === 'reservation_cancelled') {
    return {
      to: data.guestEmail,
      subject: 'EnzoLoft - Reserva cancelada',
      html: statusUpdateTemplate({ ...data, status: 'cancelled' }),
    };
  }

  if (type === 'system_alert') {
    const toEmail = (data.toEmail || adminEmailValue || '').toString();
    return {
      to: toEmail,
      subject: data.title || 'EnzoLoft - Alerta operacional',
      html: systemAlertTemplate(data),
    };
  }

  if (type === 'test_email') {
    const toEmail = (data.toEmail || adminEmailValue || '').toString();
    return {
      to: toEmail,
      subject: 'EnzoLoft - Teste de integração Resend',
      html: testEmailTemplate(data),
    };
  }

  return null;
}

exports.sendEmail = onRequest(
  {
    region: 'europe-west1',
    invoker: 'public',
    secrets: [RESEND_API_KEY, ADMIN_EMAIL, RESEND_FROM_EMAIL],
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

      const recipients = Array.isArray(message.to)
        ? message.to.map((value) => String(value || '').trim()).filter(Boolean)
        : [String(message.to || '').trim()].filter(Boolean);

      if (recipients.length === 0) {
        res.status(400).json({ error: 'Missing destination email' });
        return;
      }

      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromEmail = String(process.env.RESEND_FROM_EMAIL || 'reservas@enzoloft.pt').trim();
      const basePayload = {
        from: `EnzoLoft <${fromEmail}>`,
        subject: message.subject,
      };

      const templateCandidates = Array.isArray(message.templateCandidates)
        ? message.templateCandidates
        : [];
      const templateVariables = message.templateVariables || {};

      if (Object.keys(templateVariables).length > 0) {
        logger.info('reservation_template_variables', templateVariables);
      }

      const sendToRecipient = async (recipient) => {
        let result = null;
        let templateSelected = null;
        let lastError = null;

        for (const templateId of templateCandidates) {
          const templateResult = await resend.emails.send({
            ...basePayload,
            to: recipient,
            template: {
              id: templateId,
              variables: templateVariables,
            },
          });

          if (!templateResult.error) {
            result = templateResult;
            templateSelected = templateId;
            break;
          }

          lastError = templateResult.error;
          logger.warn('resend_template_candidate_failed', {
            type: payload.type,
            templateId,
            recipient,
            statusCode: templateResult.error.statusCode,
            name: templateResult.error.name,
          });
        }

        if (!result && message.html) {
          logger.warn('resend_template_fallback_html', {
            type: payload.type,
            recipient,
            attemptedTemplates: templateCandidates,
          });
          const htmlResult = await resend.emails.send({
            ...basePayload,
            to: recipient,
            html: message.html,
          });
          result = htmlResult;
          if (htmlResult.error) {
            lastError = htmlResult.error;
          }
        }

        if (templateSelected) {
          logger.info('resend_template_selected', { type: payload.type, recipient, templateId: templateSelected });
        }

        return { recipient, result, error: result?.error || lastError };
      };

      const sendResults = [];
      for (const recipient of recipients) {
        sendResults.push(await sendToRecipient(recipient));
      }

      const successfulSends = sendResults.filter((entry) => entry.result && !entry.result.error);
      const failedSends = sendResults.filter((entry) => entry.error);

      if (successfulSends.length === 0) {
        const firstError = failedSends[0]?.error || { message: 'Unknown email send error' };
        logger.error('resend_send_failed', firstError);
        res.status(502).json({ error: 'Failed to send email' });
        return;
      }

      if (failedSends.length > 0) {
        logger.warn('resend_partial_send_failure', {
          type: payload.type,
          failedRecipients: failedSends.map((entry) => entry.recipient),
          deliveredRecipients: successfulSends.map((entry) => entry.recipient),
        });
      }

      res.status(200).json({
        ok: true,
        id: successfulSends[0]?.result?.data?.id || null,
        deliveredRecipients: successfulSends.map((entry) => entry.recipient),
      });
    } catch (error) {
      logger.error('send_email_unhandled_error', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);
