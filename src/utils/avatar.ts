// Modern letter-avatar generator with pleasant background colors

const AVATAR_COLORS = [
  '#4F8CFF', // Pulse Blue
  '#8B5CF6', // Purple
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#F43F5E', // Rose
  '#3B82F6', // Sky
];

/**
 * Get deterministic or random background color based on name
 */
export function getAvatarColor(name: string): string {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

/**
 * Generate a clean SVG data URL showing the first letter of the user's name
 */
export function generateLetterAvatar(name: string): string {
  const cleanName = (name || 'Member').trim();
  const letter = cleanName.charAt(0).toUpperCase() || 'M';
  const bgColor = getAvatarColor(cleanName);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <rect width="100" height="100" rx="28" fill="${bgColor}"/>
    <text x="50" y="50" dy=".35em" text-anchor="middle" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="48" font-weight="700">${letter}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Validate and resolve user avatar (returns custom photo URL or fallback letter avatar)
 */
export function resolveUserAvatar(avatarUrl?: string | null, name?: string): string {
  if (avatarUrl && (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://') || avatarUrl.startsWith('data:image/'))) {
    // Avoid old dicebear bot avatars if user wants clean fresh avatars
    if (!avatarUrl.includes('dicebear.com/7.x/bottts')) {
      return avatarUrl;
    }
  }
  return generateLetterAvatar(name || 'Member');
}

