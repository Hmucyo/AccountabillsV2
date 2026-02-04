import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import marqetaRoutes from '../routes/marqeta.js';
import userRoutes from '../routes/users.js';

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:3000',
    'https://accountabills.vercel.app',
    'https://accountabills-hm0b99f71-intseans-projects.vercel.app',
    /\.vercel\.app$/  // Allow all vercel.app subdomains
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/marqeta', marqetaRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'AccountaBills Backend API', status: 'running' });
});

export default app;
