
export class SmartMatcher {
    constructor() {
        // Coredictionaries for expansion
        this.synonyms = {
            // Degrees — Undergraduate
            'btech': ['bachelor', 'technology'],
            'be': ['bachelor', 'engineering'],
            'bs': ['bachelor', 'science'],
            'bsc': ['bachelor', 'science'],
            'ba': ['bachelor', 'arts'],
            'bba': ['bachelor', 'business', 'administration'],
            'bcom': ['bachelor', 'commerce'],
            'bfa': ['bachelor', 'fine', 'arts'],
            'barch': ['bachelor', 'architecture'],
            'llb': ['bachelor', 'law', 'laws'],
            'beng': ['bachelor', 'engineering'],
            'aa': ['associate', 'arts'],
            'as': ['associate', 'science'],
            'associates': ['associate'],
            'ged': ['general', 'education', 'diploma'],
            'highschool': ['high', 'school'],

            // Degrees — Graduate / Professional
            'mtech': ['master', 'technology'],
            'ms': ['master', 'science'],
            'msc': ['master', 'science'],
            'ma': ['master', 'arts'],
            'mba': ['master', 'business', 'administration'],
            'mcom': ['master', 'commerce'],
            'mfa': ['master', 'fine', 'arts'],
            'mph': ['master', 'public', 'health'],
            'msw': ['master', 'social', 'work'],
            'med': ['master', 'education'],
            'meng': ['master', 'engineering'],
            'phd': ['doctor', 'philosophy'],
            'jd': ['juris', 'doctor', 'law'],
            'md': ['doctor', 'medicine'],
            'edd': ['doctor', 'education'],
            'dba': ['doctor', 'business', 'administration'],

            // Universities — India
            'iit': ['indian', 'institute', 'technology'],
            'nit': ['national', 'institute', 'technology'],
            'bits': ['birla', 'institute', 'technology'],
            'iiit': ['indian', 'institute', 'information', 'technology'],

            // Universities — US
            'cmu': ['carnegie', 'mellon', 'university'],
            'mit': ['massachusetts', 'institute', 'technology'],
            'nyu': ['new', 'york', 'university'],
            'ucla': ['university', 'california', 'los', 'angeles'],
            'caltech': ['california', 'institute', 'technology'],
            'gatech': ['georgia', 'institute', 'technology'],
            'stanford': ['stanford', 'university'],
            'uiuc': ['university', 'illinois', 'urbana', 'champaign'],
            'umich': ['university', 'michigan'],
            'upenn': ['university', 'pennsylvania'],
            'ucb': ['university', 'california', 'berkeley'],
            'usc': ['university', 'southern', 'california'],
            'asu': ['arizona', 'state', 'university'],
            'bu': ['boston', 'university'],
            'neu': ['northeastern', 'university'],
            'uw': ['university', 'washington'],
            'ut': ['university', 'texas'],
            'osu': ['ohio', 'state', 'university'],
            'psu': ['penn', 'state', 'university'],
            'unc': ['university', 'north', 'carolina'],
            'ucsd': ['university', 'california', 'san', 'diego'],
            'ucd': ['university', 'california', 'davis'],
            'uci': ['university', 'california', 'irvine'],
            'ucsc': ['university', 'california', 'santa', 'cruz'],
            'gmu': ['george', 'mason', 'university'],
            'gwu': ['george', 'washington', 'university'],
            'cu': ['columbia', 'university'],

            // Universities — International
            'lse': ['london', 'school', 'economics'],
            'ucl': ['university', 'college', 'london'],
            'nus': ['national', 'university', 'singapore'],
            'uoft': ['university', 'toronto'],
            'ubc': ['university', 'british', 'columbia'],
            'eth': ['swiss', 'federal', 'institute', 'technology'],
            'oxbridge': ['oxford', 'cambridge'],

            // Cities / Locations
            'bangalore': ['bengaluru'],
            'bengaluru': ['bangalore'],
            'bom': ['mumbai'],
            'bombay': ['mumbai'],
            'trichy': ['tiruchirappalli'],
            'vizag': ['visakhapatnam'],
            'cal': ['calcutta', 'kolkata'],
            'madras': ['chennai'],
            'ggn': ['gurgaon', 'gurugram'],
            'nyc': ['new', 'york', 'city'],
            'sf': ['san', 'francisco'],
            'la': ['los', 'angeles'],
            'dc': ['washington', 'district', 'columbia'],
            'chi': ['chicago'],
            'atl': ['atlanta'],
            'bos': ['boston'],
            'sea': ['seattle'],
            'phx': ['phoenix'],
            'den': ['denver'],

            // Countries
            'us': ['united', 'states'],
            'usa': ['united', 'states', 'america'],
            'uk': ['united', 'kingdom'],
            'uae': ['united', 'arab', 'emirates']
        };

        this.stopWords = new Set([
            'of', 'the', 'and', 'in', 'at', 'for', 'a', 'an',
            'or', 'to', 'is', 'by', 'with', 'from'
        ]);
    }

