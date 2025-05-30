
import { config } from 'dotenv';
config();

import '@/ai/flows/budget-advisor.ts';
import '@/ai/flows/parse-bill-flow.ts';
import '@/ai/flows/app-faq-flow.ts'; // Added new FAQ flow

