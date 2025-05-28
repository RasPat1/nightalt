import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  
  const events = await prisma.event.findMany({
    where: {
      userId: 'demo-user-id', // Hardcoded for MVP
      timestamp: {
        gte: start ? new Date(start) : undefined,
        lte: end ? new Date(end) : undefined,
      },
    },
    orderBy: { timestamp: 'desc' },
  });

  return NextResponse.json(events);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const event = await prisma.event.create({
    data: {
      ...body,
      userId: 'demo-user-id', // Hardcoded for MVP
      timestamp: new Date(body.timestamp),
    },
  });

  return NextResponse.json(event);
}