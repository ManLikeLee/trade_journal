import { InsightsService } from './insights.service';
export declare class InsightsController {
    private readonly insightsService;
    constructor(insightsService: InsightsService);
    getInsights(req: any, accountId?: string): Promise<import("./insights.service").Insight[]>;
}
