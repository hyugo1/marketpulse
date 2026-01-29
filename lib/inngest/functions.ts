// lib/inngest/functions.ts

import {inngest} from "@/lib/inngest/client";
import { PERSONALIZED_WELCOME_EMAIL_PROMPT } from "@/lib/inngest/prompts";
import { getAllUsersForNewsEmail, generateUnsubscribeToken } from "@/lib/actions/user.actions";
import { getWatchlistSymbolsByEmail } from "@/lib/actions/watchlist.actions";
import { getNews } from "@/lib/actions/finnhub.actions";
import { sendDailyNewsSummaryEmail, sendWelcomeEmail } from "@/lib/nodemailer";
import { getFormattedTodayDate } from "@/lib/utils";
import { getOrCreateNewsSection } from "./newsSections";
import { assembleNewsContent } from "./assembleNewsEmail";
import { callGeminiAPI } from "@/lib/inngest/gemini";


export const sendSignUpEmail = inngest.createFunction(
    { id: 'sign-up-email' },
    { event: 'app/user.created'},
    async ({ event, step }) => {
        const userProfile = `
            - Country: ${event.data.country}
            - Investment goals: ${event.data.investmentGoals}
            - Risk tolerance: ${event.data.riskTolerance}
            - Preferred industry: ${event.data.preferredIndustry}
        `

        const prompt = PERSONALIZED_WELCOME_EMAIL_PROMPT.replace('{{userProfile}}', userProfile)

        // Make direct API call instead of using step.ai.infer
        const introText = await step.run("generate-welcome-intro", async () => {
          try {
            return await callGeminiAPI(prompt);
          } catch (err) {
            console.error("Gemini failed:", err);
            return "Thanks for joining MarketPulse — we’re excited to help you get started.";
          }
        });

        await step.run('send-welcome-email', async () => {
            const { data: { email, name } } = event;
            const unsubscribeToken = generateUnsubscribeToken(email);
            return await sendWelcomeEmail({ email, name, intro: introText, unsubscribeToken });
        })

        return {
            success: true,
            message: 'Welcome email sent successfully'
        }
    }
  )

export const sendDailyNewsSummary = inngest.createFunction(
  { id: "marketpulse-daily-summary", retries: 5 },
  [{ cron: "0 13 * * *" }],
  async ({ step }) => {
    const users = await step.run("get-users", getAllUsersForNewsEmail);
    if (!users?.length) return;

    // Collect unique symbols
    const symbolSet = new Set<string>();
    const userSymbolsMap = new Map<string, string[]>();

    const userSymbolsList = await step.run("fetch-user-symbols", async () => {
        const results: Array<{ email: string; symbols: string[] }> = [];
        for (const user of users as User[]) {
        const symbols = await getWatchlistSymbolsByEmail(user.email);
        results.push({ email: user.email, symbols: symbols || [] });
        }
        return results;
    });

    for (const { email, symbols } of userSymbolsList) {
      userSymbolsMap.set(email, symbols);
      symbols.forEach((s) => symbolSet.add(s));
    }


    const sectionMap: Record<string, string> = {};

    for (const symbol of symbolSet) {
      const articles = await step.run(`fetch-news-${symbol}`, async () => {
        return (await getNews([symbol]))?.slice(0, 3) || [];
      });
      if (!articles.length) continue;

      sectionMap[symbol] = await getOrCreateNewsSection({
        sectionKey: symbol,
        articles,
        step,
      });
    }


    const generalArticles = await step.run("fetch-general-news", async () => {
      return (await getNews())?.slice(0, 3) || [];
    });
    const generalSection = await getOrCreateNewsSection({
      sectionKey: "general",
      articles: generalArticles,
      step,
    });

    // Send emails
    const date = getFormattedTodayDate();

    for (const user of users as User[]) {
      const symbols = userSymbolsMap.get(user.email) || [];

      const newsContent = assembleNewsContent({
        userSymbols: symbols,
        sectionMap,
        fallbackSection: generalSection,
      });

    await step.run(`send-email-${user.email}`, async () => {
    const unsubscribeToken = generateUnsubscribeToken(user.email);
    await sendDailyNewsSummaryEmail({
        email: user.email,
        date,
        newsContent,
        unsubscribeToken,
    });
      });
    }

    return { success: true };
  }
);