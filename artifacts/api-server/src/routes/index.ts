import { Router } from "express";
import healthRouter from "./health.js";
import subscriptionsRouter from "./subscriptions.js";
import categoriesRouter from "./categories.js";
import remindersRouter from "./reminders.js";
import dashboardRouter from "./dashboard.js";
import analyticsRouter from "./analytics.js";
import calendarRouter from "./calendar.js";
import settingsRouter from "./settings.js";
import autoImportRouter from "./auto-import.js";
import walletHealthRouter from "./wallet-health.js";
import { seedDefaultCategories } from "./categories.js";

const router = Router();

//Seed default categories on startup (idempotent)
seedDefaultCategories().catch(console.error);

router.use("/healthz", healthRouter);
router.use("/subscriptions", subscriptionsRouter);
router.use("/categories", categoriesRouter);
router.use("/reminders", remindersRouter);
router.use("/dashboard", dashboardRouter);
router.use("/analytics", analyticsRouter);
router.use("/calendar", calendarRouter);
router.use("/settings", settingsRouter);
router.use("/auto-import", autoImportRouter);
router.use("/wallet-health", walletHealthRouter);

export default router;
