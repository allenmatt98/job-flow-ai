import { HeuristicStrategy } from '../strategies/HeuristicStrategy';
import { GreenhouseStrategy } from '../strategies/GreenhouseStrategy';
import { GoogleFormsStrategy } from '../strategies/GoogleFormsStrategy';
import { SmartRecruitersStrategy } from '../strategies/SmartRecruitersStrategy';

export class StrategyManager {
    constructor() {
        this.strategies = [
            // Specific strategies checked first
            new GreenhouseStrategy(),
            new GoogleFormsStrategy(),
            new SmartRecruitersStrategy(),
        ];
        this.heuristicStrategy = new HeuristicStrategy();
    }

    getStrategy() {
        const hostname = window.location.hostname;

        for (const strategy of this.strategies) {
            if (strategy.matches(hostname)) {
                console.log(`[Job Flow AI] Selected strategy: ${strategy.name}`);
                return strategy;
            }
        }

        console.log('[Job Flow AI] Selected strategy: Heuristic (Fallback)');
        return this.heuristicStrategy;
    }
}
