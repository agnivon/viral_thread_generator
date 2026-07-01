"use node";

import { action, internalAction } from "../_generated/server";
import { CurrentsAPI } from "../lib/currents_news/api";
import { db } from "../lib/firebase";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAuthUserId } from "@convex-dev/auth/server";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { criticFallbackLlm2, criticFallbackLlm2Backup } from "../lib/agents/models";
import { VIRALITY_SCORER_NODE_PROMPT } from "../lib/agents/prompts";
import { z } from "zod";
import { v } from "convex/values";

const DOMAINS = ["reuters.com", "apnews.com", "bbc.com", "thewire.in", "thehindu.com"];

export const fetchAndStoreLatestNews = internalAction({
  args: {},
  handler: async () => {
    const apiKey = process.env.CURRENTS_API_KEY;
    if (!apiKey) {
      throw new Error("CURRENTS_API_KEY environment variable not set");
    }

    const currentsApi = new CurrentsAPI({ apiKey });
    
    let totalStored = 0;

    for (const domain of DOMAINS) {
      console.log(`Fetching latest news for domain: ${domain}`);
      // Fetch latest news
      const response = await currentsApi.latestNews({
        language: "en",
        page_size: 20,
        domain: domain,
      });
      console.log(`Currents API response status for ${domain}:`, response.data.status);

      const articles = response.data.news;
      if (!articles || articles.length === 0) {
        console.log(`No news articles fetched for ${domain}.`);
        continue;
      }

      const collectionRef = db.collection("currents_latest_news").doc(domain).collection("articles");
      console.log(`Mapping articles to docRefs for ${domain}...`);
      const docRefs = articles.map(article => {
        // Ensure article.id is a string without slashes
        const safeId = String(article.id).replace(/\//g, '_');
        return collectionRef.doc(safeId);
      });
      
      let existingDocs;
      try {
        console.log(`Calling db.getAll for ${docRefs.length} docs in ${domain}...`);
        existingDocs = await db.getAll(...docRefs);
        console.log(`Successfully fetched existing docs from Firestore for ${domain}.`);
      } catch (error: any) {
        console.error(`Firestore db.getAll Error details for ${domain}:`, error.message, error.code, error.details);
        throw error;
      }
      
      const newArticles = articles.filter((_, index) => !existingDocs[index].exists);

      if (newArticles.length === 0) {
        console.log(`No new articles to store for ${domain}.`);
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
      console.log(`Successfully stored ${newArticles.length} new news articles in Firestore for ${domain}.`);
      totalStored += newArticles.length;
    }
    
    console.log(`Successfully stored a total of ${totalStored} new news articles across all domains.`);
  },
});

export const deleteOldNewsArticles = internalAction({
  args: {},
  handler: async () => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 5);

    let totalDeleted = 0;

    for (const domain of DOMAINS) {
      console.log(`Deleting old news articles for domain: ${domain}`);
      const collectionRef = db.collection("currents_latest_news").doc(domain).collection("articles");
      const snapshot = await collectionRef.where("published_at", "<", cutoffDate).get();

      if (snapshot.empty) {
        console.log(`No old news articles found to delete for ${domain}.`);
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
      console.log(`Successfully deleted ${deletedCount} old news articles from Firestore for ${domain}.`);
      totalDeleted += deletedCount;
    }
    
    console.log(`Successfully deleted a total of ${totalDeleted} old news articles across all domains.`);
  },
});

export const getLatestNewsFromFirestore = action({
  args: {
    domain: v.string(),
    cursor: v.optional(v.string()),
    numItems: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const limitNum = args.numItems ?? 50;
    const collectionRef = db.collection("currents_latest_news").doc(args.domain).collection("articles");
    
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
      console.warn(`Failed to sort by published_at from Firestore for ${args.domain}, falling back to unsorted fetch and in-memory sort`, e);
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
    domain: v.string(),
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

    const { domain, id, ...updates } = args;

    if (Object.keys(updates).length === 0) {
      return { success: false, message: "No fields provided to update" };
    }

    const docRef = db.collection("currents_latest_news").doc(domain).collection("articles").doc(id);
    
    try {
      await docRef.update({
        ...updates,
        updated_at: FieldValue.serverTimestamp()
      });
      return { success: true };
    } catch (error: any) {
      if (error.code === 5) { // 5 corresponds to NOT_FOUND in gRPC/Firestore
        throw new Error(`Article with id ${id} not found in Firestore for domain ${domain}`);
      }
      throw error;
    }
  }
});

export const evaluateNewsArticle = action({
  args: { domain: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const docRef = db.collection("currents_latest_news").doc(args.domain).collection("articles").doc(args.id);
    const snapshot = await docRef.get();
    
    if (!snapshot.exists) {
      throw new Error(`Article with id ${args.id} not found in Firestore for domain ${args.domain}`);
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

    const primaryStructured = criticFallbackLlm2.withStructuredOutput(viralityScoreSchema);
    const backupStructured = criticFallbackLlm2Backup.withStructuredOutput(viralityScoreSchema);
    const structuredLlm = primaryStructured.withFallbacks({ fallbacks: [backupStructured] });
    
    const parsedResult = await structuredLlm.invoke([
      new SystemMessage(VIRALITY_SCORER_NODE_PROMPT),
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
