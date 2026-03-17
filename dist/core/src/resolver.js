import { getSubDomain } from "./utils";
const WILDCARD = '*.';
export const resolveDomain = (hostname, domains) => {
    // exact match
    if (typeof domains === 'object') {
        for (const pattern in domains) {
            const value = domains[pattern];
            const isFunc = typeof value === 'function';
            // exact
            if (!pattern.includes('*') && pattern === hostname) {
                return isFunc ? value(hostname) : value;
            }
            // wildcard *.domain.com
            if (pattern.startsWith(WILDCARD)) {
                const base = pattern.replace(WILDCARD, '');
                if (hostname.endsWith(base)) {
                    const sub = getSubDomain(hostname);
                    if (!sub)
                        return null;
                    return isFunc ? value(sub) : value;
                }
            }
        }
    }
    return null;
};
