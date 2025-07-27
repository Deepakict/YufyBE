
import express from 'express';
import { bookingOrderNew, getUpcomingBookingOrder, getAllUserRequests, cancelPendingOrderByUser, updateBookingOrderPaysuccess, assignBookingOrders, bookingFlowCombined } from '../controllers/orderController';

const router = express.Router();

// router.post('/booking-new-order', bookingOrderNew);
router.post('/upcoming-booking-orders', getUpcomingBookingOrder);
router.post('/allRequests', getAllUserRequests);
router.post('/cancelPendingOrder', cancelPendingOrderByUser);
router.post('/updateBookingOrderPaysuccess', updateBookingOrderPaysuccess);
router.post('/assignBookingOrders', assignBookingOrders);
router.post('/booking-new-order', bookingFlowCombined);


export default router;