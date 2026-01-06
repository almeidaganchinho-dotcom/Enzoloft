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
