
import express from 'express';
import { getZoneHelpers } from '../controllers/zoneController';

const router = express.Router();

router.post('/get-zone-helpers', getZoneHelpers);


export default router;