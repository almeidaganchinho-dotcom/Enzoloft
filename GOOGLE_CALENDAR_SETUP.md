# Integracao Google Calendar (Webhook)

Este projeto e exportado como site estatico, por isso a integracao com Google Calendar deve ser feita por um endpoint HTTPS externo.

Opcao recomendada: Google Apps Script (Web App) com acesso ao seu Google Calendar.

## 1) Criar Apps Script

1. Abra https://script.google.com/
2. Crie um novo projeto
3. Cole o codigo abaixo em `Code.gs`
4. Em `CALENDAR_ID`, use `primary` ou o ID do calendario
5. Deploy > New deployment > Web app
6. Execute as: `Me`
7. Who has access: `Anyone`
8. Copie a URL do Web App

```javascript
const CALENDAR_ID = 'primary';

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const reservation = body.reservation || {};

    if (!reservation.startDate || !reservation.endDate || !reservation.guestName) {
      return jsonResponse({ ok: false, error: 'Dados incompletos' }, 400);
    }

    const checkIn = new Date(reservation.startDate + 'T15:00:00');
    const checkOut = new Date(reservation.endDate + 'T11:00:00');

    const title = `Reserva pendente - ${reservation.guestName}`;
    const priceLabel = reservation.priceOnRequest
      ? 'Sob consulta'
      : `EUR ${Number(reservation.totalPrice || 0).toFixed(2)}`;

    const description = [
      `Reserva ID: ${reservation.id || 'N/A'}`,
      `Hospede: ${reservation.guestName}`,
      `Email: ${reservation.guestEmail || 'N/A'}`,
      `Telefone: ${reservation.guestPhone || 'N/A'}`,
      `Hospedes: ${reservation.guestsCount || 'N/A'}`,
      `Preco: ${priceLabel}`,
      `Estado: ${reservation.status || 'pending'}`,
      `Pedidos especiais: ${reservation.specialRequests || 'Sem pedidos especiais'}`
    ].join('\n');

    const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
    const event = calendar.createEvent(title, checkIn, checkOut, {
      description,
      guests: reservation.guestEmail || undefined,
      sendInvites: false,
    });

    return jsonResponse({ ok: true, eventId: event.getId() }, 200);
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error) }, 500);
  }
}

function jsonResponse(payload, statusCode) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## 2) Configurar variavel no projeto

No `.env.local`:

```env
NEXT_PUBLIC_GOOGLE_CALENDAR_WEBHOOK_URL=https://script.google.com/macros/s/SEU_DEPLOYMENT_ID/exec
```

## 3) Deploy do site

```bash
npm run build && firebase deploy
```

## Payload enviado pelo formulario

O frontend envia um POST JSON com:

- `source`: `enzoloft_booking_form`
- `reservation.id`
- `reservation.guestName`
- `reservation.guestEmail`
- `reservation.guestPhone`
- `reservation.specialRequests`
- `reservation.startDate`
- `reservation.endDate`
- `reservation.guestsCount`
- `reservation.totalPrice`
- `reservation.priceOnRequest`
- `reservation.status`
- `reservation.createdAt`

## Observacoes

- Se o webhook falhar, a reserva continua a ser criada (nao bloqueia o utilizador).
- Para maior seguranca, pode proteger o endpoint no Apps Script validando um token no payload.
