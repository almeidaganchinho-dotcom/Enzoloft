import { NextApiRequest, NextApiResponse } from 'next';

// Mock data
const prices: any[] = [
  { id: 1, season: 'Low', pricePerNight: 80, startDate: '2026-01-01', endDate: '2026-03-31' },
  { id: 2, season: 'Mid', pricePerNight: 120, startDate: '2026-04-01', endDate: '2026-08-31' },
  { id: 3, season: 'High', pricePerNight: 180, startDate: '2026-09-01', endDate: '2026-12-31' },
];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    res.status(200).json(prices);
  } else if (req.method === 'POST') {
    const { season, pricePerNight, startDate, endDate } = req.body;
    const newPrice = {
      id: prices.length + 1,
      season,
      pricePerNight,
      startDate,
      endDate,
    };
    prices.push(newPrice);
    res.status(201).json(newPrice);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
