import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ordersRouter from "./orders";
import driversRouter from "./drivers";
import dashboardRouter from "./dashboard";
import activitiesRouter from "./activities";
import alertsRouter from "./alerts";
import resetRequestsRouter from "./reset-requests";
import reviewsRouter from "./reviews";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/orders", ordersRouter);
router.use("/drivers", driversRouter);
router.use("/drivers", reviewsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/activities", activitiesRouter);
router.use("/alerts", alertsRouter);
router.use("/reset-requests", resetRequestsRouter);

export default router;
