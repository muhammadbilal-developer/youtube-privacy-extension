const DEFAULT_SETTINGS = {
  enabled: true,
  blurThumbnails: true,
  blurTitles: false,
  blurPlayingVideo: true,
  blurShortsVideo: true,
  blurProfilePictures: false,
  blurSearchSuggestions: false
};

chrome.runtime.onInstalled.addListener(async (details) => {
  try {
    console.log("[YPG] onInstalled fired:", details.reason);
    const existing = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    const merged = { ...DEFAULT_SETTINGS, ...existing };
    await chrome.storage.sync.set(merged);
    console.log("[YPG] Default settings initialized.");
  } catch (error) {
    console.error("[YPG] Failed to initialize defaults:", error);
  }
});
