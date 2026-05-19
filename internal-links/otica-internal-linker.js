/*!
 * Otica Reformada - Internal Linker
 * Linkagem interna automática com tooltip
 */

(function () {
  "use strict";

  var SCRIPT = document.currentScript || {};
  var DEBUG = String(SCRIPT.getAttribute("data-debug") || "false") === "true";
  var MAX_PER_PAGE = parseInt(SCRIPT.getAttribute("data-max-per-page") || "20", 10);
  var MAX_SAME_URL = parseInt(SCRIPT.getAttribute("data-max-same-url") || "1", 10);

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

  function injectStyles() {
    if (document.getElementById("otica-internal-linker-style")) return;

    var css = `
      .otica-internal-term {
        color: #b7791f;
        font-weight: 600;
        text-decoration: underline;
        text-decoration-style: dotted;
        text-underline-offset: 3px;
        cursor: pointer;
        position: relative;
      }

      .otica-internal-term:hover {
        color: #8a5a14;
      }

      .otica-internal-tooltip {
        position: fixed;
        z-index: 999999;
        width: min(340px, calc(100vw - 24px));
        background: #111827;
        color: #f9fafb;
        border: 1px solid rgba(255,255,255,.14);
        border-radius: 14px;
        box-shadow: 0 18px 45px rgba(0,0,0,.35);
        overflow: hidden;
        font-family: inherit;
        display: none;
      }

      .otica-internal-tooltip.is-visible {
        display: block;
      }

      .otica-internal-tooltip-header {
        padding: 12px 14px;
        font-weight: 700;
        font-size: 15px;
        line-height: 1.35;
        background: rgba(255,255,255,.08);
        border-bottom: 1px solid rgba(255,255,255,.12);
      }

      .otica-internal-tooltip-body {
        padding: 13px 14px 14px;
        font-size: 14px;
        line-height: 1.55;
      }

      .otica-internal-tooltip-body p {
        margin: 0 0 12px;
      }

      .otica-internal-tooltip-link {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: #facc15;
        font-weight: 700;
        text-decoration: none;
      }

      .otica-internal-tooltip-link:hover {
        text-decoration: underline;
      }

      .otica-internal-tooltip-close {
        display: none;
        position: absolute;
        top: 8px;
        right: 10px;
        width: 28px;
        height: 28px;
        border: 0;
        border-radius: 999px;
        background: rgba(255,255,255,.12);
        color: #fff;
        font-size: 18px;
        line-height: 28px;
        cursor: pointer;
      }

      @media (max-width: 700px) {
        .otica-internal-tooltip {
          left: 12px !important;
          right: 12px !important;
          bottom: 12px !important;
          top: auto !important;
          width: auto;
          max-height: 70vh;
        }

        .otica-internal-tooltip-close {
          display: block;
        }

        .otica-internal-tooltip-header {
          padding-right: 48px;
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
    if (!tooltipEl) tooltipEl = createTooltip();

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

    if (left < 12) left = 12;
    if (left + width > window.innerWidth - 12) {
      left = window.innerWidth - width - 12;
    }

    if (top + height > window.innerHeight - 12) {
      top = rect.top - height - margin;
    }

    if (top < 12) top = 12;

    tooltip.style.left = left + "px";
    tooltip.style.top = top + "px";
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
    if (!node || !node.parentNode) return true;

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

    DATA.forEach(function (item, index) {
      if (!item || !item.url || !item.termo) return;

      var currentUrl = normalizeUrl(location.href);
      var targetUrl = normalizeUrl(item.url);

      if (currentUrl === targetUrl) {
        log("Ignorando link para a própria página:", item.url);
        return;
      }

      var allTerms = [item.termo].concat(item.aliases || []);

      allTerms.forEach(function (term) {
        if (!term || String(term).trim().length < 3) return;

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

  function normalizeUrl(url) {
    try {
      var u = new URL(url, location.origin);
      return u.origin + u.pathname.replace(/\/$/, "");
    } catch (e) {
      return String(url || "").split("?")[0].replace(/\/$/, "");
    }
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

  function linkify() {
    injectStyles();

    var root = getContentRoot();
    if (!root) return;

    var terms = buildTerms();
    if (!terms.length) return;

    var totalLinks = 0;
    var urlCounts = {};

    walkTextNodes(root, function (textNode) {
      if (totalLinks >= MAX_PER_PAGE) return;

      var originalText = textNode.nodeValue;
      var normalizedOriginal = normalizeText(originalText);

      var matched = null;

      for (var i = 0; i < terms.length; i++) {
        var term = terms[i];
        var url = term.item.url;

        if ((urlCounts[url] || 0) >= MAX_SAME_URL) continue;

        if (normalizedOriginal.indexOf(term.normalized) === -1) continue;

        var regex = new RegExp("(^|[^\\p{L}\\p{N}])(" + escapeRegExp(term.text) + ")(?=$|[^\\p{L}\\p{N}])", "iu");
        var match = originalText.match(regex);

        if (match) {
          matched = {
            term: term,
            match: match
          };
          break;
        }
      }

      if (!matched) return;

      var matchText = matched.match[2];
      var beforeBoundary = matched.match[1] || "";
      var fullIndex = matched.match.index;
      var termIndex = fullIndex + beforeBoundary.length;

      var before = originalText.slice(0, termIndex);
      var after = originalText.slice(termIndex + matchText.length);

      var span = document.createElement("span");
      span.className = "otica-internal-term";
      span.textContent = matchText;
      span.setAttribute("tabindex", "0");
      span.setAttribute("role", "link");
      span.setAttribute("data-url", matched.term.item.url);

      span.addEventListener("mouseenter", function () {
        showTooltip(this, matched.term.item);
      });

      span.addEventListener("focus", function () {
        showTooltip(this, matched.term.item);
      });

      span.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();

        if (window.matchMedia("(max-width: 700px)").matches) {
          showTooltip(this, matched.term.item);
        } else {
          window.location.href = matched.term.item.url;
        }
      });

      span.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") {
          window.location.href = matched.term.item.url;
        }
      });

      var frag = document.createDocumentFragment();

      if (before) frag.appendChild(document.createTextNode(before));
      frag.appendChild(span);
      if (after) frag.appendChild(document.createTextNode(after));

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

    document.addEventListener("scroll", function () {
      hideTooltip();
    }, { passive: true });

    log("Links internos criados:", totalLinks);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", linkify);
  } else {
    linkify();
  }
})();
