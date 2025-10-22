// API route for member trades using Firebase
import { NextResponse } from 'next/server';
import { addMemberTrade, getMemberTrades, updateMemberTrade } from '@/lib/firestore';
import { getCurrentUser } from '@/lib/firebaseAuth';

// GET /api/member-trades - Get user's trades
export async function GET(request) {
  try {
    const user = getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getMemberTrades(user.uid);
    
    if (result.success) {
      return NextResponse.json({ trades: result.data });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error('[MEMBER_TRADES_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/member-trades - Create new trade
export async function POST(request) {
  try {
    const user = getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['signalId', 'entryPrice'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    const tradeData = {
      userId: user.uid,
      signalId: body.signalId,
      entryPrice: parseFloat(body.entryPrice),
      exitPrice: body.exitPrice ? parseFloat(body.exitPrice) : null,
      result: body.result || null,
      pipsGained: body.pipsGained || 0,
      notes: body.notes || '',
      followedAt: new Date(),
      closedAt: body.closedAt ? new Date(body.closedAt) : null
    };

    const result = await addMemberTrade(tradeData);
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        trade: { id: result.id, ...tradeData } 
      }, { status: 201 });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error('[MEMBER_TRADES_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/member-trades - Update trade
export async function PUT(request) {
  try {
    const user = getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tradeId, ...updateData } = body;

    if (!tradeId) {
      return NextResponse.json({ error: 'Trade ID is required' }, { status: 400 });
    }

    const result = await updateMemberTrade(tradeId, updateData);
    
    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error('[MEMBER_TRADES_PUT]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

