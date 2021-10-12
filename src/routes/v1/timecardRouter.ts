import express from 'express';
const router = express.Router();
import {adminUserCheck, authenticateToken, checkUserLocation} from "../../helper/helper";
import { adminNewTimecardValidation } from '../../validation/timecardValidation'
import {indexTimecard, latestTimecard, commonTimecard, adminNewTimecard, adminDeleteTimecard, excelTimecard} from '../../controllers/timecardController'

router.get("/index/:username/:year/:month", authenticateToken, adminUserCheck, indexTimecard)
router.get("/latest/:username", authenticateToken, latestTimecard)
router.get("/excel/:username/:year/:month", authenticateToken, adminUserCheck, excelTimecard)
router.post("/common", authenticateToken, checkUserLocation, commonTimecard)
router.post("/admin/new", authenticateToken, adminUserCheck, adminNewTimecardValidation, adminNewTimecard)
router.delete("/admin/delete", authenticateToken, adminUserCheck, adminDeleteTimecard)

export default router;
