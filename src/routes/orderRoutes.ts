
import express from 'express';
import { bookingOrderNew, getUpcomingBookingOrder, getAllUserRequests, cancelPendingOrderByUser, updateBookingOrderPaysuccess, assignBookingOrders, bookingFlowCombined, cancelBookingOrder, getPastUserRequests } from '../controllers/orderController';

const router = express.Router();

// router.post('/booking-new-order', bookingOrderNew);
router.post('/upcoming-booking-orders', getUpcomingBookingOrder);
router.post('/past-booking-orders',getPastUserRequests)
router.post('/allRequests', getAllUserRequests);
router.post('/cancelPendingOrder', cancelPendingOrderByUser);
router.post('/updateBookingOrderPaysuccess', updateBookingOrderPaysuccess);
router.post('/assignBookingOrders', assignBookingOrders);
router.post('/booking-new-order', bookingFlowCombined);
router.post('/cancel-booking-order', cancelBookingOrder);

export default router;