import Anthropic from '@anthropic-ai/sdk';

// Server only. The one instance in the project, required by the SDK.
// An empty key still constructs the client; calls then fail and are reported as errors.
export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' });
