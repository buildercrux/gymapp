import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as transactionController from "../controllers/transaction.controller.js";
import { createTransactionSchema, listTransactionsSchema, transactionIdSchema, updateTransactionSchema } from "../validators/transaction.validator.js";

const router = Router();

router.get("/", authenticate, authorize("owner", "admin"), validate(listTransactionsSchema), asyncHandler(transactionController.listTransactions));
router.post(
  "/create",
  authenticate,
  authorize("owner", "admin"),
  validate(createTransactionSchema),
  asyncHandler(transactionController.createTransaction),
);
router.delete(
  "/:transactionId",
  authenticate,
  authorize("owner", "admin"),
  validate(transactionIdSchema),
  asyncHandler(transactionController.deleteTransaction),
);
router.put(
  "/:transactionId",
  authenticate,
  authorize("owner", "admin"),
  validate(updateTransactionSchema),
  asyncHandler(transactionController.updateTransaction),
);

export default router;
