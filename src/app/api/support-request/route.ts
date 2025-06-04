
// src/app/api/support-request/route.ts
import type { NextRequest } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { issueType, userEmail, message } = body;

    console.log("Received support request API call. Body:", body);

    if (!issueType || !userEmail || !message) {
      console.error("API Error: Missing required fields in support request.", body);
      return Response.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // --- Nodemailer Configuration ---
    const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;

    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
      console.error('API Error: SMTP environment variables are not configured.');
      return Response.json({ error: 'Server configuration error for email sending. SMTP variables missing.' }, { status: 500 });
    }
    
    const portNumber = parseInt(SMTP_PORT, 10);
    if (isNaN(portNumber)) {
      console.error('API Error: Invalid SMTP_PORT configured. Must be a number.');
      return Response.json({ error: 'Server configuration error: Invalid SMTP port.' }, { status: 500 });
    }

    console.log("Attempting to create nodemailer transporter...");
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: portNumber,
      secure: SMTP_SECURE === 'true', 
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      // Debugging options for nodemailer (optional, can be noisy)
      // logger: true, 
      // debug: true, 
    });
    console.log("Nodemailer transporter created.");

    // --- Email Content ---
    const targetEmail = 'info@marius-christensen.se';
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
      console.log(`Preparing to send email to ${targetEmail} from ${SMTP_USER} via ${SMTP_HOST}:${SMTP_PORT}...`);
      const mailInfo = await transporter.sendMail({
        from: `"Ekonova Support" <${SMTP_USER}>`,
        to: targetEmail,
        replyTo: userEmail,
        subject: subject,
        text: textContent,
        html: htmlContent,
      });
      console.log("Email send attempt finished. Nodemailer response:", mailInfo);
      console.log(`Support email potentially sent successfully. Message ID: ${mailInfo.messageId}`);
      return Response.json({ message: 'Ditt supportärende har skickats! Vi kontaktar dig så snart som möjligt.' });
    } catch (emailError: any) {
      console.error('NODEMAILER_SEND_ERROR: Failed to send email.', emailError);
      if (emailError.responseCode) console.error('SMTP Response Code:', emailError.responseCode);
      if (emailError.response) console.error('SMTP Response:', emailError.response);
      return Response.json({ error: `Kunde inte skicka supportärendet på grund av ett serverfel vid e-postutskick. Felkod: ${emailError.code || 'Okänd'}` }, { status: 500 });
    }

  } catch (error: any) {
    console.error('GENERAL_API_ERROR: Error processing support request.', error);
    return Response.json({ error: `Ett oväntat serverfel inträffade: ${error.message || 'Okänt fel'}` }, { status: 500 });
  }
}
