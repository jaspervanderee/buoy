/* eslint-env node */

// Ensure exactly one robots meta tag is present with the correct directives.
// - For indexable pages: index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1
// - For non-indexable pages: noindex,follow (no max-* directives)
// Removes any existing <meta name="robots"> tags and injects one before </head>.
export function ensureRobotsMeta(html, { indexable = true } = {}) {
  if (typeof html !== "string" || html.length === 0) return html;
  const robotsTagRe = /<meta[^>]+name=["']robots["'][^>]*>/gi;
  let output = html.replace(robotsTagRe, "");
  const content = indexable
    ? "index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1"
    : "noindex,follow";
  const tag = `<meta name="robots" content="${content}">`;
  const headCloseRe = /<\/head>/i;
  if (headCloseRe.test(output)) {
    output = output.replace(headCloseRe, `${tag}\n</head>`);
  } else {
    // Fallback: prepend if </head> missing
    output = `${tag}\n${output}`;
  }
  return output;
}


