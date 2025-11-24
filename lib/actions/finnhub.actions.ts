"use server";

import { validateArticle, formatArticle, delay } from "@/lib/utils";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;

if (!FINNHUB_API_KEY) {
  throw new Error("NEXT_PUBLIC_FINNHUB_API_KEY is not defined");
}

async function fetchJSON(url: string, revalidateSeconds?: number) {
  const fetchOptions: RequestInit = revalidateSeconds
    ? { next: { revalidate: revalidateSeconds }, cache: "force-cache" }
    : { cache: "no-store" };

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
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
