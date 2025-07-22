
import express from 'express';
import { addPaymentRequestNew, getRazorpayKeys, getUserWalletInfo } from '../controllers/paymentController';

const router = express.Router();

router.post('/get-user-wallet-info', getUserWalletInfo);
router.get('/get-razor-key', getRazorpayKeys);
router.post('/add-payment-request', addPaymentRequestNew); 
// ✅ correct



export default router;