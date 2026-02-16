export const config = {
	runtime: 'nodejs', // Use standard Node.js runtime
};

// Import the Express app creation logic
// Note: We use the existing server.js but avoid starting the listener
import { createServer } from '../src/interfaces/web/server.js';

const { app } = createServer();

// Vercel expects a default export of the request handler
export default app;
