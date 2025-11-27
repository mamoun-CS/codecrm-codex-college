import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const backendUrl = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/integrations/register-website`;

    const backendResponse = await axios.post(backendUrl, body, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    return NextResponse.json(backendResponse.data);
  } catch (error: any) {
    console.error('❌ Error registering website:', error.message);
    return NextResponse.json(
      { 
        error: 'Failed to register website', 
        details: error.response?.data || error.message 
      },
      { status: error.response?.status || 500 }
    );
  }
}


