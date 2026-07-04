import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// SSG routes: read prerendered cache from Workers Static Assets instead of the
// default "dummy" store, which breaks ISR/revalidation on navigation.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
