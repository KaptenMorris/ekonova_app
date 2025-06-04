
// src/app/api/support-request/route.ts
import type { NextRequest } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { issueType, userEmail, message } = body;

    console.log("API Route /api/support-request received a POST request.");
    console.log("Received support request data:", body);

    if (!issueType || !userEmail || !message) {
      console.error("API Error: Missing required fields in support request.", body);
      return Response.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // --- Nodemailer Configuration ---
    const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;

    console.log("Attempting to read SMTP environment variables...");
    console.log(`SMTP_HOST: ${SMTP_HOST ? 'Set' : 'NOT SET'}`);
    console.log(`SMTP_PORT: ${SMTP_PORT ? 'Set' : 'NOT SET'}`);
    console.log(`SMTP_SECURE: ${SMTP_SECURE ? 'Set' : 'NOT SET'}`);
    console.log(`SMTP_USER: ${SMTP_USER ? 'Set' : 'NOT SET'}`);
    console.log(`SMTP_PASS: ${SMTP_PASS ? 'Set (length hidden for security)' : 'NOT SET'}`);


    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
      console.error('API Error: Crucial SMTP environment variables are not configured on the server.');
      console.error('Required: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.');
      return Response.json({ error: 'Server configuration error for email sending. Admin needs to set SMTP variables.' }, { status: 500 });
    }
    
    const portNumber = parseInt(SMTP_PORT, 10);
    if (isNaN(portNumber)) {
      console.error('API Error: Invalid SMTP_PORT configured. Must be a number. Value received:', SMTP_PORT);
      return Response.json({ error: 'Server configuration error: Invalid SMTP port format.' }, { status: 500 });
    }

    console.log("Attempting to create nodemailer transporter with the following config (password is hidden for security):");
    console.log(`Host: ${SMTP_HOST}, Port: ${portNumber}, Secure: ${SMTP_SECURE === 'true'}, User: ${SMTP_USER}`);
    
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: portNumber,
      secure: SMTP_SECURE === 'true', // Convert string "true" to boolean true
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      // logger: true, // Enable for very verbose SMTP logs if needed for deep debugging
      // debug: true,
    });
    console.log("Nodemailer transporter object created.");

    // --- Email Content ---
    const targetEmail = 'info@marius-christensen.se';
    const subjectPrefix = issueType.charAt(0).toUpperCase() + issueType.slice(1);
    const subject = `Supportärende Ekonova: [${subjectPrefix}] från ${userEmail}`;

    const textContent = `
      Nytt supportärende från Ekonova-appen:
      ------------------------------------
      Avsändarens E-post (för svar): ${userEmail}
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
          <p><strong>Avsändarens E-post (för svar):</strong> <a href="mailto:${userEmail}">${userEmail}</a></p>
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
      console.log("Email send attempt finished by nodemailer.sendMail. Response from SMTP server:", mailInfo);
      
      if (mailInfo.accepted && mailInfo.accepted.includes(targetEmail)) {
        console.log(`Support email successfully sent to ${targetEmail}. Message ID: ${mailInfo.messageId}`);
        return Response.json({ message: 'Ditt supportärende har skickats! Vi kontaktar dig så snart som möjligt.' });
      } else if (mailInfo.rejected && mailInfo.rejected.length > 0) {
        console.error(`NODEMAILER_REJECTED: Email was rejected by the SMTP server for ${mailInfo.rejected.join(', ')}. Full response:`, mailInfo);
        return Response.json({ error: `E-postservern avvisade meddelandet. Orsak: ${mailInfo.response || 'Okänd'}` }, { status: 500 });
      } else {
        console.log(`Support email sending process completed, but acceptance unclear. Message ID: ${mailInfo.messageId}. Response: ${mailInfo.response}`);
        return Response.json({ message: 'Ditt supportärende har tagits emot för bearbetning. Status från e-postservern var oklar.' });
      }

    } catch (emailError: any) {
      console.error('NODEMAILER_SEND_ERROR: Failed to send email using transporter.sendMail.', emailError);
      if (emailError.responseCode) console.error('SMTP Response Code from error:', emailError.responseCode);
      if (emailError.response) console.error('SMTP Response from error:', emailError.response);
      
      let userFriendlyError = `Kunde inte skicka supportärendet. Detaljer: ${emailError.message || 'Okänt serverfel vid e-postutskick.'}`;
      if (emailError.code === 'EENVELOPE' || emailError.code === 'ESOCKET' || emailError.code === 'ECONNREFUSED') {
        userFriendlyError = "Kunde inte ansluta till e-postservern. Kontrollera SMTP_HOST och SMTP_PORT, samt att servern är tillgänglig.";
      } else if (emailError.code === 'EAUTH') {
        userFriendlyError = "Autentiseringsfel med e-postservern. Kontrollera SMTP_USER och SMTP_PASS.";
      }
      return Response.json({ error: userFriendlyError }, { status: 500 });
    }

  } catch (error: any) {
    console.error('GENERAL_API_ERROR: Error processing support request in POST handler.', error);
    return Response.json({ error: `Ett oväntat serverfel inträffade: ${error.message || 'Okänt fel'}` }, { status: 500 });
  }
}
