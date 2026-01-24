import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import marqetaRoutes from './routes/marqeta.js';
import userRoutes from './routes/users.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Increased for image uploads

// Routes
app.use('/api/marqeta', marqetaRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`AccountaBills Backend API`);
});
