import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 });
    }

    const backendUrl = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/integrations/status`;


    const backendResponse = await axios.get(backendUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      timeout: 10000,
    });


    return NextResponse.json(backendResponse.data);
  } catch (error: any) {
    console.error('❌ Error fetching integration status:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch integration status', details: error.message },
      { status: error.response?.status || 500 }
    );
  }
}

