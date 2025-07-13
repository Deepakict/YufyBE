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
const registerUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = req.body;
    const mobile = data.ContactNumber;
    const existingUser = yield (0, db_1.default)('ZufyUserData').where({ ContactNumber: mobile }).first();
    if (existingUser) {
        res.status(400).json({ error: 'This contact is already in use' });
        return;
    }
    const validReferral = (yield (0, db_1.default)('CouponsTables').where({ CouponCode: data.ReferralCode }).first())
        || (yield (0, db_1.default)('ZufyUserData').where({ UserCode: data.ReferralCode }).first());
    if (!validReferral && data.ReferralCode !== '') {
        res.status(400).json({ error: 'Invalid Referral/Coupon code' });
        return;
    }
    // Add user
    const encryptedPassword = cryptoService_1.default.encrypt(data.Password);
    const userPayload = Object.assign(Object.assign({}, data), { Password: encryptedPassword, CreatedDate: new Date() });
    yield (0, db_1.default)('ZufyUserData').insert(userPayload);
    // Create wallet
    yield (0, db_1.default)('UserWallets').insert({
        UserMobileNo: mobile,
        UserAmountInWallet: '0',
        UserWalletId: generateWalletId()
    });
    // Add feedback entry
    yield (0, db_1.default)('UserFeedBackInfo').insert({
        MobileNo: mobile,
        FiveStar: 1,
        FourStar: 0,
        ThreeStar: 0,
        TwoStar: 0,
        OneStar: 0,
        TotalRatingGet: 0
    });
    const token = jwtService_1.default.generateToken({ mobile });
    res.status(200).json({ message: 'Signup successful', token });
});
exports.registerUser = registerUser;
function generateWalletId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
