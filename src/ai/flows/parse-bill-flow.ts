// src/ai/flows/parse-bill-flow.ts
'use server';
/**
 * @fileOverview An AI agent that parses bill images to extract relevant information.
 *
 * - parseBill - A function that handles the bill parsing process.
 * - ParseBillInput - The input type for the parseBill function.
 * - ParseBillOutput - The return type for the parseBill function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ParseBillInputSchema = z.object({
  billImageUri: z
    .string()
    .describe(
      "An image of a bill, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ParseBillInput = z.infer<typeof ParseBillInputSchema>;

const ParseBillOutputSchema = z.object({
  title: z.string().optional().describe('The title or vendor of the bill (e.g., "Telia", "Vattenfall El").'),
  amount: z.number().optional().describe('The total amount due on the bill as a number.'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional().describe('The due date of the bill in YYYY-MM-DD format.'),
});
export type ParseBillOutput = z.infer<typeof ParseBillOutputSchema>;

export async function parseBill(input: ParseBillInput): Promise<ParseBillOutput> {
  return parseBillFlow(input);
}

const prompt = ai.definePrompt({
  name: 'parseBillPrompt',
  input: {schema: ParseBillInputSchema},
  output: {schema: ParseBillOutputSchema},
  prompt: `You are an expert bill parsing assistant. Analyze the provided bill image carefully.
Your task is to extract the following information:

1.  **Bill Title/Vendor**: Identify the name of the company, service provider, or a concise description of what the bill is for (e.g., "Hyresavi", "Elräkning", "Mobilabonnemang").
2.  **Total Amount Due**: Find the total monetary value that needs to be paid. Extract this as a numerical value only (e.g., if it says "123.45 kr", extract 123.45).
3.  **Due Date**: Determine the date by which the bill must be paid. Crucially, format this date STRICTLY as YYYY-MM-DD. For example, if the bill says "25 mars 2024" or "2024-03-25", you should output "2024-03-25".

If any piece of information is unclear, ambiguous, or not present in the image, please omit that specific field from your response rather than guessing.
Prioritize accuracy.

Bill Image:
{{media url=billImageUri}}`,
});

const parseBillFlow = ai.defineFlow(
  {
    name: 'parseBillFlow',
    inputSchema: ParseBillInputSchema,
    outputSchema: ParseBillOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
