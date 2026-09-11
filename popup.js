(function () {
  "use strict";

  // ------------------------------------------------------------------
  // CONFIGURACIÓN: cambiá esta URL por la de tu backend desplegado.
  // Podés sobreescribirla desde la tienda definiendo antes de este script:
  //   <script>window.TN_POPUP_BACKEND_URL = "https://tu-app.onrender.com";</script>
  // ------------------------------------------------------------------
  var BACKEND_URL =
    (window.TN_POPUP_BACKEND_URL || "https://TU-BACKEND.onrender.com").replace(/\/$/, "");

  var CONFIG_ENDPOINT = BACKEND_URL + "/api/popups/active";

  function matchesKeyword(url, keyword, matchType) {
    if (!keyword) return false;
    var haystack = url.toLowerCase();
    var needle = keyword.toLowerCase();
    switch (matchType) {
      case "equals":
        return haystack === needle;
      case "starts_with":
        return haystack.indexOf(needle) === 0;
      case "contains":
      default:
        return haystack.indexOf(needle) !== -1;
    }
  }

  function alreadyShown(popupId) {
    try {
      return sessionStorage.getItem("tn_popup_shown_" + popupId) === "1";
    } catch (e) {
      return false;
    }
  }

  function markShown(popupId) {
    try {
      sessionStorage.setItem("tn_popup_shown_" + popupId, "1");
    } catch (e) {
      /* noop */
    }
  }

  var FONT_STACKS = {
    system: "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'Segoe UI Rounded', 'Comic Sans MS', system-ui, sans-serif",
    monospace: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  };

  var CORNER_POSITIONS = ["top-left", "top-right", "bottom-left", "bottom-right"];

  function injectStyles() {
    if (document.getElementById("tn-popup-styles")) return;
    var style = document.createElement("style");
    style.id = "tn-popup-styles";
    style.textContent = [
      ".tn-popup-overlay{position:fixed;inset:0;display:flex;z-index:999999;",
      "padding:16px;box-sizing:border-box;opacity:0;transition:opacity .25s ease;}",
      ".tn-popup-overlay.tn-visible{opacity:1;}",
      ".tn-popup-overlay.tn-center{align-items:center;justify-content:center;background:rgba(0,0,0,.55);}",
      ".tn-popup-overlay.tn-top{align-items:flex-start;justify-content:center;background:rgba(0,0,0,.55);}",
      ".tn-popup-overlay.tn-bottom{align-items:flex-end;justify-content:center;background:rgba(0,0,0,.55);}",
      ".tn-popup-overlay.tn-corner{background:transparent;pointer-events:none;}",
      ".tn-popup-box{position:relative;box-shadow:0 20px 50px rgba(0,0,0,.25);overflow:hidden;",
      "pointer-events:auto;box-sizing:border-box;",
      "font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;}",
      ".tn-popup-box.tn-corner-pos{position:fixed;margin:20px;max-width:calc(100vw - 40px);}",
      ".tn-popup-box.tn-pos-top-left{top:0;left:0;}",
      ".tn-popup-box.tn-pos-top-right{top:0;right:0;}",
      ".tn-popup-box.tn-pos-bottom-left{bottom:0;left:0;}",
      ".tn-popup-box.tn-pos-bottom-right{bottom:0;right:0;}",
      ".tn-popup-close{position:absolute;top:10px;right:10px;width:28px;height:28px;",
      "border-radius:50%;background:rgba(255,255,255,.9);border:none;cursor:pointer;",
      "font-size:16px;line-height:1;color:#333;display:flex;align-items:center;",
      "justify-content:center;z-index:2;}",
      ".tn-popup-close:hover{background:#fff;}",
      ".tn-popup-img{width:100%;display:block;max-height:220px;object-fit:cover;}",
      ".tn-popup-content{padding:20px 22px 24px;}",
      ".tn-popup-title{margin:0 0 8px;font-weight:700;}",
      ".tn-popup-message{margin:0 0 18px;line-height:1.5;}",
      ".tn-popup-cta{display:inline-block;text-decoration:none;",
      "padding:11px 20px;border-radius:8px;font-size:14px;font-weight:600;}",
      ".tn-popup-cta:hover{opacity:.85;}",
    ].join("");
    document.head.appendChild(style);
  }

  function fillTemplate(str, popup) {
    if (!str) return "";
    return str
      .replace(/\{title\}/g, popup.title || "")
      .replace(/\{message\}/g, popup.message || "")
      .replace(/\{image_url\}/g, popup.image_url || "")
      .replace(/\{cta_text\}/g, popup.cta_text || "")
      .replace(/\{cta_url\}/g, popup.cta_url || "");
  }

  function buildSimpleContent(box, popup) {
    box.style.background = popup.bg_color || "#ffffff";
    box.style.borderRadius = (popup.border_radius != null ? popup.border_radius : 12) + "px";
    box.style.width = (popup.width || 420) + "px";
    box.style.fontFamily = FONT_STACKS[popup.font_family] || FONT_STACKS.system;

    var closeBtn = document.createElement("button");
    closeBtn.className = "tn-popup-close";
    closeBtn.innerHTML = "&times;";
    closeBtn.setAttribute("aria-label", "Cerrar");
    box.appendChild(closeBtn);

    if (popup.image_url) {
      var img = document.createElement("img");
      img.className = "tn-popup-img";
      img.src = popup.image_url;
      img.alt = popup.title || "";
      box.appendChild(img);
    }

    var content = document.createElement("div");
    content.className = "tn-popup-content";

    if (popup.title) {
      var h2 = document.createElement("h2");
      h2.className = "tn-popup-title";
      h2.textContent = popup.title;
      h2.style.color = popup.title_color || "#111111";
      h2.style.fontSize = (popup.title_font_size || 20) + "px";
      content.appendChild(h2);
    }

    if (popup.message) {
      var p = document.createElement("p");
      p.className = "tn-popup-message";
      p.textContent = popup.message;
      p.style.color = popup.text_color || "#444444";
      p.style.fontSize = (popup.text_font_size || 14) + "px";
      content.appendChild(p);
    }

    if (popup.cta_text && popup.cta_url) {
      var a = document.createElement("a");
      a.className = "tn-popup-cta";
      a.href = popup.cta_url;
      a.textContent = popup.cta_text;
      a.style.background = popup.button_bg_color || "#111111";
      a.style.color = popup.button_text_color || "#ffffff";
      content.appendChild(a);
    }

    box.appendChild(content);
    return closeBtn;
  }

  function buildCustomContent(box, popup) {
    if (popup.custom_css) {
      var style = document.createElement("style");
      style.textContent = popup.custom_css;
      box.appendChild(style);
    }

    var closeBtn = document.createElement("button");
    closeBtn.className = "tn-popup-close";
    closeBtn.innerHTML = "&times;";
    closeBtn.setAttribute("aria-label", "Cerrar");
    box.appendChild(closeBtn);

    var wrapper = document.createElement("div");
    wrapper.innerHTML = fillTemplate(popup.custom_html, popup);
    box.appendChild(wrapper);

    if (!popup.width) box.style.width = "420px";
    else box.style.width = popup.width + "px";
    box.style.borderRadius = (popup.border_radius != null ? popup.border_radius : 12) + "px";
    if (!popup.custom_css) box.style.background = popup.bg_color || "#ffffff";

    if (popup.custom_js) {
      try {
        var fn = new Function("popupEl", "popup", popup.custom_js);
        fn(box, popup);
      } catch (e) {
        console.warn("[tn-popup] error ejecutando JS personalizado:", e);
      }
    }
    return closeBtn;
  }

  function applyPositionAndAnimation(overlay, box, popup) {
    var position = popup.position || "center";
    var isCorner = CORNER_POSITIONS.indexOf(position) !== -1;

    if (isCorner) {
      overlay.classList.add("tn-corner");
      box.classList.add("tn-corner-pos", "tn-pos-" + position);
    } else {
      overlay.classList.add("tn-" + position);
    }

    var animation = popup.animation || "fade";
    box.style.transition = "transform .25s ease, opacity .25s ease";
    box.style.opacity = "0";

    var initialTransform = "none";
    var finalTransform = "none";
    if (animation === "slide-up") {
      initialTransform = "translateY(40px)";
      finalTransform = "translateY(0)";
    } else if (animation === "slide-down") {
      initialTransform = "translateY(-40px)";
      finalTransform = "translateY(0)";
    } else if (animation === "zoom") {
      initialTransform = "scale(.85)";
      finalTransform = "scale(1)";
    } else if (animation === "none") {
      box.style.transition = "none";
      box.style.opacity = "1";
    } else {
      // fade
      initialTransform = "translateY(12px)";
      finalTransform = "translateY(0)";
    }
    box.style.transform = initialTransform;

    return function reveal() {
      box.style.opacity = "1";
      box.style.transform = finalTransform;
    };
  }

  function showPopup(popup, onClose) {
    if (alreadyShown(popup.id)) return;
    injectStyles();

    var overlay = document.createElement("div");
    overlay.className = "tn-popup-overlay";

    var box = document.createElement("div");
    box.className = "tn-popup-box";

    var closeBtn = (popup.design_mode === "custom")
      ? buildCustomContent(box, popup)
      : buildSimpleContent(box, popup);

    var closed = false;
    closeBtn.onclick = function () {
      if (closed) return;
      closed = true;
      overlay.classList.remove("tn-visible");
      setTimeout(function () {
        overlay.remove();
      }, 200);
      if (typeof onClose === "function") onClose();
    };

    overlay.appendChild(box);

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeBtn.onclick();
    });

    var reveal = applyPositionAndAnimation(overlay, box, popup);

    document.body.appendChild(overlay);
    requestAnimationFrame(function () {
      overlay.classList.add("tn-visible");
      reveal();
    });

    if (popup.show_once_per_session) {
      markShown(popup.id);
    }
  }

  // ---------- Disparador por clic en un botón/link ----------
  var clickInterceptEnabled = true;

  function findMatchingClickTarget(startEl, text) {
    if (!text) return null;
    var needle = text.trim().toLowerCase();
    var node = startEl;
    var depth = 0;
    while (node && depth < 6) {
      var isClickable =
        node.tagName === "BUTTON" ||
        node.tagName === "A" ||
        (node.getAttribute && node.getAttribute("role") === "button");
      if (isClickable && node.textContent && node.textContent.trim().toLowerCase().indexOf(needle) !== -1) {
        return node;
      }
      node = node.parentElement;
      depth++;
    }
    return null;
  }

  function resumeOriginalClick(target) {
    clickInterceptEnabled = false;
    try {
      target.click();
    } catch (e) {
      /* noop */
    }
    setTimeout(function () {
      clickInterceptEnabled = true;
    }, 50);
  }

  function setupClickTrigger(popup) {
    document.addEventListener(
      "click",
      function (e) {
        if (!clickInterceptEnabled) return;
        if (alreadyShown(popup.id)) return;
        if (popup.click_url_restrict && !matchesKeyword(window.location.href, popup.click_url_restrict, "contains")) {
          return;
        }
        var target = findMatchingClickTarget(e.target, popup.click_text);
        if (!target) return;

        e.preventDefault();
        e.stopPropagation();

        showPopup(popup, function onClose() {
          resumeOriginalClick(target);
        });
      },
      true
    );
  }

  function init() {
    var currentUrl = window.location.href;

    fetch(CONFIG_ENDPOINT)
      .then(function (res) {
        if (!res.ok) throw new Error("No se pudo obtener la configuración de pop-ups");
        return res.json();
      })
      .then(function (popups) {
        (popups || []).forEach(function (popup) {
          if (popup.trigger_type === "click") {
            setupClickTrigger(popup);
            return;
          }
          if (!matchesKeyword(currentUrl, popup.keyword, popup.match_type)) return;
          var delayMs = Math.max(0, Number(popup.delay_seconds) || 0) * 1000;
          setTimeout(function () {
            showPopup(popup);
          }, delayMs);
        });
      })
      .catch(function (err) {
        console.warn("[tn-popup] error cargando configuración:", err);
      });
  }

  if (!window.TN_POPUP_DISABLE_AUTO_INIT) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }

  window.TNPopupWidget = { showPopup: showPopup };
})();
