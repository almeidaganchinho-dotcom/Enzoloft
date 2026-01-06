import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  // Demo credentials
  if (email === 'admin@enzoloft.com' && password === 'password123') {
    const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');
    return res.status(200).json({ token, message: 'Login successful' });
  }

  return res.status(401).json({ message: 'Credenciais inválidas' });
}