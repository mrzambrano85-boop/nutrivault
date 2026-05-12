import { Router, type IRouter } from "express";
import healthRouter from "./health";
import iaRouter from "./ia";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/", iaRouter);

export default router;
