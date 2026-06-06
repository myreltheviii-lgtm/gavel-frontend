/**
 * GAVEL embeddable verdict widget.
 *
 * Usage:
 *   <div data-gavel-verdict="DEAL_ID" data-theme="dark"></div>
 *   <script src="https://your-domain.com/widget.js" async></script>
 *
 * Or programmatically:
 *   <script src="https://your-domain.com/widget.js"></script>
 *   <script>GavelWidget.render('#target', { deal: 'DEAL_ID', theme: 'light' });</script>
 */
;(function () {
  'use strict'

  // Resolve the origin this script was served from so embeds work cross-domain.
  function scriptOrigin() {
    var current = document.currentScript
    if (current && current.src) {
      try {
        return new URL(current.src).origin
      } catch (e) {
        /* noop */
      }
    }
    var scripts = document.getElementsByTagName('script')
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].src || ''
      if (src.indexOf('widget.js') !== -1) {
        try {
          return new URL(src).origin
        } catch (e) {
          /* noop */
        }
      }
    }
    return window.location.origin
  }

  var ORIGIN = scriptOrigin()

  function buildIframe(opts) {
    var deal = opts.deal
    var theme = opts.theme === 'light' ? 'light' : 'dark'
    var iframe = document.createElement('iframe')
    iframe.src =
      ORIGIN + '/embed?deal=' + encodeURIComponent(deal) + '&theme=' + encodeURIComponent(theme)
    iframe.setAttribute('title', 'GAVEL Verdict')
    iframe.setAttribute('loading', 'lazy')
    iframe.style.width = '100%'
    iframe.style.maxWidth = '400px'
    iframe.style.border = '0'
    iframe.style.height = '220px'
    iframe.style.colorScheme = 'normal'
    iframe.setAttribute('scrolling', 'no')
    iframe.dataset.gavelDeal = deal
    return iframe
  }

  // Auto-resize iframes when the embed reports its height.
  var registered = false
  function registerResizeListener() {
    if (registered) return
    registered = true
    window.addEventListener('message', function (event) {
      if (event.origin !== ORIGIN) return
      var data = event.data || {}
      if (data.type !== 'gavel:embed:height') return
      var frames = document.querySelectorAll('iframe[data-gavel-deal]')
      for (var i = 0; i < frames.length; i++) {
        if (frames[i].contentWindow === event.source) {
          frames[i].style.height = data.height + 'px'
        }
      }
    })
  }

  function render(target, opts) {
    var el = typeof target === 'string' ? document.querySelector(target) : target
    if (!el || !opts || !opts.deal) return null
    registerResizeListener()
    var iframe = buildIframe(opts)
    el.innerHTML = ''
    el.appendChild(iframe)
    return iframe
  }

  // Auto-mount any declarative placeholders on the page.
  function mountAll() {
    var nodes = document.querySelectorAll('[data-gavel-verdict]')
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i]
      if (node.getAttribute('data-gavel-mounted') === 'true') continue
      node.setAttribute('data-gavel-mounted', 'true')
      render(node, {
        deal: node.getAttribute('data-gavel-verdict'),
        theme: node.getAttribute('data-theme') || 'dark',
      })
    }
  }

  window.GavelWidget = { render: render, mountAll: mountAll }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAll)
  } else {
    mountAll()
  }
})()
