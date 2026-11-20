import { app, boss, prisma, REVIEW_QUEUE } from "./app.js";
import { env } from "./config.js";
await boss.start();
await boss.createQueue(REVIEW_QUEUE);
app.listen(env.PORT, () => console.log(`Skill Coach API listening on ${env.PORT}`));
const shutdown = async () => {
  await boss.stop();
  await prisma.$disconnect();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
