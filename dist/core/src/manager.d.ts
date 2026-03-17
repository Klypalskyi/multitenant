import { CreateMarketManagerOptions, MarketConfig, MarketKey, MarketsMap } from "./types";
export declare class MarketManage {
    private markets;
    private domains;
    private defaultMarket?;
    constructor(options: CreateMarketManagerOptions);
    resolve(host: string | null): string;
    getConfig(market: MarketKey): MarketConfig;
    getAllMarkets(): MarketsMap;
}
