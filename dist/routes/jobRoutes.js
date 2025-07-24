"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jobController_1 = require("../controllers/jobController");
const router = express_1.default.Router();
router.post('/get-jobList', jobController_1.getJobListsOrder);
router.post('/get-suggested-helpers', jobController_1.getSuggestedHelpers);
router.post('/get-helpers-availability', jobController_1.getHelperAvailabilityDetails);
exports.default = router;
