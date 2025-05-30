// src/ai/flows/budget-advisor.ts
'use server';

/**
 * @fileOverview An AI agent that provides personalized budget optimization recommendations.
 *
 * - getBudgetRecommendations - A function that generates budget optimization recommendations.
 * - BudgetRecommendationsInput - The input type for the getBudgetRecommendations function.
 * - BudgetRecommendationsOutput - The return type for the getBudgetRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const BudgetRecommendationsInputSchema = z.object({
  income: z.number().describe('The total income of the user.'),
  expenses: z.number().describe('The total expenses of the user.'),
  debt: z.number().describe('The total debt of the user.'),
  expenseCategories: z
    .record(z.number())
    .describe(
      'A map of expense categories and their corresponding amounts. Example: {Boende: 1000, Transport: 200, Matvaror: 500}.'
    ),
});
export type BudgetRecommendationsInput = z.infer<typeof BudgetRecommendationsInputSchema>;

const BudgetRecommendationsOutputSchema = z.object({
  recommendations: z.string().describe('Personalized budget optimization recommendations.'),
});
export type BudgetRecommendationsOutput = z.infer<typeof BudgetRecommendationsOutputSchema>;

export async function getBudgetRecommendations(
  input: BudgetRecommendationsInput
): Promise<BudgetRecommendationsOutput> {
  return getBudgetRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'budgetRecommendationsPrompt',
  input: {schema: BudgetRecommendationsInputSchema},
  output: {schema: BudgetRecommendationsOutputSchema},
  prompt: `You are a personal finance advisor. Analyze the user's financial data and provide personalized recommendations for optimizing their budget in Swedish.

Here's the user's financial data:

Total Income: {{income}} kr
Total Expenses: {{expenses}} kr
Total Debt: {{debt}} kr
Expense Categories:
{{#each expenseCategories}}
  - {{@key}}: {{this}} kr
{{/each}}

Provide specific, actionable recommendations to help the user improve their financial well-being. Focus on reducing expenses and managing debt.
In the format of Swedish.`,
});

const getBudgetRecommendationsFlow = ai.defineFlow(
  {
    name: 'getBudgetRecommendationsFlow',
    inputSchema: BudgetRecommendationsInputSchema,
    outputSchema: BudgetRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
