import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      COMMUNITY_ID: "00000000-0000-0000-0000-000000000000",
    },
  },
});
