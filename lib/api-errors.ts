import { NextResponse } from 'next/server';

export type SafeErrorCode =
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'FORBIDDEN_WORKSPACE'
  | 'FLYNET_UNAVAILABLE'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'CAMPAIGN_FULL'
  | 'QUALIFICATION_NOT_MET'
  | 'ATTENDANCE_REQUIRED'
  | 'SERVICE_TEMPORARY'
  | 'EXTERNAL_TEMPORARY';

const SAFE_MESSAGES: Record<SafeErrorCode, string> = {
  VALIDATION: 'Some required information is missing or invalid.',
  UNAUTHORIZED: 'Sign-in is required to continue.',
  FORBIDDEN: "You don't have access to this restaurant workspace.",
  FORBIDDEN_WORKSPACE: "You don't have access to this restaurant workspace.",
  FLYNET_UNAVAILABLE: 'Blackbird verification is temporarily unavailable. Nothing was changed. Try again in a moment.',
  NOT_FOUND: 'The requested tasting or resource could not be found.',
  CONFLICT: 'This action has already been completed.',
  CAMPAIGN_FULL: 'All available tasting slots for this dish have been filled. Check back soon for new sessions.',
  QUALIFICATION_NOT_MET: 'You are not qualified for this tasting.',
  ATTENDANCE_REQUIRED: 'You must check in at the restaurant venue before submitting tasting feedback.',
  SERVICE_TEMPORARY: "We couldn't complete that action right now. Nothing was changed. Try again in a moment.",
  EXTERNAL_TEMPORARY: 'Blackbird verification is temporarily unavailable. Nothing was changed. Try again in a moment.',
};

/**
 * Builds a public-safe JSON error response.
 * The technical detail is logged server-side only and NEVER sent to the client.
 */
export function safeError(
  status: number,
  code: SafeErrorCode,
  internalDetail?: unknown,
  extra?: Record<string, unknown>
) {
  if (internalDetail) {
    console.error(`[BlackPalate API ${status} ${code}]:`, internalDetail);
  }
  return NextResponse.json(
    { ok: false, success: false, code, message: SAFE_MESSAGES[code], ...extra },
    { status }
  );
}

/**
 * Converts an unknown caught exception into a safe 500/503 response.
 * Callers choose the safe code; default is SERVICE_TEMPORARY.
 */
export function safeCatch(err: unknown, code: SafeErrorCode = 'SERVICE_TEMPORARY') {
  return safeError(500, code, err);
}

/**
 * Blocks developer proof harnesses from serving as public product surface.
 * Returns a 404 response in production, null otherwise.
 */
export function proofGuard() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { ok: false, success: false, code: 'NOT_FOUND', message: SAFE_MESSAGES.NOT_FOUND },
      { status: 404 }
    );
  }
  return null;
}
