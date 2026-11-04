
const express = require("express");

const { protect } = require("../middleware/authMiddleware");

const {
    getBusinessProfile,
    saveBusinessProfile
} = require("../controllers/businessController");

const router = express.Router();


router.use(protect);

router.get("/", getBusinessProfile);
router.put("/", saveBusinessProfile);

module.exports = router;
