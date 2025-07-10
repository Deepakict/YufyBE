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
const db_1 = __importDefault(require("../config/db"));
const axios_1 = __importDefault(require("axios"));
const OTP_EXPIRY_MINUTES = 5;
// ✅ 4-digit OTP generator
const generateOtp = () => Math.floor(1000 + Math.random() * 9000).toString();
// ✅ Send SMS via CERF API
function sendSmsViaCerf(mobile, messageText, dltId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            const loginRes = yield axios_1.default.post('https://cerf.cerfgs.com/runway/api/auth/login', {
                username: 'Yufy_trans',
                password: 'Admin@123',
            }, {
                headers: { 'Content-Type': 'application/json' },
            });
            const token = (_b = (_a = loginRes.data) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.token;
            if (!token)
                throw new Error('Token missing in auth response');
            const encodedMessage = encodeURIComponent(messageText);
            const url = `https://cerf.cerfgs.com/cpaas?unicode=false&from=YUFYIN&to=${mobile}&dltContentId=${dltId}&text=${encodedMessage}`;
            yield axios_1.default.get(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            return true;
        }
        catch (err) {
            console.error('SMS send error:', err.message || err);
            return false;
        }
    });
}
// ✅ Generate OTP, store in DB, and send via SMS
const generateAndSendOtp = (mobile_1, dltContentId_1, ...args_1) => __awaiter(void 0, [mobile_1, dltContentId_1, ...args_1], void 0, function* (mobile, dltContentId, type = 'login') {
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    // const otp: string = '1234'; // For testing, use a fixed OTP
    // Store in DB
    yield (0, db_1.default)('UserOtps').insert({
        mobile,
        otp,
        expiresAt,
        verified: false,
        type,
    });
    // 🧠 Build message OUTSIDE the send function
    let messageText = '';
    if (type === 'signup' || type === 'login') {
        messageText = `${otp}  is the OTP for Yufy registration. Please do not share your OTP with anyone.`;
    }
    const sent = yield sendSmsViaCerf(mobile, messageText, dltContentId);
    if (!sent) {
        throw new Error('Failed to send OTP via SMS');
    }
    return otp;
});
// ✅ Verify OTP based on mobile + type (scoped OTP)
const verifyOtp = (mobile_1, otp_1, ...args_1) => __awaiter(void 0, [mobile_1, otp_1, ...args_1], void 0, function* (mobile, otp, type = 'login') {
    const record = yield (0, db_1.default)('UserOtps')
        .where({ mobile, otp, verified: false, type })
        .andWhere('expiresAt', '>', new Date())
        .orderBy('created_at', 'desc')
        .first();
    console.log('🔍 OTP verification record:', record);
    if (!record)
        return false;
    yield (0, db_1.default)('UserOtps').where({ id: record.id }).update({ verified: true });
    return true;
});
exports.default = {
    generateAndSendOtp,
    verifyOtp,
};
