// ==UserScript==
// @name         Ultra YouTube AdBlock Bypasser v5.0
// @namespace    https://github.com/your-repo
// @version      5.0
// @description  Aggressively block and bypass YouTube ads & anti-adblock detection, future-proofed.
// @author       AdBlockBypass+ChatGPT
// @match        *://*.youtube.com/*
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function() {
  'use strict';

  const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  // === [1] More thorough override of ad detection flags ===
  function overrideAdFlags() {
    const paths = [
      'ytInitialPlayerResponse.adPlacements',
      'ytInitialPlayerResponse.playerAds',
      'ytInitialPlayerResponse.adSlots',
      'yt.config_.EXPERIMENT_FLAGS.ad_to_video_allow_gel',
      'ytplayer.config.args.raw_player_response.adPlacements',
      'ytplayer.config.args.ad_tag_url',
      'ytcfg.data_.EXPERIMENT_FLAGS.abuse_warning_enabled',
      'ytcfg.data_.EXPERIMENT_FLAGS.adblock_detector',
      'ytInitialPlayerResponse.playabilityStatus.status',
      'ytInitialPlayerResponse.playabilityStatus.errorScreen'
    ];

    paths.forEach(path => {
      try {
        const parts = path.split('.');
        let obj = win;
        for(let i = 0; i < parts.length - 1; i++) {
          if (!(parts[i] in obj)) obj[parts[i]] = {};
          obj = obj[parts[i]];
        }
        const lastKey = parts[parts.length - 1];

        // Set arrays to empty, booleans to false, others to null/empty string as fallback
        if (lastKey.includes('EXPERIMENT_FLAGS')) {
          obj[lastKey] = {};
        } else if (lastKey.toLowerCase().includes('ad') || lastKey.toLowerCase().includes('ads')) {
          obj[lastKey] = Array.isArray(obj[lastKey]) ? [] : null;
        } else if (lastKey === 'status' || lastKey === 'errorScreen') {
          obj[lastKey] = 'OK'; // Force playable
        } else {
          obj[lastKey] = null;
        }
      } catch(e) {
        // Fail silently
      }
    });
  }

  // === [2] Enhanced ad request blocking ===
  function blockAdRequests() {
    const adUrlPatterns = [
      '/ad_',
      '/ads/',
      'doubleclick.net',
      'googleadservices.com',
      'googlesyndication.com',
      'pagead2.googlesyndication.com',
      'adservice.google.com',
      'youtube.com/api/stats/ads',
      'googleads.g.doubleclick.net',
      'adclick.g.doubleclick.net',
      'ads.youtube.com'
    ];

    const originalFetch = win.fetch;
    win.fetch = function(...args) {
      const url = args[0]?.url || args[0];
      if (typeof url === 'string' && adUrlPatterns.some(pattern => url.includes(pattern))) {
        return Promise.reject(new Error('Blocked by Ultra YouTube AdBlock Bypasser'));
      }
      return originalFetch.apply(this, args);
    };

    const originalXHROpen = win.XMLHttpRequest.prototype.open;
    win.XMLHttpRequest.prototype.open = function(method, url) {
      if (typeof url === 'string' && adUrlPatterns.some(pattern => url.includes(pattern))) {
        // Abort silently by not calling open
        return;
      }
      return originalXHROpen.apply(this, arguments);
    };
  }

  // === [3] Real-time DOM ad remover (throttled) ===
  let adRemovalScheduled = false;
  function removeAdElements() {
    if (adRemovalScheduled) return;
    adRemovalScheduled = true;

    setTimeout(() => {
      const selectors = [
        '.ytp-ad-module',
        '.video-ads',
        '.ytp-ad-player-overlay',
        '.ytp-ad-overlay-container',
        '.ytp-ad-overlay-slot',
        '.ytp-ad-preview-container',
        '.ytp-ad-image-overlay',
        '.ad-container',
        '.ad-showing',
        '.ad-interrupting',
        '#player-ads',
        '.ytp-ad-skip-button',
        '.ytp-ad-overlay-slot'
      ];

      selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => el.remove());
      });

      // Remove ad class flags to prevent overlay or player stuck states
      const player = document.querySelector('.html5-video-player');
      if (player) {
        player.classList.remove('ad-showing', 'ad-interrupting');
      }

      adRemovalScheduled = false;
    }, 100); // Batch DOM changes every 100ms
  }

  // Use MutationObserver to call removeAdElements on added nodes
  const observer = new MutationObserver(removeAdElements);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // === [4] Block ad-related script execution ===
  function blockAdScripts() {
    document.addEventListener('beforescriptexecute', (e) => {
      const src = e.target.src || '';
      const adScriptPatterns = [
        'adservice',
        'doubleclick',
        'adserver',
        'adsense',
        'ad-logging',
        'pagead',
        'googleads',
        'googlesyndication'
      ];

      if (adScriptPatterns.some(pattern => src.includes(pattern))) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
  }

  // === [5] Periodically re-apply overrides to stay stealthy ===
  function periodicOverrides() {
    overrideAdFlags();
    setTimeout(periodicOverrides, 3000);
  }

  // === [6] Initialize all ===
  overrideAdFlags();
  blockAdRequests();
  removeAdElements();
  blockAdScripts();
  periodicOverrides();

})();
