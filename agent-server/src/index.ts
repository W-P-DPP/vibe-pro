


import express, { Router } from "express";
import { getMenu } from "./siteMenu/siteMenu.controller.ts";

const router:Router = express.Router();
// router.use("/tag",tagRouter)
router.get("/getMenu",getMenu)

export default router;
