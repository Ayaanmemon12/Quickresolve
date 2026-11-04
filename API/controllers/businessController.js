
const crypto = require("crypto");
const Business = require("../models/Business");


const getBusinessProfile = async (req, res) => {
    try {
        const business = await Business.findOne({
            user: req.user._id
        });

        if (!business) {
            return res.status(404).json({
                message: "Business profile not found."
            });
        }


        if (!business.publicId) {
            business.publicId = crypto.randomUUID();
            await business.save();
        }

        return res.status(200).json({
            business: {
                _id: business._id,
                name: business.name,
                description: business.description,
                publicId: business.publicId
            }
        });
    } catch (error) {
        console.error("Get business profile error:", error);

        return res.status(500).json({
            message: "Unable to retrieve business profile."
        });
    }
};


const saveBusinessProfile = async (req, res) => {
    try {
        const { name, description = "" } = req.body;

        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                message: "Business name is required."
            });
        }

        if (typeof description !== "string") {
            return res.status(400).json({
                message: "Business description must be text."
            });
        }


        let business = await Business.findOne({
            user: req.user._id
        });

        if (business) {

            business.name = name.trim();
            business.description = description.trim();


            if (!business.publicId) {
                business.publicId = crypto.randomUUID();
            }

            await business.save();
        } else {

            business = await Business.create({
                user: req.user._id,
                name: name.trim(),
                description: description.trim(),
                publicId: crypto.randomUUID()
            });
        }

        return res.status(200).json({
            message: "Business profile saved successfully.",
            business: {
                _id: business._id,
                name: business.name,
                description: business.description,
                publicId: business.publicId
            }
        });
    } catch (error) {
        console.error("Save business profile error:", error);

        if (error.name === "ValidationError") {
            return res.status(400).json({
                message: error.message
            });
        }

        if (error.code === 11000) {
            return res.status(409).json({
                message: "A duplicate business identifier was detected."
            });
        }

        return res.status(500).json({
            message: "Unable to save business profile."
        });
    }
};

module.exports = {
    getBusinessProfile,
    saveBusinessProfile
};
