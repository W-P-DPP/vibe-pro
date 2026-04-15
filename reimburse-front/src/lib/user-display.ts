export function getUserDisplayName(displayName?: string | null, username?: string | null) {
  const normalizedDisplayName = displayName?.trim();
  if (normalizedDisplayName) {
    return normalizedDisplayName;
  }

  const normalizedUsername = username?.trim();
  if (normalizedUsername) {
    return normalizedUsername;
  }

  return '当前用户';
}

export function getUserAvatarFallback(displayName?: string | null, username?: string | null) {
  const source = getUserDisplayName(displayName, username);
  const compact = source.replace(/\s+/g, '');

  if (!compact) {
    return '用户';
  }

  if (/[\u4e00-\u9fff]/.test(compact)) {
    return compact.slice(0, 2);
  }

  const words = source
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase();
  }

  return compact.slice(0, 2).toUpperCase();
}
