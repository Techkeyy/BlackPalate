function errorType(error) {
  if (!error || typeof error !== 'object') return 'UNKNOWN_ERROR';
  if (error.name === 'FlynetError') return 'FLYNET_ERROR';
  if (error.name === 'TypeError') return 'TYPE_ERROR';
  if (error.name === 'AbortError') return 'ABORT_ERROR';
  if (error.name === 'Error') return 'ERROR';
  return 'EXTERNAL_ERROR';
}

function statusCode(error) {
  if (!error || typeof error !== 'object') return undefined;
  return Number.isInteger(error.status) && error.status >= 100 && error.status <= 599
    ? error.status
    : undefined;
}

export function logOAuthPhase(phase, details = {}) {
  console.info(`[Flynet OAuth] ${phase} ${JSON.stringify(details)}`);
}

export function logOAuthFailure(phase, failureCode, error) {
  const details = {
    phase,
    errorType: errorType(error),
    failureCode,
  };
  const status = statusCode(error);
  if (status !== undefined) details.httpStatus = status;
  // Never serialize the exception object or its message.
  console.error(`[Flynet OAuth] failure ${JSON.stringify(details)}`);
}
