import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: Request, { params }: { params: Promise<{ source: string }> }) {
  const { source } = await params; // ✅ انتظر params قبل الاستخدام
  try {
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error('Failed to parse JSON body:', jsonError);
      // For testing purposes, provide a default body if JSON parsing fails
      body = { test: true, source };
    }

    const token = request.headers.get('x-auth-token');
    if (token !== process.env.FRONTEND_WEBHOOK_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized request' }, { status: 401 });
    }

    // Website forms use the specific endpoint, not the generic webhook
    const backendUrl = source === 'website'
      ? `${process.env.BACKEND_URL || 'http://localhost:3001'}/integrations/website`
      : `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/integrations/${source}`;


    const backendResponse = await axios.post(backendUrl, body, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BACKEND_API_TOKEN}`,
      },
      timeout: 10000, // 10 second timeout
      validateStatus: function (status) {
        return status < 500; // Resolve only if the status code is less than 500
      }
    });

    // Return backend response directly
    return NextResponse.json(backendResponse.data);
  } catch (error: any) {
    console.error(`❌ [Integration Gateway Error: ${source}]`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to forward to backend',
        backend_url: source === 'website'
          ? `${process.env.BACKEND_URL || 'http://localhost:3001'}/integrations/website`
          : `${process.env.BACKEND_URL || 'http://localhost:3001'}/integrations/webhook/${source}`,
        details: { message: error.message },
      },
      { status: 500 }
    );
  }
}
