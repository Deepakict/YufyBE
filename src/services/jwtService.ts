import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'supersecret';

const generateToken = (payload: object) => {
  return jwt.sign(payload, SECRET, { expiresIn: '1h' });
};

const verifyToken = (token: string) => {
  return jwt.verify(token, SECRET);
};

export default {
  generateToken,
  verifyToken
};