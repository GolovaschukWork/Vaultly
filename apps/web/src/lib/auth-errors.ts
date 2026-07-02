export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

const AUTH_ERROR_KEYS: Record<string, string> = {
  'Invalid login credentials': 'invalidCredentials',
  'Email not confirmed': 'emailNotConfirmed',
  'User already registered': 'userAlreadyRegistered',
  'Password should be at least 6 characters': 'passwordTooShort',
  'Signup requires a valid password': 'passwordTooShort',
};

export function getAuthErrorKey(message: string): string | null {
  const normalized = message.toLowerCase();

  if (
    normalized.includes('provider is not enabled') ||
    normalized.includes('unsupported provider')
  ) {
    return 'googleProviderDisabled';
  }

  if (normalized.includes('unable to exchange external code')) {
    return 'oauthCodeExchangeFailed';
  }

  return AUTH_ERROR_KEYS[message] ?? null;
}
