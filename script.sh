#!/usr/bin/env bash
set -euo pipefail

FEATURE_BRANCH="feature/no-stripe"
PR_TITLE="Remove Stripe — reservations without payments"
PR_BODY="Removed Stripe integration. Reservations are created as pending and confirmed by admin via Supabase Studio."

# 1) cria branch
git fetch origin
git checkout -B "$FEATURE_BRANCH" origin/main || git checkout -b "$FEATURE_BRANCH"

# 2) sobrescreve os ficheiros com o conteúdo preparado
mkdir -p prisma
cat > prisma/schema.prisma <<'EOF'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id         String   @id @default(cuid())
  name       String?
  email      String   @unique
  role       String   @default("admin")
  createdAt  DateTime @default(now())
}

model Property {
  id          String   @id @default(cuid())
  title       String
  slug        String   @unique
  description String?
  images      String[] @default([])
  createdAt   DateTime @default(now())
  reservations Reservation[]
  availabilityRules AvailabilityRule[]
  pricings Pricing[]
}

model Reservation {
  id           String   @id @default(cuid())
  propertyId   String
  property     Property @relation(fields: [propertyId], references: [id])
  guestName    String
  guestEmail   String
  guestPhone   String?
  startDate    DateTime
  endDate      DateTime
  nights       Int
  guestsCount  Int
  totalPrice   Float
  status       String   @default("pending") // pending, confirmed, cancelled, completed
  createdAt    DateTime @default(now())
  messages     Message[]
}

model AvailabilityRule {
  id         String   @id @default(cuid())
  propertyId String
  property   Property @relation(fields: [propertyId], references: [id])
  startDate  DateTime
  endDate    DateTime
  type       String   // blocked | override-price
  price      Float?
  createdAt  DateTime @default(now())
}

model Pricing {
  id         String   @id @default(cuid())
  propertyId String
  property   Property @relation(fields: [propertyId], references: [id])
  startDate  DateTime?
  endDate    DateTime?
  nightly    Float
  minNights  Int      @default(1)
  createdAt  DateTime @default(now())
}

model Message {
  id            String   @id @default(cuid())
  reservationId String?
  reservation   Reservation? @relation(fields: [reservationId], references: [id])
  fromEmail     String
  toEmail       String
  body          String
  sentAt        DateTime @default(now())
}
EOF

mkdir -p pages/api
cat > pages/api/reservations.ts <<'EOF'
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../lib/prisma";
import { parseISO } from "date-fns";

type Body = {
  propertyId: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  guestsCount?: number;
  totalPrice: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body: Body = req.body;

  if (!body || !body.propertyId || !body.guestName || !body.guestEmail || !body.startDate || !body.endDate || body.totalPrice == null) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const start = parseISO(body.startDate);
  const end = parseISO(body.endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return res.status(400).json({ error: "Invalid dates" });
  }

  const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  // Basic availability check: any overlapping reservation that's not cancelled?
  const overlapping = await prisma.reservation.findFirst({
    where: {
      propertyId: body.propertyId,
      status: { not: "cancelled" },
      AND: [
        { startDate: { lte: end } },
        { endDate: { gte: start } }
      ]
    }
  });

  if (overlapping) {
    return res.status(409).json({ error: "Dates not available" });
  }

  // create reservation in DB with pending status — admin confirms later
  const reservation = await prisma.reservation.create({
    data: {
      propertyId: body.propertyId,
      guestName: body.guestName,
      guestEmail: body.guestEmail,
      guestPhone: body.guestPhone,
      startDate: start,
      endDate: end,
      nights,
      guestsCount: body.guestsCount || 1,
      totalPrice: body.totalPrice,
      status: "pending"
    }
  });

  // TODO: optionally send notification email to admin/guest

  return res.status(201).json({ reservation, message: "Reservation created. Awaiting admin confirmation." });
}
EOF

mkdir -p lib
cat > lib/prisma.ts <<'EOF'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
EOF

cat > .env.example <<'EOF'
# Database (Postgres) — example for Supabase/other
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME

# Next.js public URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase (if used)
SUPABASE_URL=https://your-supabase-url.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Admin initial user (example)
ADMIN_EMAIL=admin@enzoloft.example.com
ADMIN_TEMP_PASSWORD=changeme
EOF

cat > README.md <<'EOF'
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
EOF

cat > package.json <<'EOF'
{
  "name": "enzoloft",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev --name init"
  },
  "dependencies": {
    "@prisma/client": "^5.0.0",
    "axios": "^1.0.0",
    "date-fns": "^3.0.0",
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "autoprefixer": "^10.0.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.0.0",
    "postcss": "^8.0.0",
    "prisma": "^5.0.0",
    "tailwindcss": "^3.0.0",
    "typescript": "^5.0.0"
  }
}
EOF

# 3) instalar dependências opcionmente e gerar prisma client
npm install
npx prisma generate

# 4) criar migração local (vai pedir DATABASE_URL válido)
echo "Agora vais executar a migração Prisma (npx prisma migrate dev). Se não tiveres DATABASE_URL válido, cancela e substitui por um local ou supabase."
# read -p "Continuar com npx prisma migrate dev? (y/N) " yn
# if [[ "$yn" =~ ^[Yy]$ ]]; then
#   npx prisma migrate dev --name remove-stripe
# fi
echo "Migração pulada (não interativa)."

# 5) commitar e push
git add .
git commit -m "chore: remove Stripe, reservations without payments"
git push -u origin "$FEATURE_BRANCH"

# 6) criar PR (se tiveres gh CLI autenticado)
if command -v gh >/dev/null 2>&1; then
  gh pr create --title "$PR_TITLE" --body "$PR_BODY" --base main --head "$FEATURE_BRANCH"
  echo "PR criada via gh."
else
  echo "Branch '$FEATURE_BRANCH' push-ada. Abre um Pull Request manualmente no GitHub."
fi

echo "Feito."