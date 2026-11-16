import { NextRequest, NextResponse } from 'next/server';
import { addOrder, getAllOrders } from '@/lib/store';
import { generateCode, calculateCost } from '@/lib/utils';
import type { Order, PrintFile, PrintOptions } from '@/lib/types';

export async function GET() {
  try {
    const orders = getAllOrders().sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return NextResponse.json(orders);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

interface CreateOrderBody {
  files: PrintFile[];
  printOptions: PrintOptions;
  paymentMethod: 'upi' | 'cash';
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateOrderBody = await request.json();

    if (!body.files || !Array.isArray(body.files) || body.files.length === 0) {
      return NextResponse.json(
        { error: 'At least one file is required' },
        { status: 400 }
      );
    }

    if (!body.printOptions) {
      return NextResponse.json(
        { error: 'Print options are required' },
        { status: 400 }
      );
    }

    if (!body.paymentMethod || !['upi', 'cash'].includes(body.paymentMethod)) {
      return NextResponse.json(
        { error: 'Payment method must be "upi" or "cash"' },
        { status: 400 }
      );
    }

    const code = generateCode();
    const estimatedCost = calculateCost(body.files, body.printOptions);

    const order: Order = {
      id: crypto.randomUUID(),
      code,
      files: body.files,
      printOptions: body.printOptions,
      paymentMethod: body.paymentMethod,
      paymentStatus: 'pending',
      orderStatus: 'pending',
      estimatedCost,
      createdAt: new Date().toISOString(),
    };

    addOrder(order);

    return NextResponse.json(order, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
