/*!
 * Otica Reformada - Internal Linker V3
 * Linkagem interna automática com tooltip
 *
 * Melhorias da V3:
 * - Reconhece múltiplos termos dentro do mesmo parágrafo/nó de texto.
 * - Respeita data-max-per-page.
 * - Respeita data-max-same-url.
 * - Ignora links já existentes.
 * - Ignora scripts, estilos, botões, inputs e tooltips.
 * - Evita linkar a própria página.
 * - Tooltip compatível com desktop e celular.
 */

(function () {
  "use strict";

  var SCRIPT = document.currentScript || {};
  var DEBUG = String(SCRIPT.getAttribute("data-debug") || "false") === "true";
  var MAX_PER_PAGE = parseInt(SCRIPT.getAttribute("data-max-per-page") || "20", 10);
  var MAX_SAME_URL = parseInt(SCRIPT.getAttribute("data-max-same-url") || "1", 10);

  console.log("[OticaInternalLinker] VERSÃO V3 CARREGADA");

  var DATA = window.OTICA_INTERNAL_LINKS || [];
  var tooltipEl = null;

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

  function isMobileViewport() {
    return window.matchMedia("(max-width: 700px)").matches;
  }

  function injectStyles() {
    var oldStyle = document.getElementById("otica-internal-linker-style");

    if (oldStyle) {
      oldStyle.remove();
    }

    var css = `
      .otica-internal-term {
        color: #a66a12 !important;
        font-weight: 700 !important;
        text-decoration-line: underline !important;
        text-decoration-style: dotted !important;
        text-decoration-thickness: 1.5px !important;
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
    if (isMobileViewport()) {
      tooltip.style.left = "12px";
      tooltip.style.right = "12px";
      tooltip.style.bottom = "12px";
      tooltip.style.top = "auto";
      return;
    }

    var rect = target.getBoundingClientRect();
    var margin = 10;
    var width = tooltip.offsetWidth || 390;
    var height = tooltip.offsetHeight || 170;

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
    tooltip.style.right = "auto";
    tooltip.style.bottom = "auto";
  }

  function getContentRoot() {
    return (
      document.querySelector(".post-body.entry-content") ||
      document.querySelector(".post-body") ||
      document.querySelector(".entry-content") ||
      document.querySelector("article")
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
      parent.closest("select") ||
      parent.closest("option") ||
      parent.closest("nav") ||
      parent.closest("header") ||
      parent.closest("footer") ||
      parent.closest(".post-title") ||
      parent.closest(".post-header") ||
      parent.closest(".post-footer") ||
      parent.closest(".breadcrumbs") ||
      parent.closest(".comments") ||
      parent.closest(".comment") ||
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
    var seen = {};
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
        var cleanTerm = String(term || "").trim();

        if (cleanTerm.length < 3) {
          return;
        }

        var normalized = normalizeText(cleanTerm);
        var key = normalized + "|" + item.url;

        if (seen[key]) {
          return;
        }

        seen[key] = true;

        terms.push({
          text: cleanTerm,
          normalized: normalized,
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

  function getBoundaryRegex(termText) {
    return new RegExp(
      "(^|[^\\p{L}\\p{N}])(" + escapeRegExp(termText) + ")(?=$|[^\\p{L}\\p{N}])",
      "iu"
    );
  }

  function findNextMatch(text, terms, urlCounts) {
    var best = null;

    for (var i = 0; i < terms.length; i++) {
      var term = terms[i];
      var url = term.item.url;

      if ((urlCounts[url] || 0) >= MAX_SAME_URL) {
        continue;
      }

      var regex = getBoundaryRegex(term.text);
      var match = text.match(regex);

      if (!match) {
        continue;
      }

      var beforeBoundary = match[1] || "";
      var fullIndex = match.index;
      var start = fullIndex + beforeBoundary.length;
      var end = start + match[2].length;

      if (
        !best ||
        start < best.start ||
        (start === best.start && match[2].length > best.text.length)
      ) {
        best = {
          term: term,
          item: term.item,
          match: match,
          text: match[2],
          start: start,
          end: end
        };
      }
    }

    return best;
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

    span.addEventListener("mouseleave", function () {
      if (!isMobileViewport()) {
        hideTooltip();
      }
    });

    span.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();

      if (isMobileViewport()) {
        showTooltip(this, item);
      } else {
        window.location.href = item.url;
      }
    });

    span.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") {
        window.location.href = item.url;
      }

      if (ev.key === "Escape") {
        hideTooltip();
      }
    });

    return span;
  }

  function processTextNode(textNode, terms, counters) {
    if (counters.totalLinks >= MAX_PER_PAGE) {
      return;
    }

    var originalText = textNode.nodeValue;
    var remainingText = originalText;
    var frag = document.createDocumentFragment();
    var createdAny = false;

    while (remainingText && counters.totalLinks < MAX_PER_PAGE) {
      var matched = findNextMatch(remainingText, terms, counters.urlCounts);

      if (!matched) {
        frag.appendChild(document.createTextNode(remainingText));
        remainingText = "";
        break;
      }

      var before = remainingText.slice(0, matched.start);
      var after = remainingText.slice(matched.end);

      if (before) {
        frag.appendChild(document.createTextNode(before));
      }

      frag.appendChild(createLinkedSpan(matched.text, matched.item));

      counters.totalLinks++;
      counters.urlCounts[matched.item.url] = (counters.urlCounts[matched.item.url] || 0) + 1;
      createdAny = true;

      remainingText = after;
    }

    if (remainingText) {
      frag.appendChild(document.createTextNode(remainingText));
    }

    if (createdAny) {
      textNode.parentNode.replaceChild(frag, textNode);
    }
  }

  function bindGlobalEvents() {
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
        if (!isMobileViewport()) {
          hideTooltip();
        }
      },
      { passive: true }
    );

    window.addEventListener(
      "resize",
      function () {
        hideTooltip();
      },
      { passive: true }
    );
  }

  function linkify() {
    injectStyles();

    var root = getContentRoot();

    if (!root) {
      log("Raiz de conteúdo não encontrada. Nenhum fallback para document.body será usado por segurança.");
      return;
    }

    var terms = buildTerms();

    if (!terms.length) {
      log("Nenhum termo disponível para linkagem.");
      return;
    }

    var counters = {
      totalLinks: 0,
      urlCounts: {}
    };

    walkTextNodes(root, function (textNode) {
      processTextNode(textNode, terms, counters);
    });

    bindGlobalEvents();

    log("Links internos criados:", counters.totalLinks);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", linkify);
  } else {
    linkify();
  }
})();
