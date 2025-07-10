import db from '../config/db';
import axios from 'axios';

const OTP_EXPIRY_MINUTES = 5;

interface UserOtpRecord {
  id: number;
  mobile: string;
  otp: string;
  expiresAt: Date;
  verified: boolean;
  type: string;
  created_at: Date;
  updated_at: Date;
}

// ✅ 4-digit OTP generator
const generateOtp = (): string => Math.floor(1000 + Math.random() * 9000).toString();

// ✅ Send SMS via CERF API
async function sendSmsViaCerf(
  mobile: string,
  messageText: string,
  dltId: string
): Promise<boolean> {
  try {
    const loginRes = await axios.post(
      'https://cerf.cerfgs.com/runway/api/auth/login',
      {
        username: 'Yufy_trans',
        password: 'Admin@123',
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const token: string | undefined = loginRes.data?.data?.token;
    if (!token) throw new Error('Token missing in auth response');

    const encodedMessage = encodeURIComponent(messageText);
    const url = `https://cerf.cerfgs.com/cpaas?unicode=false&from=YUFYIN&to=${mobile}&dltContentId=${dltId}&text=${encodedMessage}`;

    await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return true;
  } catch (err: any) {
    console.error('SMS send error:', err.message || err);
    return false;
  }
}

// ✅ Generate OTP, store in DB, and send via SMS
const generateAndSendOtp = async (
  mobile: string,
  dltContentId: string,
  type: string = 'login'
): Promise<string> => {
  const otp: string = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
// const otp: string = '1234'; // For testing, use a fixed OTP
  // Store in DB
  await db('UserOtps').insert({
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

  const sent = await sendSmsViaCerf(mobile, messageText, dltContentId);
  if (!sent) {
    throw new Error('Failed to send OTP via SMS');
  }

  return otp;
};

// ✅ Verify OTP based on mobile + type (scoped OTP)
const verifyOtp = async (
  mobile: string,
  otp: string,
  type: string = 'login'
): Promise<boolean> => {
  const record: UserOtpRecord | undefined = await db<UserOtpRecord>('UserOtps')
    .where({ mobile, otp, verified: false, type })
    .andWhere('expiresAt', '>', new Date())
    .orderBy('created_at', 'desc')
    .first();

    console.log('🔍 OTP verification record:', record)  ;

  if (!record) return false;

  await db('UserOtps').where({ id: record.id }).update({ verified: true });
  return true;
};

export default {
  generateAndSendOtp,
  verifyOtp,
};