    /**
     * Finds the best match from a list of options for a given query.
     * @param {string} query - The user's input (e.g., "NIT Trichy", "B.Tech")
     * @param {string[]} options - List of dropdown strings
     * @param {number} threshold - Minimum score to consider a match (0-1), default 0.6
     * @returns {string|null} - The best matching option or null
     */
    findBestMatch(query, options, threshold = 0.6) {
        if (!query || !options || options.length === 0) return null;

        const normalizedQueryTokens = this.tokenizeAndExpand(query);
        let bestMatch = null;
        let bestScore = -1;

        for (const option of options) {
            const normalizedOptionTokens = this.tokenizeAndExpand(option);
            const score = this.calculateSimilarity(normalizedQueryTokens, normalizedOptionTokens);

            if (score > bestScore) {
                bestScore = score;
                bestMatch = option;
            }
        }

        console.log(`[SmartMatcher] Query: "${query}" | Best: "${bestMatch}" | Score: ${bestScore}`);

        return bestScore >= threshold ? bestMatch : null;
    }

    /**
     * Tiered matching with confidence levels. Keeps findBestMatch intact for backwards compat.
     *
     * @param {string} query - The user's input
     * @param {string[]} options - List of dropdown strings
     * @returns {{ match: string, confidence: 'high'|'medium', score: number }|null}
     */
    findBestMatchTiered(query, options) {
        if (!query || !options || options.length === 0) return null;

        const queryLower = query.trim().toLowerCase();

        // Tier 1: Exact case-insensitive match
        for (const option of options) {
            if (option.trim().toLowerCase() === queryLower) {
                return { match: option, confidence: 'high', score: 1.0 };
            }
        }

        // Tier 1b: Substring containment (query in option or option in query)
        for (const option of options) {
            const optLower = option.trim().toLowerCase();
            // Skip very short options (e.g., empty, single char) for containment
            if (optLower.length < 2 || queryLower.length < 2) continue;
            if (optLower.includes(queryLower) || queryLower.includes(optLower)) {
                return { match: option, confidence: 'high', score: 0.95 };
            }
        }

        // Tier 2: Fuzzy matching with expanded scoring
        const normalizedQueryTokens = this.tokenizeAndExpand(query);
        let bestMatch = null;
        let bestScore = -1;

        for (const option of options) {
            const normalizedOptionTokens = this.tokenizeAndExpand(option);
            const score = this.calculateSimilarity(normalizedQueryTokens, normalizedOptionTokens);

            if (score > bestScore) {
                bestScore = score;
                bestMatch = option;
            }
        }

        console.log(`[SmartMatcher:Tiered] Query: "${query}" | Best: "${bestMatch}" | Score: ${bestScore.toFixed(3)}`);

        // Tier 2a: High confidence fuzzy
        if (bestScore >= 0.8) {
            return { match: bestMatch, confidence: 'high', score: bestScore };
        }

        // Tier 2b: Medium confidence fuzzy
        if (bestScore >= 0.55) {
            return { match: bestMatch, confidence: 'medium', score: bestScore };
        }

        // Tier 3: No match — return null (leave blank, highlight red)
        return null;
    }

    /**
     * Tokenizes, lowercases, removes punctuation, and expands abbreviations.
     */
    tokenizeAndExpand(text) {
        // 1. Clean and split
        const rawTokens = text.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '') // remove special chars
            .split(/\s+/)
            .filter(t => t.length > 0 && !this.stopWords.has(t));

        // 2. Expand synonyms
        const expandedTokens = [];
        for (const token of rawTokens) {
            if (this.synonyms[token]) {
                // If it's a known abbreviation, add its expansions
                expandedTokens.push(...this.synonyms[token]);
            } else {
                expandedTokens.push(token);
            }
        }

        return new Set(expandedTokens); // Use Set automatically handles uniqueness
    }

    /**
     * Blended similarity: Jaccard (0.5) + Containment (0.5).
     * Containment = max(intersection/sizeA, intersection/sizeB)
     * This fixes asymmetric matches like "CS" vs "Bachelor of Science in Computer Science".
     */
    calculateSimilarity(tokensA, tokensB) {
        if (tokensA.size === 0 || tokensB.size === 0) return 0;

        let intersection = 0;
        for (const token of tokensA) {
            if (tokensB.has(token)) {
                intersection++;
            }
        }

        const union = new Set([...tokensA, ...tokensB]).size;
        const jaccard = intersection / union;
        const containment = Math.max(
            intersection / tokensA.size,
            intersection / tokensB.size
        );

        return jaccard * 0.5 + containment * 0.5;
    }
}
