import fs from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_CACHE_DIR } from '@multitenant/next-app';

export async function invalidateCache(options: {
  locales: string[];
  cacheDir?: string;
  cwd: string;
}): Promise<void> {
  const cacheDir = path.resolve(options.cwd, options.cacheDir ?? DEFAULT_CACHE_DIR);
  const localesDir = path.join(cacheDir, 'locales');

  const invalidateAll = options.locales.includes('all');

  if (invalidateAll) {
    await fs.rm(localesDir, { recursive: true, force: true });
    console.log('Invalidated cache for all locales');
    return;
  }

  for (const locale of options.locales) {
    const localeDir = path.join(localesDir, locale);
    await fs.rm(localeDir, { recursive: true, force: true });
    console.log(`Invalidated cache for locale: ${locale}`);
  }
}

interface CacheFileStats {
  locale: string;
  count: number;
  lastModified?: Date;
}

export async function printCacheStats(options: {
  cacheDir?: string;
  cwd: string;
}): Promise<void> {
  const cacheDir = path.resolve(options.cwd, options.cacheDir ?? DEFAULT_CACHE_DIR);
  const localesDir = path.join(cacheDir, 'locales');

  try {
    await fs.access(localesDir);
  } catch {
    console.log(`No cache found at ${options.cacheDir ?? DEFAULT_CACHE_DIR}`);
    return;
  }

  const stats = new Map<string, CacheFileStats>();
  let totalCount = 0;

  // Walk locales directory
  const locales = await fs.readdir(localesDir);
  for (const locale of locales) {
    const localeDir = path.join(localesDir, locale);
    const dirStat = await fs.stat(localeDir);

    if (!dirStat.isDirectory()) continue;

    try {
      const files = await fs.readdir(localeDir);
      const jsonFiles = files.filter((f) => f.endsWith('.json'));

      if (jsonFiles.length === 0) continue;

      // Use filesystem mtime instead of parsing files
      let lastModified: Date | undefined;
      for (const file of jsonFiles) {
        const filePath = path.join(localeDir, file);
        try {
          const fileStat = await fs.stat(filePath);
          if (!lastModified || fileStat.mtime > lastModified) {
            lastModified = fileStat.mtime;
          }
        } catch {
          // Skip inaccessible files
        }
      }

      stats.set(locale, { locale, count: jsonFiles.length, lastModified });
      totalCount += jsonFiles.length;
    } catch {
      // Skip unreadable locale dirs
    }
  }

  if (stats.size === 0) {
    console.log(`No cache found at ${options.cacheDir ?? DEFAULT_CACHE_DIR}`);
    return;
  }

  console.log(`Cache stats (${options.cacheDir ?? DEFAULT_CACHE_DIR}):`);
  const sortedLocales = Array.from(stats.values()).sort((a, b) =>
    a.locale.localeCompare(b.locale),
  );
  for (const stat of sortedLocales) {
    const lastCachedStr = stat.lastModified ? `, last cached ${stat.lastModified.toISOString()}` : '';
    console.log(`  ${stat.locale}: ${stat.count} entries${lastCachedStr}`);
  }
  console.log(`Total: ${totalCount} entries`);
}
