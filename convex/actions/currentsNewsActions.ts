"use node";

import googleTrends from '@alkalisummer/google-trends-js';
import { getAuthUserId } from "@convex-dev/auth/server";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { v } from "convex/values";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { action, internalAction } from "../_generated/server";
import { googleGemini3FlashPreviewT00Key1, googleGemini3FlashPreviewT00Key2 } from "../lib/agents/models";
import { NEWS_SCORER_PROMPT } from "../lib/agents/news/prompts";
import { SearchQueryOptimizerNode } from "../lib/agents/nodes";
import { CurrentsAPI } from "../lib/currents_news/api";
import { db } from "../lib/firebase";

export const fetchAndStoreLatestNews = internalAction({
  args: {},
  handler: async () => {
    const apiKey = process.env.CURRENTS_API_KEY;
    if (!apiKey) {
      throw new Error("CURRENTS_API_KEY environment variable not set");
    }

    const currentsApi = new CurrentsAPI({ apiKey });

    // 1. Fetch Trending Keywords from Google Trends
    // We only fetch from the US region as per the requirements.
    let allTrends: any[] = [];

    try {
      // Fetch daily trends for the US. The GoogleTrendsApi returns data that includes
      // crucial metrics like 'traffic' (search volume) and 'activeTime' (started time).
      const usResponse = await googleTrends.dailyTrends({ geo: 'US' });

      if (usResponse.data) {
        allTrends.push(...usResponse.data);
      }
    } catch (error) {
      console.error("Error fetching Google Trends:", error);
    }

    // ==========================================
    // KEYWORD DEDUPLICATION & SORTING LOGIC
    // ==========================================
    // 1. Deduplication: We use a Map to ensure each keyword only appears once.
    // If we encounter a duplicate keyword, we keep the one with the highest search volume (traffic).
    const uniqueTrendsMap = new Map();
    for (const t of allTrends) {
      const keyword = String(t.keyword).toLowerCase().trim();
      if (!uniqueTrendsMap.has(keyword)) {
        uniqueTrendsMap.set(keyword, t);
      } else {
        const existing = uniqueTrendsMap.get(keyword);
        if ((t.traffic || 0) > (existing.traffic || 0)) {
          uniqueTrendsMap.set(keyword, t);
        }
      }
    }

    // 2. Sorting: We sort the deduplicated keywords to prioritize virality and recency.
    const combinedTrends = Array.from(uniqueTrendsMap.values()).sort((a, b) => {
      const aTraffic = a.traffic || 0;
      const bTraffic = b.traffic || 0;

      // PRIMARY SORT: Search Volume (traffic)
      // We want the most viral keywords first, so we sort descending by traffic.
      if (bTraffic !== aTraffic) {
        return bTraffic - aTraffic;
      }

      // SECONDARY SORT: Started Time (activeTime)
      // If two keywords have the exact same search volume, we break the tie 
      // by placing the most chronologically relevant (recent) keyword first.
      const aTime = a.activeTime ? new Date(a.activeTime).getTime() : 0;
      const bTime = b.activeTime ? new Date(b.activeTime).getTime() : 0;
      return bTime - aTime;
    }).slice(0, 10); // Limit to the absolute top 10 most viral and recent keywords

    if (combinedTrends.length === 0) {
      console.log("No trending keywords found.");
      return;
    }

    console.log("Fetching news for trending keywords:", combinedTrends);

    let totalStored = 0;

    for (const trend of combinedTrends) {
      const keyword = String(trend.keyword).toLowerCase().trim();
      const slugifiedKeyword = keyword.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      // Use LLM to optimize the boolean query based on traffic metrics
      console.log(`Generating optimized query for ${keyword}...`);
      const { optimized_query } = await SearchQueryOptimizerNode({
        keyword: keyword,
        relatedKeywords: trend.relatedKeywords || [],
        traffic: trend.traffic || 0,
        trafficGrowthRate: trend.trafficGrowthRate || 0,
      });

      // Fallback to simple keyword if LLM fails
      // Currents API accepts space-separated boolean-like strings
      const searchQuery = optimized_query || keyword;
      console.log(`Optimized query for ${keyword}: ${searchQuery}`);

      let response;
      try {
        response = await currentsApi.search({
          language: "en",
          keywords: searchQuery,
          start_date: trend.activeTime.toISOString(),
          limit: 5,
        });
      } catch (error) {
        console.error(`Error fetching news for ${keyword}:`, error);
        continue;
      }

      console.log(`Currents API response status for ${keyword}:`, response.data.status);

      const articles = response.data.news || [];
      if (articles.length === 0) {
        console.log(`No news articles fetched for ${keyword}.`);
      }

      // We explicitly create/update a root document to mark this keyword as active
      const rootDocRef = db.collection("currents_latest_news").doc(slugifiedKeyword);
      await rootDocRef.set({
        keyword: keyword,
        slug: slugifiedKeyword,
        traffic: trend.traffic || 0,
        trafficGrowthRate: trend.trafficGrowthRate || 0,
        activeTime: trend.activeTime,
        relatedKeywords: trend.relatedKeywords || [],
        updated_at: FieldValue.serverTimestamp()
      }, { merge: true });

      const collectionRef = rootDocRef.collection("articles");

      if (articles.length === 0) {
        continue;
      }

      const docRefs = articles.map(article => {
        const safeId = String(article.id).replace(/\//g, '_');
        return collectionRef.doc(safeId);
      });

      let existingDocs;
      try {
        existingDocs = await db.getAll(...docRefs);
      } catch (error: any) {
        console.error(`Firestore db.getAll Error details for ${keyword}:`, error.message);
        throw error;
      }

      const newArticles = articles.filter((_, index) => !existingDocs[index].exists);

      if (newArticles.length === 0) {
        console.log(`No new articles to store for ${keyword}.`);
        continue;
      }

      const batch = db.batch();

      for (const article of newArticles) {
        const safeId = String(article.id).replace(/\//g, '_');
        const docRef = collectionRef.doc(safeId);

        let publishedTimestamp: FieldValue | Timestamp = FieldValue.serverTimestamp();
        if (article.published) {
          try {
            const date = new Date(article.published);
            if (!isNaN(date.getTime())) {
              publishedTimestamp = Timestamp.fromDate(date);
            }
          } catch (_e) {
            // fallback
          }
        }

        const data = {
          ...article,
          published_at: publishedTimestamp,
          created_at: FieldValue.serverTimestamp(),
          updated_at: FieldValue.serverTimestamp(),
        };

        batch.set(docRef, data);
      }

      await batch.commit();
      console.log(`Successfully stored ${newArticles.length} new news articles in Firestore for ${keyword}.`);
      totalStored += newArticles.length;
    }

    console.log(`Successfully stored a total of ${totalStored} new news articles across all trending keywords.`);
  },
});

export const deleteOldNewsArticles = internalAction({
  args: {},
  handler: async () => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 5);

    let totalDeleted = 0;

    const rootDocs = await db.collection("currents_latest_news").listDocuments();

    for (const rootDoc of rootDocs) {
      const keywordSlug = rootDoc.id;
      console.log(`Deleting old news articles for keyword: ${keywordSlug}`);

      const collectionRef = rootDoc.collection("articles");
      const snapshot = await collectionRef.where("published_at", "<", cutoffDate).get();

      if (snapshot.empty) {
        console.log(`No old news articles found to delete for ${keywordSlug}.`);
        continue;
      }

      let deletedCount = 0;
      const batches = [];
      let currentBatch = db.batch();
      let currentBatchSize = 0;

      for (const doc of snapshot.docs) {
        currentBatch.delete(doc.ref);
        currentBatchSize++;

        if (currentBatchSize === 500) {
          batches.push(currentBatch.commit());
          currentBatch = db.batch();
          currentBatchSize = 0;
        }

        deletedCount++;
      }

      if (currentBatchSize > 0) {
        batches.push(currentBatch.commit());
      }

      await Promise.all(batches);
      console.log(`Successfully deleted ${deletedCount} old news articles from Firestore for ${keywordSlug}.`);
      totalDeleted += deletedCount;
    }

    console.log(`Successfully deleted a total of ${totalDeleted} old news articles across all keywords.`);
  },
});

