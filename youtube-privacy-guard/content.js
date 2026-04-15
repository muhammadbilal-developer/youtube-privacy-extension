/* 
[YPG] Selector map (may need updating as YouTube changes DOM structure):
- blurThumbnails:
  yt-thumbnail-view-model
  yt-thumbnail-view-model img
  .ytThumbnailViewModelImage img
  .ytCoreImageHost
  ytd-thumbnail img
  ytd-thumbnail
  ytd-thumbnail yt-image img
  ytd-rich-item-renderer #thumbnail
  ytd-rich-grid-media ytd-thumbnail
  #thumbnail img
  a#thumbnail
  ytd-compact-video-renderer ytd-thumbnail
  ytd-video-renderer ytd-thumbnail
  a#thumbnail img
- blurTitles:
  #video-title
  yt-formatted-string#video-title
  ytd-rich-grid-media h3
  ytd-compact-video-renderer h3
  .ytd-rich-item-renderer #video-title
  .primary-info h2.title .ytAttributedStringHost
  .reel-player-header-channel-title .ytAttributedStringHost
  ytm-reel-player-item-renderer .primary-info .ytAttributedStringHost
- blurPlayingVideo:
  .html5-main-video
  video.html5-main-video
  #movie_player video
- blurShortsVideo:
  ytd-shorts video
  ytd-reel-video-renderer video
  #shorts-player video
- blurProfilePictures:
  #avatar img
  ytd-channel-renderer #avatar img
  yt-img-shadow#avatar img
  #owner #avatar img
- blurSearchSuggestions:
  ytd-search-suggestion-renderer .sbqs_c
  ytd-suggestion-unified-renderer
  .ytd-searchbox
*/

