export type MarketKey = string;
export type MarketConfig = Record<string, any>;
export type MarketsMap = Record<MarketKey, MarketConfig>;
export type DomainMap = Record<string, MarketKey> | {
    [pattern: string]: (value: string) => MarketKey;
};
export type CreateMarketManagerOptions = {
    markets: MarketsMap;
    domains: DomainMap;
    defaultMarket?: MarketKey;
};