export const getAvailableKeywords = action({
  args: {
    limitNum: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const limit = args.limitNum ?? 15;
    const snapshot = await db.collection("currents_latest_news")
      .orderBy("updated_at", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      keyword: doc.data().keyword || doc.id,
    }));
  }
});

export const getLatestNewsFromFirestore = action({
  args: {
    keyword: v.string(),
    cursor: v.optional(v.string()),
    numItems: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const limitNum = args.numItems ?? 50;
    const collectionRef = db.collection("currents_latest_news").doc(args.keyword).collection("articles");

    let firestoreQuery = collectionRef.orderBy("published_at", "desc").limit(limitNum);

    if (args.cursor) {
      const cursorDoc = await collectionRef.doc(args.cursor).get();
      if (cursorDoc.exists) {
        firestoreQuery = firestoreQuery.startAfter(cursorDoc);
      }
    }

    let docs;
    try {
      const snapshot = await firestoreQuery.get();
      docs = snapshot.docs;
    } catch (e) {
      console.warn(`Failed to sort by published_at from Firestore for ${args.keyword}, falling back to unsorted fetch and in-memory sort`, e);
      let fallbackQuery = collectionRef.limit(limitNum);
      if (args.cursor) {
        const cursorDoc = await collectionRef.doc(args.cursor).get();
        if (cursorDoc.exists) {
          fallbackQuery = fallbackQuery.startAfter(cursorDoc);
        }
      }
      const snapshot = await fallbackQuery.get();
      docs = snapshot.docs;
    }

    const articles = docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || "",
        description: data.description || "",
        url: data.url || "",
        category: data.category || [],
        published: data.published || "",
        published_at: data.published_at instanceof Timestamp ? data.published_at.toDate().getTime() : 0,
        virality_score: data.virality_score !== undefined ? data.virality_score : undefined,
        overall_critique: data.overall_critique || undefined,
        hook_potential_analysis: data.hook_potential_analysis || undefined,
      };
    });

    const isDone = docs.length < limitNum;
    const continueCursor = docs.length > 0 ? docs[docs.length - 1].id : null;

    return {
      page: articles,
      isDone,
      continueCursor: isDone ? "" : continueCursor,
    };
  },
});