(function initYPG() {
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

  const SELECTOR_MAP = {
    blurThumbnails: {
      selectors: [
        "yt-thumbnail-view-model",
        "yt-thumbnail-view-model img",
        ".ytThumbnailViewModelImage img",
        ".ytCoreImageHost",
        "ytd-thumbnail img",
        "ytd-thumbnail",
        "ytd-thumbnail yt-image img",
        "ytd-rich-item-renderer #thumbnail",
        "ytd-rich-grid-media ytd-thumbnail",
        "#thumbnail img",
        "a#thumbnail",
        "ytd-compact-video-renderer ytd-thumbnail",
        "ytd-video-renderer ytd-thumbnail",
        "a#thumbnail img",
        "ytd-grid-video-renderer #thumbnail img",
        "ytd-rich-grid-renderer #thumbnail img",
        "ytd-item-section-renderer ytd-video-renderer #thumbnail img",
        "ytd-watch-next-secondary-results-renderer #thumbnail img"
      ],
      className: "ypg-blur-thumbnail"
    },
    blurTitles: {
      selectors: [
        "#video-title",
        "yt-formatted-string#video-title",
        "ytd-rich-grid-media h3",
        "ytd-compact-video-renderer h3",
        ".ytd-rich-item-renderer #video-title",
        ".primary-info h2.title .ytAttributedStringHost",
        ".reel-player-header-channel-title .ytAttributedStringHost",
        "ytm-reel-player-item-renderer .primary-info .ytAttributedStringHost"
      ],
      className: "ypg-blur-title"
    },
    blurPlayingVideo: {
      selectors: [".html5-main-video", "video.html5-main-video", "#movie_player video"],
      className: "ypg-blur-video"
    },
    blurShortsVideo: {
      selectors: ["ytd-shorts video", "ytd-reel-video-renderer video", "#shorts-player video"],
      className: "ypg-blur-video"
    },
    blurProfilePictures: {
      selectors: [
        "#avatar img",
        "ytd-channel-renderer #avatar img",
        "yt-img-shadow#avatar img",
        "#owner #avatar img"
      ],
      className: "ypg-blur-profile"
    },
    blurSearchSuggestions: {
      selectors: [
        "ytd-search-suggestion-renderer .sbqs_c",
        "ytd-suggestion-unified-renderer",
        ".ytd-searchbox"
      ],
      className: "ypg-blur-search"
    }
  };

  let applyTimeoutId = null;
  let revealVideoTemporarily = false;
  let isExtensionContextAlive = true;

  function isContextInvalidatedError(error) {
    const message = String(error?.message || error || "");
    return message.includes("Extension context invalidated");
  }

  function hasRuntimeAccess() {
    try {
      return Boolean(isExtensionContextAlive && chrome?.runtime?.id && chrome?.storage?.sync);
    } catch (_) {
      return false;
    }
  }

  function markContextInvalidated(error) {
    if (!isContextInvalidatedError(error)) {
      return false;
    }

    isExtensionContextAlive = false;
    if (applyTimeoutId) {
      clearTimeout(applyTimeoutId);
      applyTimeoutId = null;
    }
    console.warn("[YPG] Extension context invalidated. Stopping blur updates.");
    return true;
  }

  function ensureInitialGuardStyle() {
    if (document.getElementById("ypg-initial-guard-style")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "ypg-initial-guard-style";
    style.textContent = `
      /* Temporary guard to reduce first-load thumbnail flash */
      yt-thumbnail-view-model img,
      .ytThumbnailViewModelImage img,
      ytd-thumbnail img,
      #thumbnail img,
      a#thumbnail img {
        filter: blur(var(--ypg-thumb-blur, 12px)) !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function removeInitialGuardStyle() {
    const style = document.getElementById("ypg-initial-guard-style");
    if (style) {
      style.remove();
    }
  }

  function syncRootStateClasses(settings) {
    const root = document.documentElement;
    if (!root) {
      return;
    }

    const thumbnailsEnabled = Boolean(settings.enabled && settings.blurThumbnails);
    root.classList.toggle("ypg-thumb-blur-enabled", thumbnailsEnabled);
  }

  function normalizeIntensityPercent(value) {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return 75;
    }
    return Math.min(100, Math.max(10, parsed));
  }

  function resolveIntensityPercent(settings) {
    if (typeof settings.blurIntensityPercent !== "undefined") {
      return normalizeIntensityPercent(settings.blurIntensityPercent);
    }

    // Backward compatibility: older versions used blurIntensity px for thumbnails.
    const legacyPx = Number(settings.blurIntensity);
    if (!Number.isNaN(legacyPx)) {
      const convertedPercent = Math.round((legacyPx / 12) * 100);
      return normalizeIntensityPercent(convertedPercent);
    }

    return 75;
  }

  function setBlurVariables(percent) {
    const scale = percent / 100;
    const extremeBoost = percent === 100 ? 3 : 1;
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty("--ypg-thumb-blur", `${(12 * scale * extremeBoost).toFixed(2)}px`);
    rootStyle.setProperty("--ypg-title-blur", `${(6 * scale * extremeBoost).toFixed(2)}px`);
    rootStyle.setProperty("--ypg-video-blur", `${(20 * scale * extremeBoost).toFixed(2)}px`);
    rootStyle.setProperty("--ypg-profile-blur", `${(4 * scale * extremeBoost).toFixed(2)}px`);
    rootStyle.setProperty("--ypg-search-blur", `${(5 * scale * extremeBoost).toFixed(2)}px`);
  }

  function collectUniqueElements(selectors) {
    const elements = new Set();
    selectors.forEach((selector) => {
      try {
        document.querySelectorAll(selector).forEach((element) => elements.add(element));
      } catch (error) {
        console.warn("[YPG] Invalid selector skipped:", selector, error);
      }
    });
    return elements;
  }

  function updateClassBySetting(settingKey, settings) {
    const config = SELECTOR_MAP[settingKey];
    if (!config) {
      return;
    }

    const shouldBlur = Boolean(settings[settingKey]);
    const elements = collectUniqueElements(config.selectors);
    elements.forEach((element) => {
      element.classList.toggle(config.className, shouldBlur);
    });

    if (settingKey === "blurThumbnails") {
      const nestedThumbnailMedia = new Set();
      elements.forEach((element) => {
        element
          .querySelectorAll("img, yt-image, ytd-thumbnail")
          .forEach((nestedEl) => nestedThumbnailMedia.add(nestedEl));
      });

      nestedThumbnailMedia.forEach((element) => {
        element.classList.toggle(config.className, shouldBlur);
      });

      console.log("[YPG] Thumbnail blur targets updated:", {
        roots: elements.size,
        nested: nestedThumbnailMedia.size
      });
    }
  }

  function removeAllBlurClasses() {
    Object.values(SELECTOR_MAP).forEach((config) => {
      document.querySelectorAll(`.${config.className}`).forEach((element) => {
        element.classList.remove(config.className);
      });
    });
  }

  function getVideoElement() {
    const videoSelectors = SELECTOR_MAP.blurPlayingVideo.selectors;
    for (const selector of videoSelectors) {
      const video = document.querySelector(selector);
      if (video) {
        return video;
      }
    }
    return null;
  }

  function getMoviePlayer() {
    return document.querySelector("#movie_player");
  }

  function updateRevealButtonText() {
    const button = document.getElementById("ypg-reveal-btn");
    if (!button) {
      return;
    }
    button.textContent = revealVideoTemporarily ? "🙈 Hide Video" : "👁 Reveal Video";
  }

  function syncVideoBlurState(settings) {
    const video = getVideoElement();
    const shouldBlurVideo = settings.enabled && settings.blurPlayingVideo && !revealVideoTemporarily;
    if (video) {
      video.classList.toggle("ypg-blur-video", shouldBlurVideo);
    }
    updateRevealButtonText();
  }

  function ensureRevealButton(settings) {
    const existing = document.getElementById("ypg-reveal-btn");
    const moviePlayer = getMoviePlayer();

    if (!settings.enabled || !settings.blurPlayingVideo || !moviePlayer) {
      if (existing) {
        existing.remove();
      }
      return;
    }

    if (window.getComputedStyle(moviePlayer).position === "static") {
      moviePlayer.style.position = "relative";
    }

    if (existing) {
      updateRevealButtonText();
      return;
    }

    const button = document.createElement("button");
    button.id = "ypg-reveal-btn";
    button.type = "button";
    button.textContent = "👁 Reveal Video";
    button.addEventListener("click", () => {
      revealVideoTemporarily = !revealVideoTemporarily;
      console.log("[YPG] Reveal toggle clicked:", revealVideoTemporarily);
      syncVideoBlurState(settings);
    });
    moviePlayer.appendChild(button);
    console.log("[YPG] Reveal button injected.");
  }

  async function applyBlur() {
    if (!hasRuntimeAccess()) {
      return;
    }

    try {
      const settings = await chrome.storage.sync.get({
        ...DEFAULT_SETTINGS,
        blurIntensity: 12
      });
      console.log("[YPG] Applying blur with settings:", settings);
      const intensityPercent = resolveIntensityPercent(settings);
      setBlurVariables(intensityPercent);

      if (!settings.enabled) {
        syncRootStateClasses(settings);
        removeAllBlurClasses();
        const existingButton = document.getElementById("ypg-reveal-btn");
        if (existingButton) {
          existingButton.remove();
        }
        return;
      }

      syncRootStateClasses(settings);
      updateClassBySetting("blurThumbnails", settings);
      updateClassBySetting("blurTitles", settings);
      updateClassBySetting("blurProfilePictures", settings);
      updateClassBySetting("blurSearchSuggestions", settings);
      updateClassBySetting("blurShortsVideo", settings);

      if (!settings.blurPlayingVideo) {
        revealVideoTemporarily = false;
      }

      updateClassBySetting("blurPlayingVideo", settings);
      ensureRevealButton(settings);
      syncVideoBlurState(settings);
    } catch (error) {
      if (!markContextInvalidated(error)) {
        console.error("[YPG] Failed to apply blur:", error);
      }
    } finally {
      removeInitialGuardStyle();
    }
  }

  function scheduleApplyBlur(immediate = false) {
    if (!hasRuntimeAccess()) {
      return;
    }

    if (immediate) {
      if (applyTimeoutId) {
        clearTimeout(applyTimeoutId);
      }
      requestAnimationFrame(() => {
        applyBlur();
      });
      return;
    }

    if (applyTimeoutId) {
      clearTimeout(applyTimeoutId);
    }
    applyTimeoutId = setTimeout(() => {
      requestAnimationFrame(() => {
        applyBlur();
      });
    }, 100);
  }

  const bodyObserver = new MutationObserver(() => {
    scheduleApplyBlur();
  });

  function observeBody() {
    if (!document.body) {
      return;
    }
    bodyObserver.observe(document.body, { childList: true, subtree: true });
    console.log("[YPG] Body observer attached.");
  }

  const playerObserver = new MutationObserver(() => {
    scheduleApplyBlur();
  });

  function observeMoviePlayer() {
    const moviePlayer = getMoviePlayer();
    if (!moviePlayer) {
      return;
    }
    playerObserver.disconnect();
    playerObserver.observe(moviePlayer, { childList: true, subtree: true, attributes: true });
    console.log("[YPG] Player observer attached.");
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.action === "settingsUpdated") {
      console.log("[YPG] settingsUpdated message received.");
      scheduleApplyBlur();
    }
  });

  window.addEventListener("yt-navigate-finish", () => {
    console.log("[YPG] yt-navigate-finish fired.");
    revealVideoTemporarily = false;
    observeMoviePlayer();
    scheduleApplyBlur(true);
  });

  ensureInitialGuardStyle();
  observeBody();
  observeMoviePlayer();
  scheduleApplyBlur(true);
})();
