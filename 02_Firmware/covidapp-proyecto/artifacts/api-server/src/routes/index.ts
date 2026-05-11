import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import appointmentsRouter from "./appointments";
import notificationsRouter from "./notifications";
import adminRouter from "./admin";
import therapistRouter from "./therapist";
import nonmedicalAdminRouter from "./nonmedical-admin";
import profileRouter from "./profile";
import resourcesRouter from "./resources";
import tasksRouter from "./tasks";
import medicationsRouter from "./medications";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/appointments", appointmentsRouter);
router.use("/notifications", notificationsRouter);
router.use("/admin", adminRouter);
router.use("/therapist", therapistRouter);
router.use("/nonmedical-admin", nonmedicalAdminRouter);
router.use("/profile", profileRouter);
router.use("/resources", resourcesRouter);
router.use("/tasks", tasksRouter);
router.use("/medications", medicationsRouter);

export default router;
