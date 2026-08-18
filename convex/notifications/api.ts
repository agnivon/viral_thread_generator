import { makeNotificationAPI } from "convex-notification/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { notifications } from "./client";

export const userNotifications = makeNotificationAPI(notifications, {
  resolveTargetId: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }
    return userId;
  },
});
