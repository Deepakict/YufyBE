"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUserAuthenticated = isUserAuthenticated;
const axios_1 = __importDefault(require("axios"));
// Simulating environment service (replace with real config if needed)
const environmentService = {
    ifProduction: () => false, // Set to `true` in production
    getValue: (key) => process.env[key]
};
// Custom error (optional, can use plain strings if preferred)
class NotAuthenticatedError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NotAuthenticatedError';
    }
}
// ✅ Auth middleware to validate access token
function isUserAuthenticated() {
    return (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        if (!environmentService.ifProduction()) {
            return next(); // Skip validation in dev
        }
        const { at } = req.headers;
        if (!at) {
            res.status(401).json({ error: 'Unauthorized: Missing access token' });
            return;
        }
        try {
            const response = yield axios_1.default.post(environmentService.getValue('VALIDATION_URL'), null, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                params: { token: at }
            });
            const { active } = response.data;
            if (!active) {
                res.status(401).json({ error: 'Unauthorized: Token not active' });
                return;
            }
            return next();
        }
        catch (err) {
            console.error('Auth error:', err);
            res.status(401).json({ error: 'Unauthorized: Token validation failed' });
            return;
        }
    });
}
