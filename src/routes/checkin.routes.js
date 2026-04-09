import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validate } from "../middlewares/validate.middleware.js";
import { ROLES } from "../constants/roles.js";
import * as checkinController from "../controllers/checkin.controller.js";
import { checkInAlertsListSchema, checkInMyListSchema, checkInPromptSchema, checkInSettingsListSchema, checkInSettingsUpdateSchema, checkInSubmitSchema, checkInSubmissionsListSchema } from "../validators/checkin.validator.js";
import { checkInQuestionCreateSchema, checkInQuestionDeleteSchema, checkInQuestionUpdateSchema, checkInQuestionsListSchema } from "../validators/checkinQuestion.validator.js";

const router = Router();

// Owner/Admin: enable/disable daily check-in per member for a gym.
router.get("/settings", authenticate, authorize(ROLES.OWNER, ROLES.ADMIN), validate(checkInSettingsListSchema), asyncHandler(checkinController.listSettings));
router.put("/settings", authenticate, authorize(ROLES.OWNER, ROLES.ADMIN), validate(checkInSettingsUpdateSchema), asyncHandler(checkinController.updateSetting));

// Asset: enable/disable + view check-ins for allowed gyms.
router.get("/asset/settings", validate(checkInSettingsListSchema), asyncHandler(checkinController.listSettingsByAsset));
router.put("/asset/settings", validate(checkInSettingsUpdateSchema), asyncHandler(checkinController.updateSettingByAsset));

// Member: prompt + submit daily check-in.
router.get("/prompt", authenticate, authorize(ROLES.MEMBER), validate(checkInPromptSchema), asyncHandler(checkinController.getPrompt));
router.post("/daily", authenticate, authorize(ROLES.MEMBER), validate(checkInSubmitSchema), asyncHandler(checkinController.submitDaily));
router.get("/my", authenticate, authorize(ROLES.MEMBER), validate(checkInMyListSchema), asyncHandler(checkinController.listMine));

// Owner/Admin: view submitted check-ins.
router.get("/submissions", authenticate, authorize(ROLES.OWNER, ROLES.ADMIN), validate(checkInSubmissionsListSchema), asyncHandler(checkinController.listSubmissions));
router.get("/asset/submissions", validate(checkInSubmissionsListSchema), asyncHandler(checkinController.listSubmissionsByAsset));

// Owner/Admin: manage custom questions per gym.
router.get("/questions", authenticate, authorize(ROLES.OWNER, ROLES.ADMIN), validate(checkInQuestionsListSchema), asyncHandler(checkinController.listQuestions));
router.post("/questions", authenticate, authorize(ROLES.OWNER, ROLES.ADMIN), validate(checkInQuestionCreateSchema), asyncHandler(checkinController.createQuestion));
router.patch("/questions/:questionId", authenticate, authorize(ROLES.OWNER, ROLES.ADMIN), validate(checkInQuestionUpdateSchema), asyncHandler(checkinController.updateQuestion));
router.delete("/questions/:questionId", authenticate, authorize(ROLES.OWNER, ROLES.ADMIN), validate(checkInQuestionDeleteSchema), asyncHandler(checkinController.deleteQuestion));

// Owner/Admin: view unexpected answers (alerts).
router.get("/alerts", authenticate, authorize(ROLES.OWNER, ROLES.ADMIN), validate(checkInAlertsListSchema), asyncHandler(checkinController.listAlerts));

export default router;
