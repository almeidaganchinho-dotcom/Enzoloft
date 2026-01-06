import { NextApiRequest, NextApiResponse } from 'next';

// Mock data
const availability: any[] = [
  { id: 1, startDate: '2026-02-01', endDate: '2026-02-05', status: 'blocked', reason: 'Maintenance' },
  { id: 2, startDate: '2026-03-15', endDate: '2026-03-20', status: 'available' },
];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    res.status(200).json(availability);
  } else if (req.method === 'POST') {
    const { startDate, endDate, status, reason } = req.body;
    const newAvailability = {
      id: availability.length + 1,
      startDate,
      endDate,
      status,
      reason,
    };
    availability.push(newAvailability);
    res.status(201).json(newAvailability);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
