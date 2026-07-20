import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import patientAuthRouter from "./patient-auth";
import appointmentsRouter from "./appointments";
import questionnairesRouter from "./questionnaires";
import uploadsRouter from "./uploads";
import doctorRouter from "./doctor";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/patient-auth", patientAuthRouter);
router.use("/appointments", appointmentsRouter);
router.use("/questionnaires", questionnairesRouter);
router.use("/uploads", uploadsRouter);
router.use("/doctor", doctorRouter);
router.use("/admin", adminRouter);

export default router;
