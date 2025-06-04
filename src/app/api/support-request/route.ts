
// src/app/api/support-request/route.ts
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { issueType, userEmail, message } = body;

    // For now, just log the received data.
    // This is a temporary step to debug a white screen issue.
    console.log("Received support request (nodemailer temporarily disabled):");
    console.log("Issue Type:", issueType);
    console.log("User Email:", userEmail);
    console.log("Message:", message);

    // Simulate email sending success
    return Response.json({ message: 'Ditt meddelande har tagits emot (e-postutskick är temporärt inaktiverat för felsökning).' });
  } catch (error: any) {
    console.error("Error processing support request:", error);
    if (error.message.includes("JSON")) {
        return Response.json({ error: 'Felaktigt format på förfrågan. Förväntade JSON.' }, { status: 400 });
    }
    return Response.json({ error: 'Ett oväntat serverfel inträffade.' }, { status: 500 });
  }
}
