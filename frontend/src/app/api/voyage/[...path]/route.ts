import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_BASE_URL = process.env.BACKEND_API_BASE_URL || 'http://127.0.0.1:8000/api';
const DOCKER_BACKEND_API_BASE_URL = 'http://backend:8000/api';

function buildBackendUrl(baseUrl: string, pathSegments: string[], request: NextRequest) {
  const backendUrl = new URL(`${baseUrl}/voyage/${pathSegments.join('/')}`);
  backendUrl.search = request.nextUrl.searchParams.toString();
  return backendUrl;
}

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
  const backendUrl = buildBackendUrl(BACKEND_API_BASE_URL, pathSegments, request);

  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  const accept = request.headers.get('accept');
  if (contentType) {
    headers.set('content-type', contentType);
  }
  if (accept) {
    headers.set('accept', accept);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: 'no-store',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text();
  }

  let response: Response;
  try {
    response = await fetch(backendUrl, init);
  } catch (error) {
    if (process.env.BACKEND_API_BASE_URL || BACKEND_API_BASE_URL === DOCKER_BACKEND_API_BASE_URL) {
      throw error;
    }
    response = await fetch(buildBackendUrl(DOCKER_BACKEND_API_BASE_URL, pathSegments, request), init);
  }

  const body = await response.text();
  const responseHeaders = new Headers();
  const responseContentType = response.headers.get('content-type');
  if (responseContentType) {
    responseHeaders.set('content-type', responseContentType);
  }

  return new NextResponse(body, {
    status: response.status,
    headers: responseHeaders,
  });
}

export async function GET(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context.params.path);
}

export async function POST(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context.params.path);
}

export async function PATCH(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context.params.path);
}

export async function PUT(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context.params.path);
}

export async function DELETE(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context.params.path);
}
