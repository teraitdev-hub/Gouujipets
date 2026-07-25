import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

// Backend API routes
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/status', (req, res) => {
  res.status(200).json({ service: 'Gouujipets API Backend', status: 'running' });
});

// Serve static build client files
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// SPA fallback for frontend routing
app.use((req, res, next) => {
  if (req.method === 'GET') {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    next();
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Gouujipets Fullstack Server running on port ${PORT}`);
});
