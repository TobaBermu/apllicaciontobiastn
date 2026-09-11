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

  function injectStyles() {
    if (document.getElementById("tn-popup-styles")) return;
    var style = document.createElement("style");
    style.id = "tn-popup-styles";
    style.textContent = [
      ".tn-popup-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);",
      "display:flex;align-items:center;justify-content:center;z-index:999999;",
      "opacity:0;transition:opacity .25s ease;padding:16px;box-sizing:border-box;}",
      ".tn-popup-overlay.tn-visible{opacity:1;}",
      ".tn-popup-box{background:#fff;border-radius:12px;max-width:420px;width:100%;",
      "position:relative;box-shadow:0 20px 50px rgba(0,0,0,.25);overflow:hidden;",
      "transform:translateY(12px) scale(.98);transition:transform .25s ease;",
      "font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;}",
      ".tn-popup-overlay.tn-visible .tn-popup-box{transform:translateY(0) scale(1);}",
      ".tn-popup-close{position:absolute;top:10px;right:10px;width:30px;height:30px;",
      "border-radius:50%;background:rgba(255,255,255,.9);border:none;cursor:pointer;",
      "font-size:18px;line-height:1;color:#333;display:flex;align-items:center;",
      "justify-content:center;z-index:2;}",
      ".tn-popup-close:hover{background:#fff;}",
      ".tn-popup-img{width:100%;display:block;max-height:220px;object-fit:cover;}",
      ".tn-popup-content{padding:20px 22px 24px;}",
      ".tn-popup-title{margin:0 0 8px;font-size:20px;font-weight:700;color:#111;}",
      ".tn-popup-message{margin:0 0 18px;font-size:14px;line-height:1.5;color:#444;}",
      ".tn-popup-cta{display:inline-block;background:#111;color:#fff;text-decoration:none;",
      "padding:11px 20px;border-radius:8px;font-size:14px;font-weight:600;}",
      ".tn-popup-cta:hover{opacity:.85;}",
    ].join("");
    document.head.appendChild(style);
  }

  function showPopup(popup) {
    if (alreadyShown(popup.id)) return;
    injectStyles();

    var overlay = document.createElement("div");
    overlay.className = "tn-popup-overlay";

    var box = document.createElement("div");
    box.className = "tn-popup-box";

    var closeBtn = document.createElement("button");
    closeBtn.className = "tn-popup-close";
    closeBtn.innerHTML = "&times;";
    closeBtn.setAttribute("aria-label", "Cerrar");
    closeBtn.onclick = function () {
      overlay.classList.remove("tn-visible");
      setTimeout(function () {
        overlay.remove();
      }, 200);
    };

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
      content.appendChild(h2);
    }

    if (popup.message) {
      var p = document.createElement("p");
      p.className = "tn-popup-message";
      p.textContent = popup.message;
      content.appendChild(p);
    }

    if (popup.cta_text && popup.cta_url) {
      var a = document.createElement("a");
      a.className = "tn-popup-cta";
      a.href = popup.cta_url;
      a.textContent = popup.cta_text;
      content.appendChild(a);
    }

    box.appendChild(content);
    overlay.appendChild(box);

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeBtn.onclick();
    });

    document.body.appendChild(overlay);
    // Forzar reflow para que la transición de entrada funcione
    requestAnimationFrame(function () {
      overlay.classList.add("tn-visible");
    });

    if (popup.show_once_per_session) {
      markShown(popup.id);
    }
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
