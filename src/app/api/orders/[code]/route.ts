import { NextRequest, NextResponse } from 'next/server';
import { getOrder, updateOrder, deleteOrder } from '@/lib/store';

interface RouteParams {
  params: Promise<{ code: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;
    const order = getOrder(code);

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(order);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;
    const order = getOrder(code);

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updates: Record<string, string> = {};

    if (body.orderStatus !== undefined) {
      if (!['pending', 'printing', 'completed'].includes(body.orderStatus)) {
        return NextResponse.json(
          { error: 'Invalid order status' },
          { status: 400 }
        );
      }
      updates.orderStatus = body.orderStatus;
    }

    if (body.paymentStatus !== undefined) {
      if (!['pending', 'paid'].includes(body.paymentStatus)) {
        return NextResponse.json(
          { error: 'Invalid payment status' },
          { status: 400 }
        );
      }
      updates.paymentStatus = body.paymentStatus;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const updated = updateOrder(code, updates);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;
    const order = getOrder(code);

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    deleteOrder(code);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    );
  }
}
