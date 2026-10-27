// Stops the save-image menu, dragging a picture out, and the usual inspect shortcuts.
(function () {
  var css = [
    "html, body, img, picture, svg, canvas, video {",
    "  -webkit-touch-callout: none;",
    "  -webkit-user-select: none;",
    "  user-select: none;",
    "}",
    "img, picture, video {",
    "  -webkit-user-drag: none;",
    "  pointer-events: none;",
    "}",
    "input, textarea, [contenteditable='true'] {",
    "  -webkit-user-select: text;",
    "  user-select: text;",
    "}"
  ].join("\n");

  var style = document.createElement("style");
  style.appendChild(document.createTextNode(css));
  document.documentElement.appendChild(style);

  function block(event) {
    event.preventDefault();
  }

  document.addEventListener("contextmenu", block, true);
  document.addEventListener("dragstart", block, true);

  document.addEventListener("keydown", function (event) {
    var key = (event.key || "").toLowerCase();
    var cmd = event.ctrlKey || event.metaKey;
    var inspect = event.key === "F12"
      || (cmd && event.shiftKey && (key === "i" || key === "j" || key === "c"))
      || (cmd && key === "u");
    if (inspect) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  function lockImages(root) {
    if (!root.querySelectorAll) return;
    var nodes = root.querySelectorAll("img");
    for (var i = 0; i < nodes.length; i++) nodes[i].setAttribute("draggable", "false");
  }

  function watch() {
    lockImages(document);
    var observer = new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var added = records[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var node = added[j];
          if (!node || node.nodeType !== 1) continue;
          if (node.tagName === "IMG") node.setAttribute("draggable", "false");
          else lockImages(node);
        }
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", watch);
  else watch();
})();
