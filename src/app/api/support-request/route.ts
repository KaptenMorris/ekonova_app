
// src/app/api/support-request/route.ts
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { issueType, userEmail, message } = body;

    if (!issueType || !userEmail || !message) {
      return Response.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // Log the received data (simulating processing)
    console.log('Received support request:');
    console.log('Issue Type:', issueType);
    console.log('User Email:', userEmail);
    console.log('Message:', message);

    // Simulate a delay for email sending
    await new Promise(resolve => setTimeout(resolve, 500));

    // **
    // ** TODO: Implement actual email sending logic here. **
    // **
    // You'll need an email sending service (e.g., SendGrid, Mailgun, Resend)
    // and a library like Nodemailer. This requires server-side setup and credentials.
    //
    // Example using Nodemailer (conceptual - requires setup and credentials):
    //
    // import nodemailer from 'nodemailer';
    //
    // const transporter = nodemailer.createTransport({
    //   host: process.env.SMTP_HOST, // Store in .env.local
    //   port: parseInt(process.env.SMTP_PORT || "587"),
    //   secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    //   auth: {
    //     user: process.env.SMTP_USER, // Your email sending address
    //     pass: process.env.SMTP_PASS, // Your email password or app-specific password
    //   },
    // });
    //
    // try {
    //   const mailOptions = {
    //     from: `"Ekonova Support" <${process.env.SMTP_USER}>`, // Sender address
    //     to: 'info@marius-christensen.se', // Your target email
    //     replyTo: userEmail, // User's email for easy reply
    //     subject: `Support Request [${issueType.toUpperCase()}]: Ekonova App`,
    //     text: `From: ${userEmail}\n\nIssue Type: ${issueType}\n\nMessage:\n${message}`,
    //     html: `
    //       <h2>Support Request - Ekonova</h2>
    //       <p><strong>From:</strong> ${userEmail}</p>
    //       <p><strong>Issue Type:</strong> ${issueType}</p>
    //       <hr>
    //       <p><strong>Message:</strong></p>
    //       <p style="white-space: pre-wrap;">${message}</p>
    //     `,
    //   };
    //   await transporter.sendMail(mailOptions);
    //   console.log('Email sent successfully (simulated for now)');
    //   return Response.json({ message: 'Ditt supportärende har skickats! Vi kontaktar dig så snart som möjligt.' });
    //
    // } catch (emailError) {
    //   console.error('Failed to send email:', emailError);
    //   return Response.json({ error: 'Kunde inte skicka supportärendet på grund av ett serverfel.' }, { status: 500 });
    // }

    // For now, just return a success message assuming the email "would have been sent"
    return Response.json({ message: 'Ditt supportärende har tagits emot och kommer att behandlas. (E-postutskick simulerat)' });

  } catch (error) {
    console.error('Error processing support request:', error);
    return Response.json({ error: 'Ett oväntat serverfel inträffade.' }, { status: 500 });
  }
}
