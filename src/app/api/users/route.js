// API route for users using Firebase
import { NextResponse } from 'next/server';
import { getUsers, getUser, updateUser, getUsersByRole } from '@/lib/firestore';
import { getCurrentUser, isAdmin } from '@/lib/firebaseAuth';

// GET /api/users - Get users (admin only)
export async function GET(request) {
  try {
    const user = getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userIsAdmin = await isAdmin(user.uid);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const limit = parseInt(searchParams.get('limit')) || 50;

    let result;
    if (role) {
      result = await getUsersByRole(role);
    } else {
      result = await getUsers(limit);
    }
    
    if (result.success) {
      return NextResponse.json({ users: result.data });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error('[USERS_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/users - Update user
export async function PUT(request) {
  try {
    const user = getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, ...updateData } = body;

    // Users can only update their own data, unless they're admin
    const userIsAdmin = await isAdmin(user.uid);
    if (userId !== user.uid && !userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden - Can only update own profile' }, { status: 403 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const result = await updateUser(userId, updateData);
    
    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error('[USERS_PUT]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

