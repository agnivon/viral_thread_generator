import { defineApp } from "convex/server";
import workpool from "@convex-dev/workpool/convex.config";
import migrations from "@convex-dev/migrations/convex.config";

const app = defineApp();

app.use(workpool, { name: "generationPool" });
app.use(workpool, { name: "publicationPool" });
app.use(migrations);

export default app;
