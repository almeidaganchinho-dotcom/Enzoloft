import { NextApiRequest, NextApiResponse } from 'next';

// Mock analytics data
const analyticsData = {
  visitors: [
    { date: 'Jan 1', visitors: 120, bookings: 3 },
    { date: 'Jan 2', visitors: 150, bookings: 4 },
    { date: 'Jan 3', visitors: 180, bookings: 5 },
    { date: 'Jan 4', visitors: 200, bookings: 6 },
    { date: 'Jan 5', visitors: 240, bookings: 8 },
    { date: 'Jan 6', visitors: 280, bookings: 10 },
  ],
  revenue: [
    { month: 'Jan', revenue: 2400 },
    { month: 'Feb', revenue: 3200 },
    { month: 'Mar', revenue: 2800 },
    { month: 'Apr', revenue: 3900 },
    { month: 'May', revenue: 4800 },
    { month: 'Jun', revenue: 5400 },
  ],
  occupancy: { occupied: 45, available: 55 },
  kpis: {
    avgVisitorsPerDay: 193,
    conversionRate: 3.6,
    avgRevenuePerBooking: 540,
    avgStayDuration: 4.5,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { period } = req.query;
    // In a real app, fetch data based on period (week, month, year)
    res.status(200).json(analyticsData);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
