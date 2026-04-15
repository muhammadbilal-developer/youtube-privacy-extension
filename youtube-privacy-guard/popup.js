const DEFAULT_SETTINGS = {
  enabled: true,
  blurThumbnails: true,
  blurTitles: false,
  blurPlayingVideo: true,
  blurShortsVideo: true,
  blurProfilePictures: false,
  blurSearchSuggestions: false,
  blurIntensityPercent: 75
};

const OPTION_KEYS = [
  "blurThumbnails",
  "blurPlayingVideo",
  "blurShortsVideo"
];

function getInput(id) {
  return document.getElementById(id);
}

function normalizePercent(value) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return 75;
  }
  return Math.min(100, Math.max(10, parsed));
}

function resolveIntensityPercent(settings) {
  if (typeof settings.blurIntensityPercent !== "undefined") {
    return normalizePercent(settings.blurIntensityPercent);
  }

  // Backward compatibility: older versions stored px value in blurIntensity (4..30).
  const legacyPx = Number(settings.blurIntensity);
  if (!Number.isNaN(legacyPx)) {
    const converted = Math.round((legacyPx / 12) * 100);
    return normalizePercent(converted);
  }
  return 75;
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

  const intensityRow = getInput("blurIntensityRow");
  if (intensityRow) {
    intensityRow.classList.toggle("disabled", !isEnabled);
  }
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
    const settings = await chrome.storage.sync.get({
      ...DEFAULT_SETTINGS,
      blurIntensity: 12
    });
    console.log("[YPG] Popup loaded settings:", settings);

    Object.keys(DEFAULT_SETTINGS).forEach((key) => {
      const input = getInput(key);
      if (!input) {
        return;
      }
      if (input.type === "checkbox") {
        input.checked = Boolean(settings[key]);
      } else {
        input.value = String(resolveIntensityPercent(settings));
      }
    });

    const blurIntensityValue = getInput("blurIntensityValue");
    const blurIntensityInput = getInput("blurIntensity");
    if (blurIntensityValue && blurIntensityInput) {
      const initialPercent = resolveIntensityPercent(settings);
      blurIntensityInput.value = String(initialPercent);
      blurIntensityValue.textContent = `${blurIntensityInput.value}%`;
      blurIntensityInput.addEventListener("input", async (event) => {
        const value = normalizePercent(event.target.value);
        blurIntensityValue.textContent = `${value}%`;
        await updateSetting("blurIntensityPercent", value);
      });

      if (typeof settings.blurIntensityPercent === "undefined") {
        await chrome.storage.sync.set({ blurIntensityPercent: initialPercent });
      }
    }

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

    const reviewButton = getInput("reviewButton");
    if (reviewButton) {
      reviewButton.addEventListener("click", () => {
        chrome.tabs.create({ url: "https://chrome.google.com/webstore/category/extensions" });
      });
    }
  } catch (error) {
    console.error("[YPG] Failed to initialize popup:", error);
  }
});
