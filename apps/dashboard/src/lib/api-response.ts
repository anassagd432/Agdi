import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>; // For validation errors
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
};

/**
 * Sends a JSON success response.
 */
export function sendSuccess<T>(
  data: T,
  meta?: ApiResponse<T>['meta'],
  status: number = 200
) {
  return NextResponse.json(
    { success: true, data, meta },
    { status }
  );
}

/**
 * Sends a JSON error response.
 * Handles generic errors and Zod validation errors.
 */
export function sendError(error: unknown) {
  console.error('[API Error]:', error);

  if (error instanceof ZodError) {
    const formattedErrors = error.flatten().fieldErrors;
    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        errors: formattedErrors,
      },
      { status: 400 }
    );
  }

  if (error instanceof Error) {
    // Handle specific auth errors if you have custom classes
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access' },
        { status: 401 }
      );
    }
  }

  return NextResponse.json(
    { success: false, error: 'Internal Server Error' },
    { status: 500 }
  );
}