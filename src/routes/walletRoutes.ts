
import express from 'express';
import { getRazorpayKeys, getUserWalletInfo } from '../controllers/paymentController';

const router = express.Router();

router.post('/get-user-wallet-info', getUserWalletInfo);
router.get('/get-razor-key', getRazorpayKeys);



export default router;