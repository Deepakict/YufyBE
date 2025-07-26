
import express from 'express';
import { bookingOrderNew, trackHelperAvailabilityData, getUpcomingBookingOrder, getAllUserRequests, cancelPendingOrderByUser } from '../controllers/orderController';

const router = express.Router();

router.post('/booking-new-order', bookingOrderNew);
router.post('/trackHelperAvailability', trackHelperAvailabilityData); // Duplicate route, consider removing one
router.post('/upcoming-booking-orders', getUpcomingBookingOrder);
router.post('/allRequests', getAllUserRequests);
router.post('/cancelPendingOrder', cancelPendingOrderByUser);
export default router;