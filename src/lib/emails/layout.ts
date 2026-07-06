// Shared branded wrapper for transactional emails. Inline styles only —
// email clients strip <style> blocks and custom fonts unreliably, so this
// mirrors the "ledger" look (warm paper, brand red accent, mono microlabels)
// using web-safe fonts instead of Archivo/IBM Plex Mono.

const BRAND_RED = "#c41e3a";
const INK = "#2c2822";
const MUTED = "#71675a";
const PAPER = "#faf8f5";
const BORDER = "#e3ddd1";

export function renderEmailLayout({
  preheader,
  heading,
  bodyHtml,
  cta,
}: {
  preheader: string;
  heading: string;
  bodyHtml: string;
  cta?: { label: string; url: string };
}) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:${PAPER};font-family:'Helvetica Neue',Arial,sans-serif;">
    <span style="display:none;font-size:1px;color:${PAPER};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${PAPER};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#fffdfa;border:1px solid ${BORDER};">
            <tr>
              <td style="padding:28px 32px 20px;border-bottom:1px solid ${BORDER};">
                <span style="color:${BRAND_RED};font-size:18px;">&#9660;</span>
                <span style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${INK};margin-left:8px;vertical-align:middle;">UUAIS Business Hub</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;color:${INK};">${heading}</h1>
                <div style="font-size:14px;line-height:1.6;color:${INK};">${bodyHtml}</div>
                ${
                  cta
                    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                        <tr>
                          <td style="background-color:${BRAND_RED};">
                            <a href="${cta.url}" style="display:inline-block;padding:12px 24px;font-size:13px;font-weight:600;color:#fdfaf5;text-decoration:none;">${cta.label}</a>
                          </td>
                        </tr>
                      </table>`
                    : ""
                }
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 28px;border-top:1px solid ${BORDER};">
                <p style="margin:0;font-size:11px;letter-spacing:0.04em;color:${MUTED};">Sent by UUAIS Business Hub</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export { BRAND_RED, INK, MUTED };
