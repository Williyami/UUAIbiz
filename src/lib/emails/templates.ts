import { renderEmailLayout, MUTED } from "./layout";

const APP_URL = process.env.APP_URL || "https://uuaibiz.vercel.app";

export function welcomeEmail({ name, email }: { name: string; email: string }) {
  return {
    subject: "Your UUAIS Business Hub account is ready",
    html: renderEmailLayout({
      preheader: "An account has been created for you on the Business Hub.",
      heading: `Welcome, ${name || email}`,
      bodyHtml: `
        <p style="margin:0 0 12px;">An account has been created for you on the UUAIS Business Hub. Click the button below, enter your email, and choose your own password to finish setting it up.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;width:100%;">
          <tr>
            <td style="padding:10px 14px;background-color:#f3efe8;font-size:13px;">
              <span style="color:${MUTED};">Your email</span><br/>${email}
            </td>
          </tr>
        </table>
      `,
      cta: { label: "Set your password", url: `${APP_URL}/auth` },
    }),
  };
}

export function passwordResetEmail({ name, email }: { name: string; email: string }) {
  return {
    subject: "Your UUAIS Business Hub password was reset",
    html: renderEmailLayout({
      preheader: "An admin reset your password on the Business Hub.",
      heading: "Password reset",
      bodyHtml: `
        <p style="margin:0 0 12px;">An admin reset your password for the UUAIS Business Hub${name ? `, ${name}` : ""}. Click the button below, enter your email, and choose a new password.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;width:100%;">
          <tr>
            <td style="padding:10px 14px;background-color:#f3efe8;font-size:13px;">
              <span style="color:${MUTED};">Your email</span><br/>${email}
            </td>
          </tr>
        </table>
      `,
      cta: { label: "Choose a new password", url: `${APP_URL}/auth` },
    }),
  };
}
