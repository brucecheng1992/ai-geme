export function sanitizeWorkbenchText(value: string): string {
  return containsBlockedWorkbenchText(value) ? 'Reason hidden by Workbench.' : value;
}

export function sanitizeWorkbenchErrorMessage(message: string, fallback = 'Request failed.'): string {
  if (message.trim().length === 0) {
    return fallback;
  }
  if (!containsBlockedWorkbenchText(message)) {
    return message;
  }

  const statusMatch = message.match(/^(\d{3})(?:\s|$)/);
  return statusMatch ? `${statusMatch[1]} Error` : fallback;
}

export function sanitizeWorkbenchDisplayText(value: string): string {
  return value
    .replace(/\/(?:Users|home|tmp|var\/folders)\/[^\s"'<>)]*/g, '[local path hidden]')
    .replace(/[A-Za-z]:\\[^\s"'<>)]*/g, '[local path hidden]')
    .replace(/(?:process\.env\.[A-Za-z0-9_]+|[A-Z][A-Z0-9_]*API_KEY|Bearer\s+[A-Za-z0-9._~+/=-]+|authorization|api key|secret|token|raw provider)/gi, '[sensitive text hidden]');
}

export function isSafeWorkbenchRelativePath(path: string): boolean {
  return (
    path.length > 0 &&
    !path.startsWith('/') &&
    !/^[A-Za-z]:\//.test(path) &&
    !/^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(path) &&
    !path.includes('\\') &&
    !path.split('/').includes('..') &&
    !containsBlockedWorkbenchText(path)
  );
}

export function isSafeWorkbenchEvidenceRef(ref: string): boolean {
  const separator = ref.indexOf(':');
  return separator > 0 && !containsBlockedWorkbenchText(ref) && isSafeWorkbenchRelativePath(ref.slice(separator + 1));
}

export function containsBlockedWorkbenchText(value: string): boolean {
  return /authorization|api key|secret|token|Bearer\s+|[A-Z][A-Z0-9_]*API_KEY|process\.env\.|raw provider|\/(?:Users|home|tmp|var\/folders)\/|[A-Za-z]:\\/i.test(value);
}
