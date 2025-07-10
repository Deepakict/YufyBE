"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes")); // ✅ Make sure file name matches exactly
const jobRoutes_1 = __importDefault(require("./routes/jobRoutes")); // ✅ Make sure file name matches exactly
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/api/auth', authRoutes_1.default); // Prefix all auth routes with /api/auth
app.use('/api/job', jobRoutes_1.default); // Prefix all auth routes with /api/auth
exports.default = app;
