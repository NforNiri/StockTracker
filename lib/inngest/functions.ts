import { inngest } from "./client";
import {
  NEWS_SUMMARY_EMAIL_PROMPT,
  PERSONALIZED_WELCOME_EMAIL_PROMPT,
} from "@/lib/inngest/prompt";
import { sendDailyNewsSummary, sendWelcomeEmail } from "../nodemailer";
import { getAllUsersForNewsEmail } from "../actions/user.actions";
import { getWatchlistSymbolsByEmail } from "../actions/watchlist.actions";
import { getNews } from "../actions/finnhub.actions";
import { formatDateToday } from "../utils";

type UserForNewsEmail = {
  id: string;
  email: string;
  name: string;
};

export const sendSignUpEmail = inngest.createFunction(
  { id: "send-sign-up-email" },
  { event: "app/user.created" },
  async ({ event, step }) => {
    const userProfile = `
        - Country: ${event.data.country}
        - Investment goals: ${event.data.investmentGoals}
        - Risk tolerance: ${event.data.riskTolerance}
        - Preferred industry: ${event.data.preferredIndustry}
        `;
    const prompt = PERSONALIZED_WELCOME_EMAIL_PROMPT.replace(
      "{{userProfile}}",
      userProfile
    );
    const response = await step.ai.infer("generate-welcome-intro", {
      model: step.ai.models.gemini({ model: "gemini-2.5-flash-lite" }),
      body: {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      },
    });
    await step.run("send-email", async () => {
      const part = response.candidates?.[0]?.content?.parts?.[0] as
        | { text: string }
        | undefined;
      const introText =
        (part && "text" in part ? part.text : null) ||
        "Thanks for joining our community!. You now have the tools to start your journey to financial freedom.";

      const {
        data: { email, name },
      } = event;
      return await sendWelcomeEmail({
        email,
        name,
        intro: introText,
      });
    });

    return {
      success: true,
      message: "Welcome email sent successfully",
    };
  }
);

export const sendDailyNewsSummaryFunction = inngest.createFunction(
  {
    id: "daily-news-summary",
  },
  [{ event: "app/send.daily.news" }, { cron: "0 12 * * *" }],
  async ({ step }) => {
    // step 1 : Get all users for mail delivery
    const users = await step.run("get-all-users", async () => {
      return await getAllUsersForNewsEmail();
    });

    if (!users || users.length === 0) {
      return {
        success: false,
        message: "No users found for news email",
      };
    }

    // Step #2: For each user, get watchlist symbols -> fetch news (fallback to general)
    const results = await step.run("fetch-user-news", async () => {
      const perUser: Array<{
        user: UserForNewsEmail;
        articles: MarketNewsArticle[];
      }> = [];
      for (const user of users as UserForNewsEmail[]) {
        try {
          const symbols = await getWatchlistSymbolsByEmail(user.email);
          let articles = await getNews(symbols);
          // Enforce max 6 articles per user
          articles = (articles || []).slice(0, 6);
          // If still empty, fallback to general
          if (!articles || articles.length === 0) {
            articles = await getNews();
            articles = (articles || []).slice(0, 6);
          }
          perUser.push({ user, articles });
        } catch (e) {
          console.error("daily-news: error preparing user news", user.email, e);
          perUser.push({ user, articles: [] });
        }
      }
      return perUser;
    });

    // Step 3
    //  Summarize news via ai for each user
    const userNewsSummaries: {
      user: UserForNewsEmail;
      NewsContent: string | null;
    }[] = [];

    for (const { user, articles } of results) {
      try {
        const prompt = NEWS_SUMMARY_EMAIL_PROMPT.replace(
          "{{newsData}}",
          JSON.stringify(articles, null, 2)
        );
        const response = await step.ai.infer(`summarize-news-${user.email}`, {
          model: step.ai.models.gemini({ model: "gemini-2.5-flash-lite" }),
          body: {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
          },
        });

        const part = response.candidates?.[0]?.content?.parts?.[0];
        const newsContent =
          (part && "text" in part ? part.text : null) ||
          "No market news available";
        userNewsSummaries.push({ user, NewsContent: newsContent });
      } catch (error) {
        console.error("daily-news: error summarizing news", user.email, error);
        userNewsSummaries.push({ user, NewsContent: null });
      }
    }

    // Step 4
    //  Send email to each user with the news summary
    await step.run("send-daily-news-emails", async () => {
      await Promise.all(
        userNewsSummaries.map(async ({ user, NewsContent }) => {
          if (!NewsContent) return;

          await sendDailyNewsSummary({
            email: user.email,
            date: formatDateToday,
            newsContent: NewsContent,
          });
        })
      );
    });

    return {
      success: true,
      message: "Daily news summary emails sent successfully",
      processed: results.length,
      details: results.map((r) => ({
        email: r.user.email,
        newsCount: r.articles.length,
      })),
    };
  }
);
