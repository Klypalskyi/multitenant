export const extractHostname = (host) => {
    if (!host)
        return '';
    return host.split(':')[0].toLowerCase();
};
export const getSubDomain = (hostname) => {
    const parts = hostname.split('.');
    if (parts.length < 3)
        return null;
    return parts[0];
};
