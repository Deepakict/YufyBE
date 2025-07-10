import express from 'express';
import authRoutes from './routes/authRoutes'; // ✅ Make sure file name matches exactly
import jobRoutes from './routes/jobRoutes'; // ✅ Make sure file name matches exactly
import zoneRoutes from './routes/zoneRoutes'; // ✅ Make sure file name matches exactly
import walletRoutes from './routes/walletRoutes'; // ✅ Make sure file name matches exactly
import orderRoutes from './routes/orderRoutes'; // ✅ Make sure file name matches exactly

const app = express();

app.use(express.json());
app.use('/api/auth', authRoutes); // Prefix all auth routes with /api/auth
app.use('/api/job', jobRoutes); // Prefix all auth routes with /api/auth
app.use('/api/zone', zoneRoutes); // Prefix all auth routes with /api/auth
app.use('/api/wallet',walletRoutes)
app.use('/api/order',orderRoutes)

export default app;