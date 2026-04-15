const DEFAULT_SETTINGS = {
  enabled: true,
  blurThumbnails: true,
  blurTitles: false,
  blurPlayingVideo: true,
  blurShortsVideo: true,
  blurProfilePictures: false,
  blurSearchSuggestions: false
};

const OPTION_KEYS = [
  "blurThumbnails",
  "blurTitles",
  "blurPlayingVideo",
  "blurShortsVideo",
  "blurProfilePictures",
  "blurSearchSuggestions"
];

function getInput(id) {
  return document.getElementById(id);
}

function setRowsEnabled(isEnabled) {
  OPTION_KEYS.forEach((key) => {
    const input = getInput(key);
    if (!input) {
      return;
    }

    const row = input.closest(".option-row");
    if (!row) {
      return;
    }
    row.classList.toggle("disabled", !isEnabled);
  });
}

async function notifyActiveYouTubeTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    if (!activeTab?.id || !activeTab.url || !activeTab.url.includes("youtube.com")) {
      return;
    }
    await chrome.tabs.sendMessage(activeTab.id, { action: "settingsUpdated" });
    console.log("[YPG] Sent settingsUpdated message.");
  } catch (error) {
    console.warn("[YPG] Unable to notify active tab:", error);
  }
}

async function updateSetting(key, value) {
  try {
    await chrome.storage.sync.set({ [key]: value });
    console.log("[YPG] Updated setting:", key, value);
    if (key === "enabled") {
      setRowsEnabled(value);
    }
    await notifyActiveYouTubeTab();
  } catch (error) {
    console.error("[YPG] Failed to update setting:", key, error);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    console.log("[YPG] Popup loaded settings:", settings);

    Object.keys(DEFAULT_SETTINGS).forEach((key) => {
      const input = getInput(key);
      if (!input) {
        return;
      }
      input.checked = Boolean(settings[key]);
    });

    setRowsEnabled(Boolean(settings.enabled));

    const enabledInput = getInput("enabled");
    if (enabledInput) {
      enabledInput.addEventListener("change", async (event) => {
        await updateSetting("enabled", event.target.checked);
      });
    }

    OPTION_KEYS.forEach((key) => {
      const input = getInput(key);
      if (!input) {
        return;
      }
      input.addEventListener("change", async (event) => {
        await updateSetting(key, event.target.checked);
      });
    });
  } catch (error) {
    console.error("[YPG] Failed to initialize popup:", error);
  }
});
