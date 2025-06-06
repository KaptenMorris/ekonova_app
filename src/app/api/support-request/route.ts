
// src/app/api/support-request/route.ts
import type { NextRequest } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { issueType, userEmail, message } = body;

    if (!issueType || !userEmail || !message) {
      return Response.json({ error: 'Alla fält (ärendetyp, e-post, meddelande) är obligatoriska.' }, { status: 400 });
    }

    // --- Nodemailer Configuration ---
    // VIKTIGT: Dessa värden MÅSTE konfigureras i dina miljövariabler (.env.local eller serverns miljövariabler)
    // Använd ALDRIG känsliga uppgifter direkt i koden.
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER, // Din SMTP-användare (t.ex. e-postadressen du skickar från)
        pass: process.env.SMTP_PASS, // Ditt SMTP-lösenord (t.ex. app-lösenord för Gmail)
      },
      tls: {
        // do not fail on invalid certs (useful for some local development, remove for production)
        // rejectUnauthorized: process.env.NODE_ENV === 'production', 
      }
    });

    const emailFrom = process.env.EMAIL_FROM || '"Ekonova Support" <no-reply@ekonova.app>';
    const emailTo = process.env.EMAIL_TO || 'info@marius-christensen.se'; // Din supportadress

    const mailOptions = {
      from: emailFrom,
      to: emailTo,
      replyTo: userEmail, // Sätt svarsadressen till användarens e-post
      subject: `Nytt Supportärende från Ekonova: ${issueType}`,
      text: `Nytt supportärende mottaget:\n\nTyp av ärende: ${issueType}\nFrån E-post: ${userEmail}\nMeddelande:\n${message}`,
      html: `
        <h2>Nytt Supportärende Mottaget</h2>
        <p><strong>Typ av ärende:</strong> ${issueType}</p>
        <p><strong>Från E-post:</strong> <a href="mailto:${userEmail}">${userEmail}</a></p>
        <h3>Meddelande:</h3>
        <p style="white-space: pre-wrap;">${message}</p>
        <hr>
        <p><em>Detta meddelande skickades från Ekonovas supportformulär.</em></p>
      `,
    };

    // Kontrollera om SMTP-uppgifter är konfigurerade innan försök att skicka
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn("SMTP-uppgifter är inte fullständigt konfigurerade i miljövariablerna. E-postutskick simuleras.");
      // Logga det som skulle ha skickats (för utvecklingsändamål)
      console.log("--- SIMULERAT E-POSTUTSKICK ---");
      console.log("Från:", mailOptions.from);
      console.log("Till:", mailOptions.to);
      console.log("Ämne:", mailOptions.subject);
      console.log("Textinnehåll:", mailOptions.text);
      console.log("---------------------------------");
      return Response.json({ message: 'Ditt meddelande har tagits emot (SMTP ej konfigurerat, utskick simulerat).' });
    }

    // Skicka e-post
    try {
      await transporter.sendMail(mailOptions);
      return Response.json({ message: 'Tack! Ditt meddelande har skickats. Vi återkommer så snart som möjligt.' });
    } catch (mailError: any) {
      console.error("Nodemailer sendMail error:", mailError);
      // Logga specifika Nodemailer-fel för enklare felsökning
      let errorMessage = 'Kunde inte skicka e-postmeddelandet. Försök igen senare.';
      if (mailError.code === 'EENVELOPE') {
        errorMessage = 'Felaktig mottagar- eller avsändaradress konfigurerad.';
      } else if (mailError.code === 'EAUTH') {
        errorMessage = 'Autentisering med e-postservern misslyckades. Kontrollera SMTP_USER och SMTP_PASS.';
      } else if (mailError.code === 'ECONNREFUSED') {
        errorMessage = 'Kunde inte ansluta till e-postservern. Kontrollera SMTP_HOST och SMTP_PORT.';
      }
      return Response.json({ error: errorMessage, details: mailError.message }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Global error processing support request:", error);
    if (error.message && error.message.includes("JSON")) {
        return Response.json({ error: 'Felaktigt format på förfrågan. Förväntade JSON.' }, { status: 400 });
    }
    return Response.json({ error: 'Ett oväntat serverfel inträffade vid hantering av din förfrågan.' }, { status: 500 });
  }
}
