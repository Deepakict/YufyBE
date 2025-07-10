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
exports.verifyOtp = exports.sendOtp = void 0;
const otpService_1 = __importDefault(require("../services/otpService"));
const jwtService_1 = __importDefault(require("../services/jwtService"));
const db_1 = __importDefault(require("../config/db"));
const responseWrapper_1 = require("../utilities/responseWrapper");
const sendOtp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { ContactNumber } = req.body;
    if (!ContactNumber) {
        (0, responseWrapper_1.errorResponse)(res, 'Mobile is required', 400);
        return;
    }
    const existingUser = yield (0, db_1.default)('ZufyUserData')
        .where({ ContactNumber })
        .first();
    const type = existingUser ? 'login' : 'signup';
    const dltContentId = process.env.DLT_TEMPLATE_ID || '';
    yield otpService_1.default.generateAndSendOtp(ContactNumber, dltContentId, type);
    (0, responseWrapper_1.successResponse)(res, 'OTP sent successfully', { ContactNumber, type });
});
exports.sendOtp = sendOtp;
const verifyOtp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { mobile, otp, type } = req.body;
    console.log('📨 Received OTP verification for mobile:', mobile);
    const isValid = yield otpService_1.default.verifyOtp(mobile, otp, type);
    console.log('✅ OTP valid status:', isValid);
    if (!isValid) {
        (0, responseWrapper_1.errorResponse)(res, 'Invalid or expired OTP', 401, 'Unauthorized');
        return;
    }
    const user = yield (0, db_1.default)('ZufyUserData').where({ ContactNumber: mobile }).first();
    console.log('👤 Queried user:', user);
    if (!user || Object.keys(user).length === 0) {
        (0, responseWrapper_1.successResponse)(res, 'OTP verified. User not registered.', {
            isNewUser: true,
            mobile,
            nextStep: 'register'
        });
        return;
    }
    const ReferralAmount = yield (0, db_1.default)('GeneralSettings')
        .where({ title: 'ReferralAmount' })
        .first();
    const SupportSetting = yield (0, db_1.default)('OfferSettings')
        .where({ status: 'Support' })
        .first();
    const token = jwtService_1.default.generateToken({ mobile });
    (0, responseWrapper_1.successResponse)(res, 'OTP verified. Login successful.', {
        isNewUser: false,
        token,
        role: user.RoleId,
        UserContactNumber: user.ContactNumber,
        UserName: user.Name,
        email: user.EmailId,
        HouseSize: user.HouseSize,
        ReferCode: user.UserCode,
        ReferAmount: (ReferralAmount === null || ReferralAmount === void 0 ? void 0 : ReferralAmount.description) || null,
        SupportNo: (SupportSetting === null || SupportSetting === void 0 ? void 0 : SupportSetting.supportedperson) || null,
        IsActive: user.IsActive,
        Kyc: user.KYC
    });
});
exports.verifyOtp = verifyOtp;
