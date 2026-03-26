import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Prefer pooled URL for deploy stability, fallback to direct when needed.
    url: process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? '',
  },
});
