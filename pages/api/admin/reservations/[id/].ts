import type { NextApiRequest, NextApiResponse } from 'next';

// Mock database
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
  const { id } = req.query;

  if (req.method === 'PATCH') {
    const { status } = req.body;
    const reservation = mockReservations.find(r => r.id === id);

    if (!reservation) {
      return res.status(404).json({ error: 'Reserva não encontrada' });
    }

    reservation.status = status;
    return res.status(200).json(reservation);
  }

  res.status(405).json({ error: 'Method not allowed' });
}