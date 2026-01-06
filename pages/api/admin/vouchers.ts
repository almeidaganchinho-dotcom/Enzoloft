import { NextApiRequest, NextApiResponse } from 'next';

// Mock data
const vouchers: any[] = [
  { id: 1, code: 'WELCOME20', discount: 20, type: 'percentage', expiry: '2026-12-31', usage: 5, maxUses: 100 },
  { id: 2, code: 'SUMMER30', discount: 30, type: 'percentage', expiry: '2026-08-31', usage: 2, maxUses: 50 },
];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    res.status(200).json(vouchers);
  } else if (req.method === 'POST') {
    const { code, discount, type, expiry, maxUses } = req.body;
    const newVoucher = {
      id: vouchers.length + 1,
      code,
      discount,
      type,
      expiry,
      usage: 0,
      maxUses,
    };
    vouchers.push(newVoucher);
    res.status(201).json(newVoucher);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
