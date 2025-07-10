import { Request, Response } from 'express';
import db from '../config/db';
import jwtService from '../services/jwtService';
import cryptoService from '../services/cryptoService';

export const registerUser = async (req: Request, res: Response): Promise<void> => {
  const data = req.body;
  const mobile = data.ContactNumber;

  const existingUser = await db('ZufyUserData').where({ ContactNumber: mobile }).first();
  if (existingUser) {
    res.status(400).json({ error: 'This contact is already in use' });
    return;
  }

  const validReferral = await db('CouponsTables').where({ CouponCode: data.ReferralCode }).first()
    || await db('ZufyUserData').where({ UserCode: data.ReferralCode }).first();

  if (!validReferral && data.ReferralCode !== '') {
    res.status(400).json({ error: 'Invalid Referral/Coupon code' });
    return;
  }

  // Add user
  const encryptedPassword = cryptoService.encrypt(data.Password);
  const userPayload = {
    ...data,
    Password: encryptedPassword,
    CreatedDate: new Date()
  };
  await db('ZufyUserData').insert(userPayload);

  // Create wallet
  await db('UserWallets').insert({
    UserMobileNo: mobile,
    UserAmountInWallet: '0',
    UserWalletId: generateWalletId()
  });

  // Add feedback entry
  await db('UserFeedBackInfo').insert({
    MobileNo: mobile,
    FiveStar: 1,
    FourStar: 0,
    ThreeStar: 0,
    TwoStar: 0,
    OneStar: 0,
    TotalRatingGet: 0
  });

  const token = jwtService.generateToken({ mobile });
  res.status(200).json({ message: 'Signup successful', token });
};

function generateWalletId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}