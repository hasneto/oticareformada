/*!
 * Otica Reformada - Internal Linker V2
 * Linkagem interna automática com tooltip
 */

(function () {
  "use strict";

  var SCRIPT = document.currentScript || {};
  var DEBUG = String(SCRIPT.getAttribute("data-debug") || "false") === "true";
  var MAX_PER_PAGE = parseInt(SCRIPT.getAttribute("data-max-per-page") || "20", 10);
  var MAX_SAME_URL = parseInt(SCRIPT.getAttribute("data-max-same-url") || "1", 10);

  console.log("[OticaInternalLinker] VERSÃO V2 CARREGADA");

  var DATA = window.OTICA_INTERNAL_LINKS || [];

  if (!DATA.length) {
    log("Nenhum dado encontrado em window.OTICA_INTERNAL_LINKS.");
    return;
  }

  function log() {
    if (DEBUG && window.console) {
      console.log.apply(console, ["[OticaInternalLinker]"].concat([].slice.call(arguments)));
    }
  }

  function normalizeText(str) {
    return String(str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeRegExp(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeAttr(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/'/g, "&#39;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function normalizeUrl(url) {
    try {
      var u = new URL(url, location.origin);
      return u.origin + u.pathname.replace(/\/$/, "");
    } catch (e) {
      return String(url || "").split("?")[0].replace(/\/$/, "");
    }
  }

  function injectStyles() {
    var oldStyle = document.getElementById("otica-internal-linker-style");

    if (oldStyle) {
      oldStyle.remove();
    }

    var css = `
      .otica-internal-term {
        color: #b7791f !important;
        font-weight: 700 !important;
        text-decoration-line: underline !important;
        text-decoration-style: dotted !important;
        text-decoration-thickness: 2px !important;
        text-underline-offset: 4px !important;
        cursor: pointer !important;
        position: relative !important;
      }

      .otica-internal-term:hover {
        color: #8a5a14 !important;
      }

      .otica-internal-tooltip {
        position: fixed !important;
        z-index: 999999 !important;
        width: min(390px, calc(100vw - 24px)) !important;
        background: #111827 !important;
        color: #f9fafb !important;
        border: 1px solid rgba(255,255,255,.14) !important;
        border-radius: 14px !important;
        box-shadow: 0 18px 45px rgba(0,0,0,.35) !important;
        overflow: hidden !important;
        font-family: inherit !important;
        display: none;
      }

      .otica-internal-tooltip.is-visible {
        display: block !important;
      }

      .otica-internal-tooltip-header {
        padding: 12px 14px !important;
        font-weight: 700 !important;
        font-size: 15px !important;
        line-height: 1.35 !important;
        background: rgba(255,255,255,.08) !important;
        border-bottom: 1px solid rgba(255,255,255,.12) !important;
        color: #f9fafb !important;
      }

      .otica-internal-tooltip-body {
        padding: 13px 14px 14px !important;
        font-size: 14px !important;
        line-height: 1.55 !important;
        color: #f9fafb !important;
      }

      .otica-internal-tooltip-body p {
        margin: 0 0 12px !important;
        color: #f9fafb !important;
      }

      .otica-internal-tooltip-link,
      .otica-internal-tooltip-link:visited,
      .otica-internal-tooltip-link:hover,
      .otica-internal-tooltip-link:active {
        display: inline-flex !important;
        align-items: center !important;
        gap: 4px !important;
        color: #d9a441 !important;
        font-weight: 700 !important;
        text-decoration-line: underline !important;
        text-decoration-thickness: 1px !important;
        text-underline-offset: 3px !important;
      }

      .otica-internal-tooltip-link:hover {
        color: #f5c96b !important;
      }

      .otica-internal-tooltip-close {
        display: none;
        position: absolute !important;
        top: 8px !important;
        right: 10px !important;
        width: 28px !important;
        height: 28px !important;
        border: 0 !important;
        border-radius: 999px !important;
        background: rgba(255,255,255,.12) !important;
        color: #fff !important;
        font-size: 18px !important;
        line-height: 28px !important;
        cursor: pointer !important;
      }

      @media (max-width: 700px) {
        .otica-internal-tooltip {
          left: 12px !important;
          right: 12px !important;
          bottom: 12px !important;
          top: auto !important;
          width: auto !important;
          max-height: 70vh !important;
        }

        .otica-internal-tooltip-close {
          display: block !important;
        }

        .otica-internal-tooltip-header {
          padding-right: 48px !important;
        }
      }
    `;

    var style = document.createElement("style");
    style.id = "otica-internal-linker-style";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function createTooltip() {
    var tooltip = document.createElement("div");

    tooltip.className = "otica-internal-tooltip";
    tooltip.innerHTML =
      "<button type='button' class='otica-internal-tooltip-close' aria-label='Fechar'>×</button>" +
      "<div class='otica-internal-tooltip-header'></div>" +
      "<div class='otica-internal-tooltip-body'></div>";

    document.body.appendChild(tooltip);

    tooltip.querySelector(".otica-internal-tooltip-close").addEventListener("click", function () {
      hideTooltip();
    });

    return tooltip;
  }

  var tooltipEl = null;

  function showTooltip(target, item) {
    if (!tooltipEl) {
      tooltipEl = createTooltip();
    }

    var header = tooltipEl.querySelector(".otica-internal-tooltip-header");
    var body = tooltipEl.querySelector(".otica-internal-tooltip-body");

    header.textContent = item.titulo || item.termo || "Leia mais";

    body.innerHTML =
      "<p>" + escapeHtml(item.descricao || "") + "</p>" +
      "<a class='otica-internal-tooltip-link' href='" + escapeAttr(item.url) + "'>Ler mais →</a>";

    tooltipEl.classList.add("is-visible");

    positionTooltip(target, tooltipEl);
  }

  function hideTooltip() {
    if (tooltipEl) {
      tooltipEl.classList.remove("is-visible");
    }
  }

  function positionTooltip(target, tooltip) {
    var rect = target.getBoundingClientRect();
    var margin = 10;
    var width = tooltip.offsetWidth || 340;
    var height = tooltip.offsetHeight || 160;

    var left = rect.left + rect.width / 2 - width / 2;
    var top = rect.bottom + margin;

    if (left < 12) {
      left = 12;
    }

    if (left + width > window.innerWidth - 12) {
      left = window.innerWidth - width - 12;
    }

    if (top + height > window.innerHeight - 12) {
      top = rect.top - height - margin;
    }

    if (top < 12) {
      top = 12;
    }

    tooltip.style.left = left + "px";
    tooltip.style.top = top + "px";
  }

  function getContentRoot() {
    return (
      document.querySelector(".post-body") ||
      document.querySelector(".entry-content") ||
      document.querySelector("article") ||
      document.querySelector("main") ||
      document.body
    );
  }

  function shouldSkipNode(node) {
    if (!node || !node.parentNode) {
      return true;
    }

    var parent = node.parentNode;

    if (
      parent.closest("a") ||
      parent.closest("script") ||
      parent.closest("style") ||
      parent.closest("textarea") ||
      parent.closest("input") ||
      parent.closest("button") ||
      parent.closest(".otica-internal-term") ||
      parent.closest(".otica-bible-ref") ||
      parent.closest(".otica-bible-tooltip") ||
      parent.closest(".otica-internal-tooltip")
    ) {
      return true;
    }

    return false;
  }

  function buildTerms() {
    var terms = [];
    var currentUrl = normalizeUrl(location.href);

    DATA.forEach(function (item, index) {
      if (!item || !item.url || !item.termo) {
        return;
      }

      var targetUrl = normalizeUrl(item.url);

      if (currentUrl === targetUrl) {
        log("Ignorando link para a própria página:", item.url);
        return;
      }

      var allTerms = [item.termo].concat(item.aliases || []);

      allTerms.forEach(function (term) {
        if (!term || String(term).trim().length < 3) {
          return;
        }

        terms.push({
          text: String(term).trim(),
          normalized: normalizeText(term),
          item: item,
          index: index
        });
      });
    });

    terms.sort(function (a, b) {
      return b.text.length - a.text.length;
    });

    return terms;
  }

  function walkTextNodes(root, callback) {
    var walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (node) {
          if (!node.nodeValue || !node.nodeValue.trim()) {
            return NodeFilter.FILTER_REJECT;
          }

          if (shouldSkipNode(node)) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    var nodes = [];
    var node;

    while ((node = walker.nextNode())) {
      nodes.push(node);
    }

    nodes.forEach(callback);
  }

  function findMatch(originalText, terms, urlCounts) {
    var normalizedOriginal = normalizeText(originalText);

    for (var i = 0; i < terms.length; i++) {
      var term = terms[i];
      var url = term.item.url;

      if ((urlCounts[url] || 0) >= MAX_SAME_URL) {
        continue;
      }

      if (normalizedOriginal.indexOf(term.normalized) === -1) {
        continue;
      }

      var regex = new RegExp(
        "(^|[^\\p{L}\\p{N}])(" + escapeRegExp(term.text) + ")(?=$|[^\\p{L}\\p{N}])",
        "iu"
      );

      var match = originalText.match(regex);

      if (match) {
        return {
          term: term,
          match: match
        };
      }
    }

    return null;
  }

  function createLinkedSpan(text, item) {
    var span = document.createElement("span");

    span.className = "otica-internal-term";
    span.textContent = text;
    span.setAttribute("tabindex", "0");
    span.setAttribute("role", "link");
    span.setAttribute("data-url", item.url);

    span.addEventListener("mouseenter", function () {
      showTooltip(this, item);
    });

    span.addEventListener("focus", function () {
      showTooltip(this, item);
    });

    span.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();

      if (window.matchMedia("(max-width: 700px)").matches) {
        showTooltip(this, item);
      } else {
        window.location.href = item.url;
      }
    });

    span.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") {
        window.location.href = item.url;
      }
    });

    return span;
  }

  function linkify() {
    injectStyles();

    var root = getContentRoot();

    if (!root) {
      log("Raiz de conteúdo não encontrada.");
      return;
    }

    var terms = buildTerms();

    if (!terms.length) {
      log("Nenhum termo disponível para linkagem.");
      return;
    }

    var totalLinks = 0;
    var urlCounts = {};

    walkTextNodes(root, function (textNode) {
      if (totalLinks >= MAX_PER_PAGE) {
        return;
      }

      var originalText = textNode.nodeValue;
      var matched = findMatch(originalText, terms, urlCounts);

      if (!matched) {
        return;
      }

      var matchText = matched.match[2];
      var beforeBoundary = matched.match[1] || "";
      var fullIndex = matched.match.index;
      var termIndex = fullIndex + beforeBoundary.length;

      var before = originalText.slice(0, termIndex);
      var after = originalText.slice(termIndex + matchText.length);

      var span = createLinkedSpan(matchText, matched.term.item);
      var frag = document.createDocumentFragment();

      if (before) {
        frag.appendChild(document.createTextNode(before));
      }

      frag.appendChild(span);

      if (after) {
        frag.appendChild(document.createTextNode(after));
      }

      textNode.parentNode.replaceChild(frag, textNode);

      totalLinks++;
      urlCounts[matched.term.item.url] = (urlCounts[matched.term.item.url] || 0) + 1;
    });

    document.addEventListener("click", function (ev) {
      if (
        tooltipEl &&
        !ev.target.closest(".otica-internal-tooltip") &&
        !ev.target.closest(".otica-internal-term")
      ) {
        hideTooltip();
      }
    });

    document.addEventListener(
      "scroll",
      function () {
        hideTooltip();
      },
      { passive: true }
    );

    log("Links internos criados:", totalLinks);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", linkify);
  } else {
    linkify();
  }
})();
