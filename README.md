# Enzo Loft — Scaffold (sem pagamentos automáticos)

Este scaffold implementa site + API de reservas sem integração de pagamento automático. O fluxo é:

- Visitante cria reserva via formulário (status = "pending").
- Admin confirma/cancela reservas manualmente via Supabase Studio (ou endpoints admin).
- Se quiseres payments manuais, podemos adicionar um modelo Payment para registar transações offline.

Setup local (resumo)
1. Copiar `.env.example` para `.env` e preencher DATABASE_URL e NEXT_PUBLIC_APP_URL
2. npm install
3. npx prisma generate
4. npx prisma migrate dev --name init
5. npm run dev

Endpoints principais
- POST /api/reservations — criar reserva (sem checkout)
- GET /api/availability?propertyId=&from=&to= — obter reservas sobrepostas

Admin
Usa o Supabase Studio para confirmar/cancelar reservas.
