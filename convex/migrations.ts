import { Migrations } from "@convex-dev/migrations";
import { components } from "./_generated/api.js";
import { DataModel } from "./_generated/dataModel.js";

export const migrations = new Migrations<DataModel>(components.migrations);

export const fixAndRemoveTopLevelUrl = migrations.define({
  table: "threadDrafts",
  migrateOne: async (ctx, draft) => {
    const rawDraft = draft as Record<string, unknown>;
    const url = rawDraft.url as string | undefined;
    const topic = rawDraft.topic as string | undefined;
    const description = rawDraft.description as string | undefined;

    let input_field = draft.input_field;

    if (input_field === undefined) {
      if (draft.agent === "topic") {
        input_field = {
          agent: "topic" as const,
          topic: topic || url || "",
          description: description,
        };
      } else if (draft.agent === "social_media") {
        input_field = {
          agent: "social_media" as const,
          url: url || "",
        };
      } else {
        input_field = {
          agent: "news" as const,
          url: url || "",
        };
      }
    }

    // @ts-expect-error - we are deleting fields that no longer exist in the schema
    await ctx.db.patch("threadDrafts", draft._id, { input_field, url: undefined, topic: undefined, description: undefined });
  },
});
