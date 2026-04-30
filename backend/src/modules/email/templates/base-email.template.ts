export interface BaseEmailTemplateData {
  title: string;
  intro: string;
  body: string;
  actionLabel?: string;
  actionUrl?: string;
  footer?: string;
}

export function renderBaseEmailTemplate(
  data: BaseEmailTemplateData,
): string {
  const actionButton =
    data.actionLabel && data.actionUrl
      ? `
        <div style="margin: 32px 0; text-align: center;">
          <a
            href="${data.actionUrl}"
            style="display: inline-block; background: #0f4c81; color: #ffffff; text-decoration: none; padding: 14px 24px; border-radius: 8px; font-weight: 600;"
          >${data.actionLabel}</a>
        </div>
      `
      : '';

  return `
    <!DOCTYPE html>
    <html lang="it">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${data.title}</title>
      </head>
      <body style="margin: 0; padding: 24px; background: #f4f7fb; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f2937;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 12px 40px rgba(15, 76, 129, 0.12);">
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #0f4c81 0%, #2a7abf 100%); color: #ffffff;">
              <div style="font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.88;">Portale Quotazioni</div>
              <h1 style="margin: 12px 0 0; font-size: 28px; line-height: 1.2;">${data.title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7;">${data.intro}</p>
              <div style="font-size: 15px; line-height: 1.8; color: #374151;">${data.body}</div>
              ${actionButton}
              <p style="margin: 28px 0 0; font-size: 13px; line-height: 1.6; color: #6b7280;">
                ${
                  data.footer ||
                  'Questa email è stata generata automaticamente dal Portale Quotazioni.'
                }
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}
