export type OAuthFailureCode =
  | 'OAUTH_PROVIDER_ERROR'
  | 'OAUTH_STATE_INVALID'
  | 'PKCE_VERIFIER_MISSING'
  | 'OAUTH_TOKEN_EXCHANGE_FAILED'
  | 'OAUTH_SESSION_COOKIE_WRITE_FAILED';

type SafeLogValue = boolean | number | string;

function errorType(error: unknown): string {
  if (!error || typeof error !== 'object') return 'UNKNOWN_ERROR';
  const name = (error as { name?: unknown }).name;
  if (name === 'FlynetError') return 'FLYNET_ERROR';
  if (name === 'TypeError') return 'TYPE_ERROR';
  if (name === 'AbortError') return 'ABORT_ERROR';
  if (name === 'Error') return 'ERROR';
  return 'EXTERNAL_ERROR';
}

function statusCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599
    ? status
    : undefined;
}

export function logOAuthPhase(
  phase: string,
  details: Record<string, SafeLogValue> = {}
): void {
  // Keep all diagnostic data in one message so Vercel request logs retain the
  // safe boolean/numeric fields instead of dropping the second console arg.
  console.info(`[Flynet OAuth] ${phase} ${JSON.stringify(details)}`);
}

export function logOAuthFailure(
  phase: string,
  failureCode: OAuthFailureCode,
  error?: unknown
): void {
  const status = statusCode(error);
  const details: Record<string, SafeLogValue> = {
    phase,
    errorType: errorType(error),
    failureCode,
  };
  if (status !== undefined) details.httpStatus = status;
  // Never serialize the exception object or its message.
  console.error(`[Flynet OAuth] failure ${JSON.stringify(details)}`);
}
