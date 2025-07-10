
import express from 'express';
import { bookingOrderNew, trackHelperAvailabilityData } from '../controllers/orderController';

const router = express.Router();

router.post('/booking-new-order', bookingOrderNew);
router.post('/trackHelperAvailability', trackHelperAvailabilityData); // Duplicate route, consider removing one


export default router;