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
exports.registerUser = void 0;
const db_1 = __importDefault(require("../config/db"));
const jwtService_1 = __importDefault(require("../services/jwtService"));
const cryptoService_1 = __importDefault(require("../services/cryptoService"));
const responseWrapper_1 = require("../utilities/responseWrapper");
const registerUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ContactNumber, Name, ReferralCode = '' } = req.body;
        if (!ContactNumber || !Name) {
            return (0, responseWrapper_1.errorResponse)(res, 'Contact number and name are required');
        }
        const existingUser = yield (0, db_1.default)('ZufyUserData').where({ ContactNumber }).first();
        if (existingUser) {
            return (0, responseWrapper_1.errorResponse)(res, 'This contact is already in use');
        }
        const validReferral = ReferralCode &&
            ((yield (0, db_1.default)('CouponsTable').where({ CouponCode: ReferralCode }).first()) ||
                (yield (0, db_1.default)('ZufyUserData').where({ UserCode: ReferralCode }).first()));
        if (ReferralCode !== '' && !validReferral) {
            return (0, responseWrapper_1.errorResponse)(res, 'Invalid Referral/Coupon code');
        }
        const encryptedPassword = cryptoService_1.default.encrypt(ContactNumber); // Password = ContactNumber (encrypted)
        const userPayload = {
            ContactNumber,
            Name,
            ReferralCode: ReferralCode || null,
            Password: encryptedPassword,
            CreatedDate: new Date(),
            IsActive: true
        };
        yield (0, db_1.default)('ZufyUserData').insert(userPayload);
        yield (0, db_1.default)('UserWallet').insert({
            UserMobileNo: ContactNumber,
            UserAmountInWallet: '0',
            UserWalletId: generateWalletId()
        });
        yield (0, db_1.default)('UserFeedBackInfo').insert({
            MobileNo: ContactNumber,
            FiveStar: 1,
            FourStar: 0,
            ThreeStar: 0,
            TwoStar: 0,
            OneStar: 0,
            TotalRatingGet: 0
        });
        const token = jwtService_1.default.generateToken({ mobile: ContactNumber });
        return (0, responseWrapper_1.successResponse)(res, 'Signup successful', { token });
    }
    catch (err) {
        console.error('Register Error:', err);
        return (0, responseWrapper_1.errorResponse)(res, 'Internal Server Error', 500, 'Server Error');
    }
});
exports.registerUser = registerUser;
function generateWalletId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
