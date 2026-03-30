import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { analyzeVideoJob } from '@/inngest/functions/analyzeVideo';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [analyzeVideoJob],
});
