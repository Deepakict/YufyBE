
import express from 'express';
import { bookingOrderNew, trackHelperAvailabilityData, getUpcomingBookingOrder, getAllUserRequests, cancelPendingOrderByUser, updateBookingOrderPaysuccess, assignBookingOrders, updateHelperAvailabilityDefault } from '../controllers/orderController';

const router = express.Router();

router.post('/booking-new-order', bookingOrderNew);
router.post('/trackHelperAvailability', trackHelperAvailabilityData); // Duplicate route, consider removing one
router.post('/upcoming-booking-orders', getUpcomingBookingOrder);
router.post('/allRequests', getAllUserRequests);
router.post('/cancelPendingOrder', cancelPendingOrderByUser);
router.post('/updateBookingOrderPaysuccess', updateBookingOrderPaysuccess);
router.post('/assignBookingOrders', assignBookingOrders);
router.post('/updateHelperAvailabilityDefault', updateHelperAvailabilityDefault);
router.post('/trackHelperAvailability', trackHelperAvailabilityData);
export default router;