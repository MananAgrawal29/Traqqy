import { Router } from "express";
import healthRouter from "./health";
import subscriptionsRouter from "./subscriptions";
import categoriesRouter from "./categories";
import remindersRouter from "./reminders";
import dashboardRouter from "./dashboard";
import analyticsRouter from "./analytics";
import calendarRouter from "./calendar";
import settingsRouter from "./settings";
import { seedDefaultCategories } from "./categories";

const router = Router();

// Seed default categories on startup (idempotent)
seedDefaultCategories().catch(console.error);

router.use("/healthz", healthRouter);
router.use("/subscriptions", subscriptionsRouter);
router.use("/categories", categoriesRouter);
router.use("/reminders", remindersRouter);
router.use("/dashboard", dashboardRouter);
router.use("/analytics", analyticsRouter);
router.use("/calendar", calendarRouter);
router.use("/settings", settingsRouter);

export default router;
