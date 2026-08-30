import { defineConfig } from "@prisma/internals";

export default defineConfig({
  orm: {
    dataProxy: {
      enabled: false,
    },
  },
});
