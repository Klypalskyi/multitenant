import { CreateMarketManagerOptions, DomainMap, MarketConfig, MarketKey, MarketsMap } from "./types";

import { extractHostname } from "./utils";
import { resolveDomain } from "./resolver";

export class MarketManage {
  private markets: CreateMarketManagerOptions['markets'];

  private domains: CreateMarketManagerOptions['domains'];

  private defaultMarket?: CreateMarketManagerOptions['defaultMarket'];

  constructor(options: CreateMarketManagerOptions) {
    this.markets = options.markets;
    this.domains = options.domains;
    this.defaultMarket = options.defaultMarket;
  }

  resolve(host: string | null) {
    const hostname = extractHostname(host);
    const market = resolveDomain(hostname, this.domains);

    if (market && this.markets[market]) return market;

    if (this.defaultMarket) return this.defaultMarket;

    throw new Error(`
      [tenantify] Cannot resolve market for host: ${hostname}
      `)
  };

  getConfig(market: MarketKey): MarketConfig {
    const config = this.markets[market];

    if (!config) {
      throw new Error(`
        [tenantify] Unknown market: ${market}
      `)
    }

    return config;
  }

  getAllMarkets() {
    return this.markets;
  }
}