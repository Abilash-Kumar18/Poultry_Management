const nodemailer = require('nodemailer');

/**
 * Creates a reusable email transporter.
 * Reads configurations from environmental variables (.env).
 */
const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure: port == 465,
      auth: { user, pass }
    });
  }
  return null;
};

/**
 * Sends a real-time critical disease outbreak email notification in a highly professional format
 * optimized with large typography, bold visual layouts, and clear containment procedures.
 */
const sendOutbreakEmail = async (recipientEmail, alertDetails, farmDetails) => {
  const { title, severity, symptoms, actions, affected_animals } = alertDetails;
  const { name: farmName, location: farmLocation } = farmDetails;

  const severityColor = severity === 'critical' ? '#ef4444' : severity === 'high' ? '#f97316' : '#eab308';
  const severityLabel = severity.toUpperCase();

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>CRITICAL BIOSECURITY OUTBREAK ALERT</title>
    </head>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; color: #111827;-webkit-font-smoothing: antialiased;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f4f6; padding: 20px 10px;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e5e7eb;">
              
              <!-- Red Header Banner -->
              <tr>
                <td style="background-color: ${severityColor}; padding: 30px 24px; text-align: center;">
                  <span style="display: inline-block; font-size: 14px; font-weight: 800; letter-spacing: 0.15em; background-color: rgba(255,255,255,0.2); color: #ffffff; padding: 6px 16px; border-radius: 20px; text-transform: uppercase; margin-bottom: 12px;">
                    ${severityLabel} BIOSECURITY THREAT
                  </span>
                  <h1 style="color: #ffffff; font-size: 28px; font-weight: 800; margin: 0; line-height: 1.25; letter-spacing: -0.02em;">
                    ${title}
                  </h1>
                </td>
              </tr>

              <!-- Main Body Content -->
              <tr>
                <td style="padding: 30px 24px;">
                  <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin-top: 0; margin-bottom: 24px;">
                    An official disease outbreak has been logged in the <strong>FarmGuard Portal</strong>. Please inspect the affected farm premises and implement containment protocols immediately.
                  </p>

                  <!-- Outbreak Statistics / UI block -->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb; border-radius: 12px; border: 1px solid #f3f4f6; margin-bottom: 24px;">
                    <tr>
                      <td style="padding: 16px; border-bottom: 1px solid #f3f4f6;">
                        <span style="font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; display: block; letter-spacing: 0.05em;">Affected Farm</span>
                        <strong style="font-size: 16px; color: #111827; display: block; margin-top: 2px;">${farmName} (${farmLocation})</strong>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 16px;">
                        <span style="font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; display: block; letter-spacing: 0.05em;">Affected Livestock Count</span>
                        <strong style="font-size: 16px; color: #111827; display: block; margin-top: 2px;">${affected_animals} head</strong>
                      </td>
                    </tr>
                  </table>

                  <!-- Symptoms section -->
                  {symptoms_placeholder}

                  <!-- Quarantine Actions block -->
                  <div style="margin-top: 24px; padding: 20px; background-color: #fffbeb; border-left: 5px solid #d97706; border-radius: 0 12px 12px 0;">
                    <h3 style="font-size: 16px; font-weight: 700; color: #92400e; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.02em;">
                      🚨 Immediate Containment Actions
                    </h3>
                    <p style="font-size: 14px; line-height: 1.5; color: #b45309; margin: 0;">
                      ${actions || 'Isolate all animal groupings immediately. Restrict transit inside of infected farm blocks, disinfect tires at gates, and wait for emergency health department inspection.'}
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Portal Redirect button -->
              <tr>
                <td style="padding: 0 24px 30px 24px; text-align: center;">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/alerts" style="display: inline-block; background-color: #111827; color: #ffffff; font-weight: 700; font-size: 16px; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); hover: background-color: #1f2937; transition: all 0.2s;">
                    Open Portal Dashboard
                  </a>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
                  This is a real-time security warning sent dynamically by your FarmGuard Biosecurity Daemon.<br>
                  &copy; 2026 FarmGuard Inc. Ludhiana & Coimbatore.
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // Inject symptoms list dynamically if available
  let symptomsList = '';
  if (symptoms) {
    symptomsList = `
      <div style="margin-bottom: 24px;">
        <h4 style="font-size: 13px; font-weight: 700; color: #374151; margin: 0 0 8px 0; text-transform: uppercase;">Observed Pathological Symptoms:</h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #4b5563; line-height: 1.6;">
          ${symptoms.split(',').map(s => `<li style="margin-bottom: 4px;">${s.trim()}</li>`).join('')}
        </ul>
      </div>
    `;
  }
  const populatedHtml = emailHtml.replace('{symptoms_placeholder}', symptomsList);

  const transporter = getTransporter();
  const finalRecipient = recipientEmail || process.env.SMTP_USER || 'admin@farmguard.com';
  
  if (transporter) {
    try {
      const mailOptions = {
        from: `"FarmGuard Biosecurity" <${process.env.SMTP_USER}>`,
        to: finalRecipient,
        subject: `🚨 [${severityLabel}] Outbreak warning: ${title} at ${farmName}`,
        html: populatedHtml
      };
      
      const info = await transporter.sendMail(mailOptions);
      console.log('Real-time alert email dispatched successfully via SMTP to:', finalRecipient, info.messageId);
      return true;
    } catch (err) {
      console.error('SMTP sending error, logging email payload to terminal instead:', err);
    }
  }

  // Fallback: Console warning visualization so developers / users can inspect it easily
  console.log('\n========================================================================');
  console.log('📬 [MOCK EMAIL ALERT LOGGER]');
  console.log(`To: ${recipientEmail}`);
  console.log(`Subject: 🚨 [${severityLabel}] Outbreak warning: ${title} at ${farmName}`);
  console.log('------------------------------------------------------------------------');
  console.log(`Farm: ${farmName} (${farmLocation})`);
  console.log(`Severity: ${severity}`);
  console.log(`Affected Count: ${affected_animals} head`);
  console.log(`Symptoms: ${symptoms}`);
  console.log(`Actions Required: ${actions}`);
  console.log('========================================================================\n');
  return true;
};

module.exports = {
  sendOutbreakEmail
};
