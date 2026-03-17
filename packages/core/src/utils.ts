export const extractHostname = (host?: string | null): string => {
  if (!host) return '';

  return host.split(':')[0].toLowerCase();
}

export const getSubDomain = (hostname: string): string | null => {
  const parts = hostname.split('.');
  
  if (parts.length < 3) return null;

  return parts[0];
};