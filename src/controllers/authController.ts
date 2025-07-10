import { Request, Response } from 'express';
import otpService from '../services/otpService';
import jwtService from '../services/jwtService';
import db from '../config/db';
import { successResponse, errorResponse } from '../utilities/responseWrapper';


export const sendOtp = async (req: Request, res: Response): Promise<void> => {
  const { ContactNumber } = req.body;

  if (!ContactNumber) {
    errorResponse(res, 'Mobile is required', 400);
    return;
  }

  const existingUser = await db('ZufyUserData')
    .where({ ContactNumber })
    .first();

  const type = existingUser ? 'login' : 'signup';
  const dltContentId = process.env.DLT_TEMPLATE_ID || '';

  await otpService.generateAndSendOtp(ContactNumber, dltContentId, type);

  successResponse(res, 'OTP sent successfully', { ContactNumber, type });
};


export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  const { mobile, otp,type } = req.body;

  console.log('📨 Received OTP verification for mobile:', mobile);

  const isValid = await otpService.verifyOtp(mobile, otp,type);

  console.log('✅ OTP valid status:', isValid);

  if (!isValid) {
    errorResponse(res, 'Invalid or expired OTP', 401, 'Unauthorized');
    return;
  }

  const user = await db('ZufyUserData').where({ ContactNumber: mobile }).first();
  console.log('👤 Queried user:', user);

  if (!user || Object.keys(user).length === 0) {
    successResponse(res, 'OTP verified. User not registered.', {
      isNewUser: true,
      mobile,
      nextStep: 'register'
    });
    return;
  }

  const ReferralAmount = await db('GeneralSettings')
    .where({ title: 'ReferralAmount' })
    .first();

  const SupportSetting = await db('OfferSettings')
    .where({ status: 'Support' })
    .first();

  const token = jwtService.generateToken({ mobile });

  successResponse(res, 'OTP verified. Login successful.', {
    isNewUser: false,
    token,
    role: user.RoleId,
    UserContactNumber: user.ContactNumber,
    UserName: user.Name,
    email: user.EmailId,
    HouseSize: user.HouseSize,
    ReferCode: user.UserCode,
    ReferAmount: ReferralAmount?.description || null,
    SupportNo: SupportSetting?.supportedperson || null,
    IsActive: user.IsActive,
    Kyc: user.KYC
  });
};