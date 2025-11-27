import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 });
    }

    const backendUrl = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/integrations`;


    const backendResponse = await axios.get(backendUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      timeout: 10000,
    });

    return NextResponse.json(backendResponse.data);
  } catch (error: any) {
    console.error('❌ [Integrations List Error]', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch integrations from backend',
        details: { message: error.message },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 });
    }

    const body = await request.json();
    const backendUrl = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/integrations`;


    const backendResponse = await axios.post(backendUrl, body, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    return NextResponse.json(backendResponse.data);
  } catch (error: any) {
    console.error('❌ [Create Integration Error]', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create integration',
        details: { message: error.message },
      },
      { status: 500 }
    );
  }
}