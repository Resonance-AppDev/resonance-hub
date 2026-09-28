import { describe, expect, test } from "bun:test";
import {
  APP_REGISTRY,
  DATANEST_APP_URLS,
  DATANEST_PUBLIC_URL,
  ECOSYSTEM_REGISTRY,
} from "../../src/lib/app-registry";

describe("DataNest runtime wiring", () => {
  test("migrated RONSAS apps launch from DataNest", () => {
    expect(APP_REGISTRY.epublisher.url).toBe(DATANEST_APP_URLS.epublisher);
    expect(APP_REGISTRY.creative_studio.url).toBe(DATANEST_APP_URLS.creative_studio);
    expect(APP_REGISTRY.sync_vision.url).toBe(DATANEST_APP_URLS.sync_vision);
    expect(ECOSYSTEM_REGISTRY.career_compass.url).toBe(DATANEST_APP_URLS.career_compass);
  });

  test("legacy spoke origins remain explicit fallbacks, not canonical launch URLs", () => {
    expect(APP_REGISTRY.epublisher.fallbackUrl).toBe("https://epublisher.reson8.life");
    expect(APP_REGISTRY.creative_studio.fallbackUrl).toBe("https://creative.reson8.life");
    expect(APP_REGISTRY.sync_vision.fallbackUrl).toBe("https://sync.reson8.life");
    expect(APP_REGISTRY.epublisher.url).not.toBe(APP_REGISTRY.epublisher.fallbackUrl);
    expect(APP_REGISTRY.creative_studio.url).not.toBe(APP_REGISTRY.creative_studio.fallbackUrl);
    expect(APP_REGISTRY.sync_vision.url).not.toBe(APP_REGISTRY.sync_vision.fallbackUrl);
  });

  test("DataNest is registered as the governed RONSAS runtime", () => {
    expect(ECOSYSTEM_REGISTRY.datanest.url).toStartWith(DATANEST_PUBLIC_URL);
    expect(ECOSYSTEM_REGISTRY.lyricsync_studio.url).toBe(DATANEST_APP_URLS.lyricsync_studio);
    expect(ECOSYSTEM_REGISTRY.scene_song_spark.url).toBe(DATANEST_APP_URLS.scene_song_spark);
    expect(ECOSYSTEM_REGISTRY.sovereign_forge.url).toBe(DATANEST_APP_URLS.sovereign_forge);
  });

  test("YouTube Optimizer stays on its server runtime until its DataNest move", () => {
    expect(APP_REGISTRY.youtube_optimizer.url).toBe("https://youtube.reson8.life");
  });
});
