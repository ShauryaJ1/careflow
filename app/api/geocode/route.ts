import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter (for production, use Redis or similar)
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

/**
 * Server-side geocoding API route to avoid CORS issues
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      // Wait for the remaining time to respect rate limit
      await new Promise(resolve => 
        setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
      );
    }
    
    lastRequestTime = Date.now();
    
    const { address } = await request.json();
    
    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }
    
    const encodedAddress = encodeURIComponent(address.trim());
    
    // Call Nominatim API from server (no CORS issues)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
      {
        headers: {
          'User-Agent': 'CareFlow Healthcare App/1.0',
        },
      }
    );
    
    if (!response.ok) {
      console.error('Geocoding API error:', response.statusText);
      return NextResponse.json(
        { error: 'Geocoding service unavailable' },
        { status: 502 }
      );
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      const result = data[0];
      return NextResponse.json({
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        display_name: result.display_name,
      });
    }
    
    return NextResponse.json(
      { error: 'Location not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
