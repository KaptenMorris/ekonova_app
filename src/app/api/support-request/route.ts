
// src/app/api/support-request/route.ts
import type { NextRequest } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { issueType, userEmail, message } = body;

    if (!issueType || !userEmail || !message) {
      return Response.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // --- Nodemailer Configuration ---
    // IMPORTANT: These values MUST be set in your environment variables.
    // Do NOT hardcode credentials here.
    const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;

    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
      console.error('SMTP environment variables are not configured.');
      return Response.json({ error: 'Server configuration error for email sending.' }, { status: 500 });
    }
    
    const portNumber = parseInt(SMTP_PORT, 10);
    if (isNaN(portNumber)) {
      console.error('Invalid SMTP_PORT configured.');
      return Response.json({ error: 'Server configuration error: Invalid SMTP port.' }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: portNumber,
      secure: SMTP_SECURE === 'true', // true for 465, false for other ports (like 587 for TLS)
      auth: {
        user: SMTP_USER, // Your email sending address (e.g., no-reply@yourdomain.com or your actual email)
        pass: SMTP_PASS, // Your email password or app-specific password
      },
      // Optional: Add TLS options if needed by your provider, e.g., for self-signed certs (not common)
      // tls: {
      //   rejectUnauthorized: false // Use only for testing with self-signed certs, NOT recommended for production
      // }
    });

    // --- Email Content ---
    const targetEmail = 'info@marius-christensen.se'; // Your target email address
    const subjectPrefix = issueType.charAt(0).toUpperCase() + issueType.slice(1);
    const subject = `Supportärende Ekonova: [${subjectPrefix}]`;

    const textContent = `
      Nytt supportärende från Ekonova-appen:
      ------------------------------------
      Användarens E-post (för svar): ${userEmail}
      Ärendetyp: ${issueType}
      ------------------------------------
      Meddelande:
      ${message}
      ------------------------------------
      UID: (Användare kan lägga till detta manuellt om de önskar)
    `;

    const htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Nytt Supportärende - Ekonova</h2>
          <p><strong>Användarens E-post (för svar):</strong> <a href="mailto:${userEmail}">${userEmail}</a></p>
          <p><strong>Ärendetyp:</strong> ${issueType}</p>
          <hr>
          <p><strong>Meddelande:</strong></p>
          <div style="padding: 10px; border: 1px solid #eee; background-color: #f9f9f9; white-space: pre-wrap;">${message.replace(/\n/g, '<br>')}</div>
          <hr>
          <p style="font-size: 0.9em; color: #555;"><em>Detta meddelande skickades från supportformuläret i Ekonova-appen.</em></p>
        </body>
      </html>
    `;

    // --- Send Email ---
    try {
      await transporter.sendMail({
        from: `"Ekonova Support" <${SMTP_USER}>`, // Sender address (must match authenticated user or be allowed by provider)
        to: targetEmail,
        replyTo: userEmail, // So you can directly reply to the user
        subject: subject,
        text: textContent,
        html: htmlContent,
      });
      console.log(`Support email sent successfully to ${targetEmail} from ${SMTP_USER}`);
      return Response.json({ message: 'Ditt supportärende har skickats! Vi kontaktar dig så snart som möjligt.' });
    } catch (emailError: any) {
      console.error('Failed to send email:', emailError);
      // Log more details from the error if available
      if (emailError.responseCode) console.error('SMTP Response Code:', emailError.responseCode);
      if (emailError.response) console.error('SMTP Response:', emailError.response);
      return Response.json({ error: 'Kunde inte skicka supportärendet på grund av ett serverfel vid e-postutskick.' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error processing support request:', error);
    return Response.json({ error: 'Ett oväntat serverfel inträffade.' }, { status: 500 });
  }
}
