/**
 * Settings API Routes
 *
 * GET /api/settings - Get current settings
 * PUT /api/settings - Update settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/db';
import { Settings } from '@/types';

export async function GET() {
  try {
    const settings = getSettings();

    // Mask the API key for security (only show last 4 characters)
    const maskedSettings = {
      ...settings,
      api_key: settings.api_key
        ? `${'*'.repeat(Math.max(0, settings.api_key.length - 4))}${settings.api_key.slice(-4)}`
        : '',
      has_api_key: !!settings.api_key,
    };

    return NextResponse.json({
      success: true,
      data: maskedSettings,
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch settings',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body: Partial<Settings> = await request.json();

    // Update settings
    updateSettings(body);

    // Return updated settings (masked)
    const settings = getSettings();
    const maskedSettings = {
      ...settings,
      api_key: settings.api_key
        ? `${'*'.repeat(Math.max(0, settings.api_key.length - 4))}${settings.api_key.slice(-4)}`
        : '',
      has_api_key: !!settings.api_key,
    };

    return NextResponse.json({
      success: true,
      data: maskedSettings,
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update settings',
      },
      { status: 500 }
    );
  }
}
