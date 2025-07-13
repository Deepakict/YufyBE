"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes")); // ✅ Make sure file name matches exactly
const jobRoutes_1 = __importDefault(require("./routes/jobRoutes")); // ✅ Make sure file name matches exactly
const zoneRoutes_1 = __importDefault(require("./routes/zoneRoutes")); // ✅ Make sure file name matches exactly
const walletRoutes_1 = __importDefault(require("./routes/walletRoutes")); // ✅ Make sure file name matches exactly
const orderRoutes_1 = __importDefault(require("./routes/orderRoutes")); // ✅ Make sure file name matches exactly
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/api/auth', authRoutes_1.default); // Prefix all auth routes with /api/auth
app.use('/api/job', jobRoutes_1.default); // Prefix all auth routes with /api/auth
app.use('/api/zone', zoneRoutes_1.default); // Prefix all auth routes with /api/auth
app.use('/api/wallet', walletRoutes_1.default);
app.use('/api/order', orderRoutes_1.default);
exports.default = app;
