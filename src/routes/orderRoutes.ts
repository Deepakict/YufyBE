
import express from 'express';
import { bookingOrderNew, trackHelperAvailabilityData, getUpcomingBookingOrder, getAllUserRequests } from '../controllers/orderController';

const router = express.Router();

router.post('/booking-new-order', bookingOrderNew);
router.post('/trackHelperAvailability', trackHelperAvailabilityData); // Duplicate route, consider removing one
router.post('/upcoming-booking-orders', getUpcomingBookingOrder);
router.post('/allRequests', getAllUserRequests);

export default router;