// ===========================================================================
// DEV COPY - not the shipped loader.
//
// Byte-identical to embed_agent/alita-embed.js except for two values, both
// repointed from production to dev, plus one added line of test instrumentation:
//
//   line ~53   const host = "https://dev.alitahealth.ai/"
//   line ~240  postMessage(analytics, "https://dev.alitahealth.ai")
//   line ~245  dispatchEvent("harness-loader-sent") so the page can display it
//
// Why a copy is needed: the shipped loader hardcodes the production hub and
// ignores the snippet's host="" attribute, so the dev embed snippet loads the
// PRODUCTION widget. Without this copy there is no way to put the dev widget
// and the dev loader on the same page.
//
// Re-sync after any change to the real loader:
//   cp embed_agent/alita-embed.js alita-embed.dev.js   (then reapply the two lines)
// ===========================================================================

(function () {
  // Utility function to check if the origin is trusted
  function isOriginTrusted(origin) {
    console.log(`Checking origin: ${origin}`); // Log the origin to see what is being checked
    const trustedPatterns = [
      /https?:\/\/.*\.alitahealth\.ai/,
      /http:\/\/localhost(:\d+)?/,
      /https?:\/\/.*\.framer\.app/,
    ];

    const isTrusted = trustedPatterns.some(pattern => pattern.test(origin));
    console.log(`Is trusted: ${isTrusted}`); // Log the result of the check
    return isTrusted;
  }
  // Create a custom HTML element 'Alita-embed-agent'
  class EmbedAgent extends HTMLElement {
    constructor() {
      super();
      const appId = this.getAttribute("bbuilder-app-id");
      const orgId = this.getAttribute("bbuilder-org-id");
      const maxWidth = this.getAttribute("max-width");
      const maxHeight = this.getAttribute("max-height");

      // WordPress detection — background-compositing freeze fix
      const isWordPress =
        typeof window.wp !== "undefined" ||
        !!document.querySelector('meta[name="generator"][content*="WordPress"]');

      // Trigger a visually imperceptible repaint to unfreeze WordPress backgrounds
      // that get stale compositor snapshots during fixed-position iframe animation.
      const repaintIfWordPress = isWordPress
        ? () => {
            requestAnimationFrame(() => {
              document.body.style.opacity = "0.9999";
              requestAnimationFrame(() => {
                document.body.style.opacity = "";
              });
            });
          }
        : () => {};

      // Title notification state
      let _originalTitle = null;
      let _flashIntervalId = null;
      // Create an iframe element
      const iframe = document.createElement("iframe");
      // Detect screen agent loaded on and set the default and custom styles.
      const isMobile = window.innerWidth <= 768;
      // Determine minimized state from localStorage
      const isMinimized = localStorage.getItem("agentMinimized") === "true";

      //const host = this.getAttribute("host") || "https://hub.alitahealth.ai/";
      const host = "https://dev.alitahealth.ai/";
      
      const src = new URL("agent/", host);
      src.searchParams.set("uuid", String(appId));
      src.searchParams.set("org", orgId ?? "");
      src.searchParams.set("minimized", String(isMinimized));
      src.searchParams.set("url", window.location.href);

      // Set the iframe attributes
      iframe.setAttribute("id", `agent-${appId}`);
      iframe.setAttribute("src", src.toString());
      iframe.setAttribute("width", this.getAttribute("width") || "100%");
      iframe.setAttribute("height", this.getAttribute("height") || "700");
      iframe.setAttribute("scrolling", this.getAttribute("scrolling") || "no");
      iframe.setAttribute(
        "frameborder",
        this.getAttribute("frameborder") || "0"
      );
      iframe.setAttribute("allow", "clipboard-read; clipboard-write; storage-access; microphone");
      // Base style: fixed position, starts at 0x0 until the agent sends its first sizing message.
      iframe.setAttribute(
        "style",
        "position: fixed; z-index: 1000; height: 0; width: 0; overflow: hidden;"
      );
      // Allow embedders to override positioning via the element's style attribute,
      // then re-enforce 0x0 so a failed/slow agent load never shows a visible iframe.
      if (this.getAttribute("style")) {
        iframe.setAttribute("style", this.getAttribute("style"));
      }
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.overflow = "hidden";
      iframe.style.top = "";
      // Attach the iframe to the custom element
      this.appendChild(iframe);



      // Add a listener to the parent page to listed for messages.
      window.addEventListener("message", (event) => {
        // Event condition checks, with width and height data handling
        if (isOriginTrusted(event.origin)) {
          console.log("Message received:", event.data);

          this.style.bottom = event.data.bottom;
          if (event.data.position === "right") {
            iframe.style.right = event.data.side_padding;
            this.style.right = event.data.side_padding;
          } else {
            iframe.style.left = event.data.side_padding;
            this.style.left = event.data.side_padding;
          }

          // Handle different types of messages
          if (event.data.type === "alita-embed-open" && event.data.width && event.data.height) {
            // Get border radius from event data, with fallback for backward compatibility
            const borderRadius = event.data.border_radius || "24px";

            iframe.style.width = event.data.width;
            iframe.style.height = event.data.height;
            iframe.style.bottom = event.data.bottom;
            this.style.bottom = event.data.bottom;

            if (event.data.position === "right") {
              iframe.style.right = event.data.side_padding;
              this.style.right = event.data.side_padding;
            } else {
              iframe.style.left = event.data.side_padding;
              this.style.left = event.data.side_padding;
            }

            if (isMobile) {
              if (!event.data.openHalf) {
                console.log("within ismobile full")
                // Full screen chat on mobile
                iframe.style.height = "100dvh";
                iframe.style.width = "calc(100% - " + 2 * event.data.side_padding + "px)"; // "100vw";
                iframe.style.borderRadius = "0px";
                iframe.style.left = "0";
              } else {
                console.log("within ismobile else")
                iframe.style.height = "365px";
                iframe.style.width = "calc(100% - " + 2 * parseFloat(event.data.side_padding) + "px)";
                console.log("calc(100% - " + 2 * parseFloat(event.data.side_padding) + "px)")
                console.log(iframe.style.width)
                iframe.style.borderRadius = borderRadius;

                iframe.style.bottom = event.data.bottom;

                setTimeout(() => {
                  iframe.style.boxShadow = "rgba(18, 18, 18, 0.4) 0px 4px 20px 0px";
                  repaintIfWordPress();
                }, 1000);
              }
            } else {
              // Desktop: use provided sizes or fallbacks
              iframe.style.boxShadow = "none";
              iframe.style.borderRadius = borderRadius;
              iframe.style.maxWidth = `${maxWidth || "90vw"}`;
              iframe.style.maxHeight = `${maxHeight || "90vh"}`;
              setTimeout(() => {
                iframe.style.transition = "box-shadow 0.4s ease-in";
                iframe.style.boxShadow = "rgba(18, 18, 18, 0.4) 0px 4px 20px 0px";
                iframe.style.borderRadius = borderRadius;
                repaintIfWordPress();
              }, 100);
            }
            localStorage.setItem("agentMinimized", "false");
          } else if (event.data.type === "alita-embed-close") {

            // Immediately: clear shadow and snap position so badge lands in the correct spot
            iframe.style.transition = "";
            iframe.style.boxShadow = "";

            // Change position mid-animation to make it smoother
            setTimeout(() => {
              iframe.style.bottom = event.data.bottom;
              this.style.bottom = event.data.bottom;
              if (event.data.position === "right") {
                iframe.style.left = "";
                iframe.style.right = event.data.side_padding;
                this.style.right = event.data.side_padding;
              } else {
                iframe.style.right = "";
                iframe.style.left = event.data.side_padding;
                this.style.left = event.data.side_padding;
              }
            }, 150)

            // Defer only the size change until the inner animation finishes
            setTimeout(() => {
              iframe.style.width = event.data.width;
              iframe.style.height = event.data.height || "auto";
              repaintIfWordPress();
            }, 500);

            localStorage.setItem("agentMinimized", "true");
          } else if (event.data.type === "alita-embed-resize" && event.data.width && event.data.height) {
            iframe.width = event.data.width;
            iframe.height = event.data.height;
            iframe.style.width = (parseInt(event.data.width) + 20) + "px";
            iframe.style.height = (parseInt(event.data.height) + 20) + "px";
            repaintIfWordPress();
          } else if (event.data.type === "alita-parent-path") {
            iframe.contentWindow.postMessage({
              type: "PARENT_PATH",
              parent_current_path: window.location.href
            }, "*");
          } else if (event.data.type === "alita-request-analytics") {
            // The agent iframe is cross-origin and cannot read the host page's GA4
            // cookies. This loader runs on the host page, so it reads them and hands
            // them over. Only our own iframe may ask: isOriginTrusted is a substring
            // test, so comparing window objects is the stronger check.
            if (event.source !== iframe.contentWindow) return;

            // Always answer, so the agent never waits out its timeout.
            const analytics = {
              type: "ANALYTICS_CONTEXT",
              _ga: null,
              _ga_container_name: null,
              _ga_container: null,
              _ga_containers: {}
            };

            // Parse the jar once. Never build a RegExp from a cookie name we did not
            // choose: a cookie called "_ga_.*" would capture another cookie's value.
            // Null prototype so a cookie named __proto__ stays ordinary data.
            const jar = Object.create(null);
            for (const part of document.cookie.split("; ")) {
              const i = part.indexOf("=");
              if (i > 0) jar[part.slice(0, i)] = part.slice(i + 1);
            }

            // Match on the value, not just the "_ga_" prefix - any cookie can be
            // named that, and the first by name is not necessarily the real one.
            for (const k of Object.keys(jar)) {
              if (k.startsWith("_ga_") && /^GS\d+\./.test(jar[k])) {
                analytics._ga_containers[k] = jar[k];
              }
            }
            const containerName = Object.keys(analytics._ga_containers)[0] || null;

            analytics._ga = jar["_ga"] || null;
            analytics._ga_container_name = containerName;
            analytics._ga_container = containerName ? analytics._ga_containers[containerName] : null;

            if (iframe.contentWindow) {
              iframe.contentWindow.postMessage(analytics, "https://dev.alitahealth.ai");
            }

            // TEST PAGE ONLY - not in the shipped loader. The reply above goes to the
            // iframe and is invisible from this page, so echo what was sent for display.
            // A CustomEvent, not postMessage, so it does not re-enter the listener above.
            document.dispatchEvent(
              new CustomEvent("harness-loader-sent", { detail: analytics })
            );
          } else if (event.data.type === "alita-new-message") {
            const enabled = event.data.config?.enabled ?? false;
            if (enabled) {
              const count = event.data.unreadCount ?? 1;
              const message = `${count} New Message${count === 1 ? "" : "s"}!`;
              const interval = Number(event.data.config?.flashInterval ?? 1500);
              if (!_flashIntervalId) {
                _originalTitle = document.title;
              } else {
                clearInterval(_flashIntervalId);
                _flashIntervalId = null;
              }
              let showingNotif = true;
              document.title = message;
              _flashIntervalId = setInterval(() => {
                document.title = showingNotif ? _originalTitle : message;
                showingNotif = !showingNotif;
              }, interval);
            }
          } else if (event.data.type === "alita-messages-read") {
            if (_flashIntervalId) {
              clearInterval(_flashIntervalId);
              _flashIntervalId = null;
            }
            if (_originalTitle !== null) {
              document.title = _originalTitle;
              _originalTitle = null;
            }
          } else if (event.data.type === "alita-embed-disabled") {
            // Hide iframe to prevent dead zones
            iframe.style.width = "0";
            iframe.style.height = "0";
          }
        } else {
          console.warn("Untrusted origin:", event.origin);
        }
      });


      //Detect and report page navigations
      const postLocationChange = (location) => {
        iframe.contentWindow.postMessage({
          type: "alita-parent-path",
          parent_current_path: location
        }, "*");
      };
      // Method 1: History API events (for SPA navigation)
      const handlePopState = () => {
        console.log('PopState event - URL changed:', window.location.href);
        // Request updated path from parent
        postLocationChange(window.location.hash)
      };

      // Method 2: Hash change detection
      const handleHashChange = () => {
        console.log('Hash changed:', window.location.hash);
        // Request updated path from parent
        postLocationChange(window.location.hash)
      };

      // Method 3: URL change polling (fallback method)
      let lastUrl = window.location.href;
      const checkUrlChange = setInterval(() => {
        if (window.location.href !== lastUrl) {
          console.log('URL changed via polling:', window.location.href);
          lastUrl = window.location.href;
          // Request updated path from parent
          postLocationChange(window.location.hash)
        }
      }, 1000); // Check every second

      // Add event listeners
      window.addEventListener('popstate', handlePopState);
      window.addEventListener('hashchange', handleHashChange);
    }
  }
  // Register the custom element
  customElements.define("embed-agent", EmbedAgent);
})();
