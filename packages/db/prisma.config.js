import { defineConfig } from "prisma/config";
export default defineConfig({
    schema: "./src/schema",
    datasource: {
        url: process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? "",
    },
});
