
const express = require("express");

const { protect } = require("../middleware/authMiddleware");

const {
    createFAQ,
    getFAQs,
    updateFAQ,
    deleteFAQ
} = require("../controllers/faqController");

const router = express.Router();


router.use(protect);


router.route("/")
    .post(createFAQ)
    .get(getFAQs);


router.route("/:id")
    .put(updateFAQ)
    .delete(deleteFAQ);

module.exports = router;
