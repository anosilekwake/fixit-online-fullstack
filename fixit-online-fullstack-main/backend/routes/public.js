// routes/public.js
import { Router, json } from "express";
const router = Router();
import { submit, mpesaStk, mpesaStkCallback } from "../controllers/publicController";

router.post("/submit", submit);
router.post("/mpesa/stk", mpesaStk);
router.post("/mpesa/stk/callback", json(), mpesaStkCallback); // Daraja will POST JSON
export default router;
