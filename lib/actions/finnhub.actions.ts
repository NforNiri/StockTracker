"use server";

import { cache } from "react";
import { validateArticle, formatArticle, delay } from "@/lib/utils";
import { POPULAR_STOCK_SYMBOLS } from "@/lib/constants";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

if (!FINNHUB_API_KEY) {
  throw new Error("FINNHUB_API_KEY is not defined");
}

// ... imports ...

// Debugging flag
const DEBUG_SEARCH = process.env.DEBUG_SEARCH === 'true';

async function fetchJSON(url: string, revalidateSeconds?: number) {
  const fetchOptions: RequestInit = revalidateSeconds
    ? { next: { revalidate: revalidateSeconds }, cache: "force-cache" }
    : { cache: "no-store" };

  if (DEBUG_SEARCH) console.log(`[fetchJSON] Requesting: ${url}`);
  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    if (DEBUG_SEARCH) console.error(`[fetchJSON] Error ${response.status}: ${response.statusText}`);
    throw new Error(
      `Failed to fetch from Finnhub: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

export const getNews = async (
  symbols?: string[]
): Promise<MarketNewsArticle[]> => {
  try {
    const today = new Date();
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(today.getDate() - 5);

    const from = fiveDaysAgo.toISOString().split("T")[0];
    const to = today.toISOString().split("T")[0];

    const newsArticles: MarketNewsArticle[] = [];

    if (symbols && symbols.length > 0) {
      const cleanSymbols = symbols.map((s) => s.trim().toUpperCase());
      const maxArticles = 6;
      let articlesFound = 0;
      let rounds = 0;
      const maxRounds = 6; // Safety break to prevent infinite loops if no news found

      // We want to round-robin through symbols until we have 6 articles or we've tried enough
      // Strategy: iterate through symbols, fetch news for each, pick 1 latest valid article not already added
      // This is slightly complex to do purely round-robin with fetch per symbol efficiently.
      // Better approach: Fetch news for ALL symbols (parallel), then round-robin pick from the results.

      const symbolNewsPromises = cleanSymbols.map(async (symbol) => {
        const url = `${FINNHUB_BASE_URL}/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
        try {
          const data = await fetchJSON(url, 3600); // Cache for 1 hour
          return { symbol, articles: Array.isArray(data) ? data : [] };
        } catch (e) {
          console.error(`Error fetching news for ${symbol}:`, e);
          return { symbol, articles: [] };
        }
      });

      const allNewsResults = await Promise.all(symbolNewsPromises);

      // Round robin selection
      // Map symbol -> array of valid raw articles (sorted by date desc)
      const newsMap = new Map<string, RawNewsArticle[]>();

      allNewsResults.forEach(({ symbol, articles }) => {
        const validArticles = articles.filter((a: any) => validateArticle(a));
        // Sort descending by datetime
        validArticles.sort(
          (a: any, b: any) => (b.datetime || 0) - (a.datetime || 0)
        );
        newsMap.set(symbol, validArticles);
      });

      let symbolIndex = 0;
      const seenUrls = new Set<string>();

      // We iterate up to maxArticles times, cycling through symbols
      // Each time we pick the top available article for that symbol
      while (
        newsArticles.length < maxArticles &&
        rounds < maxRounds * cleanSymbols.length
      ) {
        const symbol = cleanSymbols[symbolIndex % cleanSymbols.length];
        const articles = newsMap.get(symbol);

        if (articles && articles.length > 0) {
          // Find first article not seen
          const article = articles.find((a) => !seenUrls.has(a.url!));

          if (article) {
            seenUrls.add(article.url!);
            // Remove used article from the list so we pick the next one next time
            const idx = articles.indexOf(article);
            if (idx > -1) articles.splice(idx, 1);

            newsArticles.push(formatArticle(article, true, symbol));
          }
        }

        symbolIndex++;
        rounds++;
      }
    }

    // Fallback to general news if no symbols or no company news found
    if (newsArticles.length === 0) {
      const url = `${FINNHUB_BASE_URL}/news?category=general&token=${FINNHUB_API_KEY}`;
      const data = await fetchJSON(url, 3600); // Cache for 1 hour

      if (Array.isArray(data)) {
        const uniqueArticles = new Map<string, RawNewsArticle>();

        for (const item of data) {
          if (!validateArticle(item)) continue;
          // Deduplicate by URL (or headline if URL missing, but validateArticle checks URL)
          if (!uniqueArticles.has(item.url!)) {
            uniqueArticles.set(item.url!, item);
          }
        }

        const sortedGeneral = Array.from(uniqueArticles.values())
          .sort((a, b) => (b.datetime || 0) - (a.datetime || 0))
          .slice(0, 6); // Take top 6

        sortedGeneral.forEach((article, index) => {
          newsArticles.push(formatArticle(article, false, undefined, index));
        });
      }
    }

    // Final sort by date
    return newsArticles.sort((a, b) => b.datetime - a.datetime);
  } catch (error) {
    console.error("Failed to fetch news:", error);
    throw new Error("Failed to fetch news");
  }
};

export const searchStocks = cache(async (query?: string) => {
  try {
    let results: (FinnhubSearchResult & { exchange?: string })[] = [];

    if (!query) {
      const symbols = POPULAR_STOCK_SYMBOLS.slice(0, 5);
      const profileResults: (FinnhubSearchResult & { exchange?: string })[] = [];
      
      for (const symbol of symbols) {
        try {
          const url = `${FINNHUB_BASE_URL}/stock/profile2?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
          await delay(200); 
          const profile = await fetchJSON(url, 0); 
          
          if (profile && profile.ticker) {
            profileResults.push({
              symbol: profile.ticker,
              description: profile.name,
              displaySymbol: profile.ticker,
              type: "Common Stock",
              exchange: profile.exchange || "US",
            });
          } else {
             if (DEBUG_SEARCH) console.warn(`[searchStocks] Empty profile for ${symbol}`, profile);
          }
        } catch (e) {
          console.error(`Error fetching profile for ${symbol}:`, e);
        }
      }

      results = profileResults;
      
      // FALLBACK MOCK DATA IF API FAILS completely (for debugging)
      if (results.length === 0) {
          console.warn("[searchStocks] No results found from API, using fallback data for debugging.");
          results = [
              { symbol: "AAPL", description: "Apple Inc (Fallback)", displaySymbol: "AAPL", type: "Common Stock", exchange: "NASDAQ" },
              { symbol: "MSFT", description: "Microsoft Corp (Fallback)", displaySymbol: "MSFT", type: "Common Stock", exchange: "NASDAQ" }
          ];
      }
      
    } else {
      const trimmedQuery = query.trim();
      const url = `${FINNHUB_BASE_URL}/search?q=${encodeURIComponent(
        trimmedQuery
      )}&token=${FINNHUB_API_KEY}`;
      const data: FinnhubSearchResponse = await fetchJSON(url, 1800);
      if (data && data.result) {
        results = data.result;
      }
    }

    const mapped: StockWithWatchlistStatus[] = results
      .map((item) => {
        return {
          symbol: (item.symbol || "").toUpperCase(),
          name: item.description || "",
          exchange: item.exchange || item.displaySymbol || "US",
          type: item.type || "Stock",
          isInWatchlist: false,
        };
      })
      .slice(0, 15);

    return mapped;
  } catch (error) {
    console.error("Error in stock search:", error);
    return [];
  }
});
