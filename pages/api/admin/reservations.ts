import type { NextApiRequest, NextApiResponse } from 'next';

// Mock database - em produção seria uma BD real
let mockReservations: any[] = [
  {
    id: '1',
    propertyId: '1',
    guestName: 'Maria Silva',
    guestEmail: 'maria@example.com',
    guestPhone: '912345678',
    startDate: new Date('2026-02-01'),
    endDate: new Date('2026-02-05'),
    nights: 4,
    guestsCount: 2,
    totalPrice: 400,
    status: 'pending',
    createdAt: new Date('2026-01-06'),
  },
  {
    id: '2',
    propertyId: '1',
    guestName: 'John Smith',
    guestEmail: 'john@example.com',
    guestPhone: '987654321',
    startDate: new Date('2026-02-10'),
    endDate: new Date('2026-02-15'),
    nights: 5,
    guestsCount: 3,
    totalPrice: 600,
    status: 'confirmed',
    createdAt: new Date('2026-01-05'),
  },
];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Retornar todas as reservas
    return res.status(200).json(mockReservations);
  }

  res.status(405).json({ error: 'Method not allowed' });
}