export const updateNewsArticle = action({
  args: {
    keyword: v.string(),
    id: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    url: v.optional(v.string()),
    category: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const { keyword, id, ...updates } = args;

    if (Object.keys(updates).length === 0) {
      return { success: false, message: "No fields provided to update" };
    }

    const docRef = db.collection("currents_latest_news").doc(keyword).collection("articles").doc(id);

    try {
      await docRef.update({
        ...updates,
        updated_at: FieldValue.serverTimestamp()
      });
      return { success: true };
    } catch (error: any) {
      if (error.code === 5) { // 5 corresponds to NOT_FOUND in gRPC/Firestore
        throw new Error(`Article with id ${id} not found in Firestore for keyword ${keyword}`);
      }
      throw error;
    }
  }
});

export const evaluateNewsArticle = action({
  args: { keyword: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const docRef = db.collection("currents_latest_news").doc(args.keyword).collection("articles").doc(args.id);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      throw new Error(`Article with id ${args.id} not found in Firestore for keyword ${args.keyword}`);
    }

    const article = snapshot.data();
    if (!article) {
      throw new Error(`Article data is empty`);
    }

    const humanPrompt = `Title: ${article.title}\nDescription: ${article.description}`;

    const viralityScoreSchema = z.object({
      virality_score: z.number(),
      overall_critique: z.string(),
      hook_potential_analysis: z.string(),
    });

    const primaryStructured = googleGemini3FlashPreviewT00Key1.withStructuredOutput(viralityScoreSchema);
    const backupStructured = googleGemini3FlashPreviewT00Key2.withStructuredOutput(viralityScoreSchema);
    const structuredLlm = primaryStructured.withFallbacks({ fallbacks: [backupStructured] });

    const parsedResult = await structuredLlm.invoke([
      new SystemMessage(NEWS_SCORER_PROMPT),
      new HumanMessage(humanPrompt)
    ]);

    await docRef.update({
      virality_score: parsedResult.virality_score,
      overall_critique: parsedResult.overall_critique,
      hook_potential_analysis: parsedResult.hook_potential_analysis,
      updated_at: FieldValue.serverTimestamp()
    });

    const updatedDoc = await docRef.get();
    const updatedData = updatedDoc.data();

    return {
      id: updatedDoc.id,
      ...updatedData,
      published_at: updatedData?.published_at instanceof Timestamp ? updatedData.published_at.toDate().getTime() : 0,
      created_at: updatedData?.created_at instanceof Timestamp ? updatedData.created_at.toDate().getTime() : 0,
      updated_at: updatedData?.updated_at instanceof Timestamp ? updatedData.updated_at.toDate().getTime() : 0,
    };
  }
});
