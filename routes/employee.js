const express = require("express");
const router = express.Router();
const poolPromise = require("../util/connnectionPromise");    // local_
const poolPromise2 = require("../util/connnectionPromise2");  // egpaidco_neo
const poolPromise3 = require("../util/connectionPromise3");  // egpaidco_merchant_data
const md5 = require("md5");
const uuid = require("uuid");
const SALT = process.env.SALT;
const axios = require("axios");
const crypto = require("crypto");
const smsapi = require("../globalfunction/sms");
const {
    savevirtualaccount
} = require("../globalfunction/savevirtualaccount");
const requireStaffLogin = require("../middleware/requireEmpLogin");
const requireLogin = require("../middleware/requireLogin");
const path = require("path");
const multer = require("multer");
const moment = require("moment-timezone");
const qs = require('qs');
const {getSecretKeyAndTimeStamp,checkDetails}= require("../globalfunction/getSecretKey");


// Configure multer storage for file uploads
const storages = multer.diskStorage({
    destination: "./assets/image/employeedosc",
    filename: (req, file, cb) => {
        return cb(
            null,
            `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`
        );
    }
});

const upload = multer({
    storage: storages,
    fileFilter: (req, file, cb) => {
        const allowedFileTypes = /jpeg|jpg|png|pdf|text/; // Adjust the allowed file types as per your requirements
        const extname = allowedFileTypes.test(
            path.extname(file.originalname).toLowerCase()
        );
        const mimetype = allowedFileTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb("Error: Only jpeg, jpg, png, and pdf files are allowed.");
        }
    },
});

// Configure multer storage for file uploads
const storages2 = multer.diskStorage({
    destination: "./assets/image/userkycdocs",
    filename: (req, file, cb) => {
        return cb(
            null,
            `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`
        );
    },
});

const upload2 = multer({
    storage: storages2,
    fileFilter: (req, file, cb) => {
        const allowedFileTypes = /jpeg|jpg|png|pdf|text/; // Adjust the allowed file types as per your requirements
        const extname = allowedFileTypes.test(
            path.extname(file.originalname).toLowerCase()
        );
        const mimetype = allowedFileTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb("Error: Only jpeg, jpg, png, and pdf files are allowed.");
        }
    },
});

// Configure multer storage for file uploads
const storages3 = multer.diskStorage({
    destination: "./assets/image/userdocs",
    filename: (req, file, cb) => {
        return cb(
            null,
            `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`
        );
    },
});

const upload3 = multer({
    storage: storages3,
    fileFilter: (req, file, cb) => {
        const allowedFileTypes = /jpeg|jpg|png|pdf|text/; // Adjust the allowed file types as per your requirements
        const extname = allowedFileTypes.test(
            path.extname(file.originalname).toLowerCase()
        );
        const mimetype = allowedFileTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb("Error: Only jpeg, jpg, png, and pdf files are allowed.");
        }
    },
});


router.get("/get-app-navigation", requireStaffLogin, async (req, res) => {
    try {
        // Use promise-based connection
        const connection = await poolPromise().getConnection();
        const {
            designation
        } = req.staff;

        try {
            const sql =
                "SELECT * FROM app_navigation WHERE parent_id = ? AND designation = ? AND status = 'Enable' ORDER BY orderby";
            const value = [0, designation];

            const [parent_menu] = await connection.query(sql, value);

            const menu = [];
            for (let i = 0; i < parent_menu.length; i++) {
                const parent_id = parent_menu[i].id;
                const sql1 =
                    "SELECT * FROM app_navigation WHERE parent_id = ? AND designation = ? AND status = 'Enable' ORDER BY orderby";
                const value1 = [parent_id, designation];

                const [submenu] = await connection.query(sql1, value1);

                const data = {
                    parent_menu: parent_menu[i],
                    sub_menu: submenu,
                };
                menu.push(data);
            }

            return res
                .status(200)
                .json({
                    status_code: "1",
                    status: "success",
                    menu: menu
                });
        } catch (err) {
            console.error(err);
            return res
                .status(422)
                .json({
                    status_code: "2",
                    status: "fail",
                    error: err.message
                });
        } finally {
            // Release the connection
            if (connection) {
                await connection.release();
            }
        }
    } catch (err) {
        return res
            .status(422)
            .json({
                status_code: "2",
                status: "fail",
                error: err.message
            });
    }
});

router.post("/update-profile-photo", requireStaffLogin, upload.single("profile_photo"),
    async (req, res) => {
        try {
            // Extract Required Information
            const {
                unique_id
            } = req.staff;
            const filename = req.file.filename;
            console.log(req.file);

            // Validate Input
            if (!unique_id || !req.file) {
                return res
                    .status(400)
                    .json({
                        status_code: "2",
                        status: "failed",
                        message: "Invalid input",
                    });
            }

            // Validate File Type for profile_photo specifically
            if (req.file.fieldname === "profile_photo") {
                const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
                if (!allowedTypes.includes(req.file.mimetype)) {
                    return res.status(400).json({
                        status_code: "2",
                        status: "failed",
                        message: "Invalid file format. Only JPEG, JPG, and PNG files are allowed for profile photos.",
                    });
                }
            }

            // Update Database
            const connection = await poolPromise().getConnection();
            try {
                const query =
                    "UPDATE staff_data SET profile_photo = ? WHERE unique_id = ?";
                await connection.query(query, [filename, unique_id]);

                // Return Response
                res.json({
                    status_code: "1",
                    status: "success",
                    message: "Profile photo successfully updated",
                });
            } catch (error) {
                console.error(error);
                res.status(500).json({
                    status_code: "2",
                    status: "failed",
                    message: "Internal server error",
                });
            } finally {
                // Release the connection back to the pool
                await connection.release();
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({
                status_code: "2",
                status: "failed",
                message: "Internal server error",
            });
        }
    }
);

//Attendance start
router.post("/start-work", requireStaffLogin, upload.single("selfie"),
    async (req, res) => {
        try {
            const staffId = req.staff.unique_id;
            const selfieFilename = req.file.filename;
            const {
                deviceId,
                coordinates,
                ip,
                os
            } = req.body;

            // Get current time and date
            const currentDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
            const currentTime = new Date().toTimeString().slice(0, 5); // HH:MM

            // Validate File Type for profile_photo specifically
            if (req.file.fieldname === "selfie") {
                const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
                if (!allowedTypes.includes(req.file.mimetype)) {
                    return res.status(400).json({
                        status_code: "2",
                        status: "failed",
                        message: "Invalid file format. Only JPEG, JPG, and PNG files are allowed for profile photos.",
                    });
                }
            }

            const connection = await poolPromise().getConnection();
            try {
                // Check for existing check-in today
                const [checkInExists] = await connection.query(
                    "SELECT COUNT(*) FROM attendance WHERE unique_id = ? AND date = ? AND type = ?",
                    [staffId, currentDate, "IN"]
                );

                if (checkInExists[0]["COUNT(*)"] > 0) {
                    return res.status(400).json({
                        status_code: "2",
                        status: "failed",
                        message: "Check-in already exists for today.",
                    });
                }

                const query =
                    "INSERT INTO attendance (unique_id, type, date, time, selfie, coordinates, ip, device_Id, os) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
                const result = await connection.query(query, [
                    staffId,
                    "IN", // this is a "Start Work" entry type
                    currentDate,
                    currentTime,
                    selfieFilename,
                    coordinates,
                    ip,
                    deviceId,
                    os,
                ]);

                res.json({
                    status_code: "1",
                    status: "success",
                    message: "Check In Successfully",
                });
            } catch (error) {
                console.error(error);
                res.status(500).json({
                    status_code: "2",
                    status: "failed",
                    message: "Internal server error",
                });
            } finally {
                // Release the connection back to the pool
                await connection.release();
            }
        } catch (error) {
            console.error(error);
            res.status(400).json({
                status_code: "2",
                status: "failed",
                message: "Invalid request data",
            });
        }
    }
);

router.post("/end-work", requireStaffLogin,
    upload.single("selfie"),
    async (req, res) => {
        try {
            const staffId = req.staff.unique_id;
            const selfieFilename = req.file.filename;
            const {
                deviceId,
                coordinates,
                ip,
                os
            } = req.body;

            const currentDate = new Date().toISOString().slice(0, 10);
            const currentTime = new Date().toTimeString().slice(0, 5);

            // Validate File Type for profile_photo specifically
            if (req.file.fieldname === "selfie") {
                const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
                if (!allowedTypes.includes(req.file.mimetype)) {
                    return res.status(400).json({
                        status_code: "2",
                        status: "failed",
                        message: "Invalid file format. Only JPEG, JPG, and PNG files are allowed for profile photos.",
                    });
                }
            }

            const connection = await poolPromise().getConnection();
            try {
                // Check for existing check-in today (required for check-out)
                const [checkInExists] = await connection.query(
                    "SELECT COUNT(*) FROM attendance WHERE unique_id = ? AND date = ? AND type = ?",
                    [staffId, currentDate, "IN"]
                );

                if (checkInExists[0]["COUNT(*)"] === 0) {
                    return res.status(400).json({
                        status_code: "2",
                        status: "failed",
                        message: "No check-in found for today.",
                    });
                }

                // Check for existing check-out today (prevent multiple check-outs)
                const [checkOutExists] = await connection.query(
                    "SELECT COUNT(*) FROM attendance WHERE unique_id = ? AND date = ? AND type = ?",
                    [staffId, currentDate, "OUT"]
                );

                if (checkOutExists[0]["COUNT(*)"] > 0) {
                    return res.status(400).json({
                        status_code: "2",
                        status: "failed",
                        message: "Check-out already exists for today.",
                    });
                }

                // Proceed with check-out
                const query =
                    "INSERT INTO attendance (unique_id, type, date, time, selfie, coordinates, ip, device_Id, os) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
                const result = await connection.query(query, [
                    staffId,
                    "OUT", // this is an "End Work" entry type
                    currentDate,
                    currentTime,
                    selfieFilename,
                    coordinates,
                    ip,
                    deviceId,
                    os,
                ]);

                res.json({
                    status_code: "1",
                    status: "success",
                    message: "Check Out Successfully",
                });
            } catch (error) {
                console.error(error);
                res.status(500).json({
                    status_code: "2",
                    status: "failed",
                    message: "Internal server error",
                });
            } finally {
                // Release the connection back to the pool
                await connection.release();
            }
        } catch (error) {
            console.error(error);
            res.status(400).json({
                status_code: "2",
                status: "failed",
                message: "Invalid request data",
            });
        }
    }
);

router.get("/today-attendance", requireStaffLogin, async (req, res) => {
    try {
        const staffId = req.staff.unique_id;
        const currentDate = new Date().toISOString().slice(0, 10);

        const connection = await poolPromise().getConnection();
        try {
            const query = "SELECT * FROM attendance WHERE unique_id = ? AND date = ?";
            const [result] = await connection.query(query, [staffId, currentDate]);

            if (!result || result.length === 0) {
                return res.json({
                    status_code: "1",
                    status: "success",
                    message: "No attendance found today. Please check-in.",
                });
            }

            res.json({
                status_code: "1",
                status: "success",
                data: result
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                status_code: "2",
                status: "failed",
                message: "Internal server error",
            });
        } finally {
            await connection.release();
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({
            status_code: "2",
            status: "failed",
            message: "Invalid request data",
        });
    }
});

router.get("/attendance-count", requireStaffLogin, async (req, res) => {
    try {
        const staffId = req.staff.unique_id;
        const currentMonthDate = new Date();
        const currentMonth = currentMonthDate.toISOString().slice(0, 7);
        const firstDayOfMonth = new Date(currentMonth + "-01")
            .toISOString()
            .slice(0, 10);
        const lastDayOfMonth = new Date(
                new Date(currentMonth + "-01").setMonth(
                    currentMonthDate.getMonth() + 1,
                    0
                )
            )
            .toISOString()
            .slice(0, 10);

        const connection = await poolPromise().getConnection();
        try {
            const query = `
        SELECT status, COUNT(*) AS count
        FROM attendance
        WHERE unique_id = ? AND date >= ? AND date < ? AND type = 'IN'
          AND status IN ('Pending', 'Reject', 'Approved')
        GROUP BY status
      `;
            const [result] = await connection.query(query, [
                staffId,
                firstDayOfMonth,
                lastDayOfMonth,
            ]);

            const attendanceCounts = {};
            result.forEach((row) => {
                attendanceCounts[row.status] = row.count;
            });

            res.json({
                status_code: "1",
                status: "success",
                data: attendanceCounts
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                status_code: "2",
                status: "failed",
                message: "Internal server error",
            });
        } finally {
            await connection.release();
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({
            status_code: "2",
            status: "failed",
            message: "Invalid request data",
        });
    }
});

//Attendance end

//LEAVE start

router.get("/fetch-leave-records", requireStaffLogin, async (req, res) => {
    try {
        const staffId = req.staff.unique_id;

        const connection = await poolPromise().getConnection();
        try {
            const query = "SELECT * FROM `leave` WHERE unique_id = ?";
            const [results] = await connection.query(query, [staffId]);

            if (results.length === 0) {
                return res.status(404).json({
                    status_code: "2",
                    status: "failed",
                    message: "No Leave record found.",
                });
            }
            console.log(results);

            const formattedResults = results.map((record) => ({
                unique_id: record.unique_id,
                todate: record.todate.toISOString().slice(0, 10),
                fromdate: record.fromdate.toISOString().slice(0, 10),
                reason: record.reason,
                coordinates: record.coordinates,
                status: record.status,
                update_by: record.update_by,
                timestamp: record.timestamp,
                condition: record.condition,
            }));

            return res
                .status(200)
                .json({
                    status_code: "1",
                    status: "success",
                    data: formattedResults
                });
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                status_code: "2",
                status: "failed",
                message: "Internal server error",
            });
        } finally {
            await connection.release();
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status_code: "2",
            status: "failed",
            message: "Internal server error",
        });
    }
});

router.post("/ask-for-leave", requireStaffLogin, async (req, res) => {
    try {
        const {
            todate,
            fromdate,
            reason,
            coordinates
        } = req.body;
        const {
            unique_id,
            name
        } = req.staff;

        // Validate Input
        const requiredFields = ["todate", "fromdate", "reason", "coordinates"];
        if (!requiredFields.every((field) => field in req.body)) {
            return res.status(400).json({
                status_code: "2",
                status: "failed",
                message: "Missing required fields",
            });
        }

        // Validate Dates
        const todateObj = new Date(todate);
        const fromdateObj = new Date(fromdate);
        if (isNaN(todateObj.getTime()) || isNaN(fromdateObj.getTime())) {
            return res.status(400).json({
                status_code: "2",
                status: "failed",
                message: "Invalid date format",
            });
        }

        // Check Starting Date Validity
        const applyDate = new Date(); // Get current date
        if (fromdateObj <= applyDate) {
            return res.status(400).json({
                status_code: "2",
                status: "failed",
                message: "Leave starting date cannot be in the past",
            });
        }

        // Format date for database storage
        const formattedToDate = todateObj.toISOString().slice(0, 10);
        const formattedFromDate = fromdateObj.toISOString().slice(0, 10);

        const connection = await poolPromise().getConnection();
        try {
            const query =
                "INSERT INTO `leave` (unique_id, todate, fromdate, reason, coordinates, status, update_by) VALUES (?, ?, ?, ?, ?, ?, ?)";
            await connection.query(query, [
                unique_id,
                formattedToDate,
                formattedFromDate,
                reason,
                coordinates,
                "Pending",
                name,
            ]);

            // Return Response
            res.json({
                status_code: "1",
                status: "success",
                message: "Leave request submitted successfully",
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                status_code: "2",
                status: "failed",
                message: "Internal server error",
            });
        } finally {
            await connection.release();
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            status_code: "2",
            status: "failed",
            message: "Internal server error",
        });
    }
});

//LEAVE end

//Onboard New Distributor start

router.post("/search-distributor", requireStaffLogin, async (req, res) => {
    const connection = await poolPromise().getConnection();
    try {
        const {
            mobile_number
        } = req.body;
        const emp_id = req.staff.emp_id;
        // Check if distributor data is available in login_data table
        const [distributorData] = await connection.query(
            "SELECT * FROM login WHERE mobile_number = ? ",
            [mobile_number]
        );

        if (distributorData.length > 0) {
            const statusCode = distributorData[0].status;

            switch (statusCode) {
                case "6":
                    // Distributor Onboard is Pending, generate OTP
                    const otp = Math.floor(100000 + Math.random() * 900000).toString();
                    const saltedOTP = SALT.concat(otp);
                    const hashedOTP = md5(saltedOTP);

                    // Update OTP in the database
                    await connection.query("UPDATE login SET otp = ? WHERE id = ?", [
                        hashedOTP,
                        distributorData[0].id,
                    ]);

                    // Send OTP to distributor mobile
                    smsapi("admin", "otp_send", mobile_number, otp, `3 min`);

                    connection.release();
                    return res.status(200).json({
                        status_code: "15",
                        status: "pending",
                        unique_id: distributorData[0].unique_id,
                        message: "OTP Successfully Sent To Distributor Registered Mobile Number.",
                    });

                case "5":
                    // Distributor Onboard is Pending
                    connection.release();
                    return res.status(200).json({
                        status_code: "16",
                        status: "pending",
                        application_id: distributorData[0].application_id,
                        message: "Distributor Onboard is Pending.",
                    });

                case "4":
                    // Distributor KYC is Pending
                    connection.release();
                    return res.status(200).json({
                        status_code: "17",
                        status: "success",
                        application_id: distributorData[0].application_id,
                        message: "Distributor KYC is Pending.",
                    });

                case "3":
                    // Distributor Territory assigned is Pending
                    connection.release();
                    return res.status(200).json({
                        status_code: "18",
                        status: "success",
                        application_id: distributorData[0].application_id,
                        message: "Assign Distributor Territory.",
                    });

                case "2":
                case "1":
                    // Distributor Account is Active
                    connection.release();
                    return res.status(200).json({
                        status_code: "2",
                        status: "failed",
                        message: "Distributor Account is Already Registered.",
                    });

                case "0":
                    // Suspended
                    connection.release();
                    return res.status(200).json({
                        status_code: "2",
                        status: "failed",
                        message: "Distributor Account is Suspended.",
                    });

                default:
                    connection.release();
                    return res.status(200).json({
                        status_code: "2",
                        status: "failed",
                        message: "Invalid Account Status.",
                    });
            }
        }

        // Distributor data not available, insert mobile number and generate OTP
        const uniqueId = uuid.v4();
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const saltedOTP = SALT.concat(otp);
        const hashedOTP = md5(saltedOTP);

        // Insert mobile number in login_data table
        await connection.query("INSERT INTO login SET ?", {
            user_type: "Distributor",
            unique_id: uniqueId,
            mobile_number: mobile_number,
            otp: hashedOTP,
            status: "6",
            customer_id: Math.floor(100000 + Math.random() * 900000).toString(),
            application_id: Math.floor(100000 + Math.random() * 900000).toString(),
            created_date: new Date(),
            created_by: emp_id,
            asm_id: emp_id,
        });

        smsapi("admin", "otp_send", mobile_number, otp, `3 min`);

        connection.release();

        return res.status(200).json({
            status_code: "15",
            status: "success",
            unique_id: uniqueId,
            message: "OTP Successfully Sent To Distributor Registered Mobile Number.",
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({
            status_code: "2",
            status: "failed",
            message: "Internal Server Error",
        });
    } finally {
        connection.release();
    }
});

router.post("/otp-verification", requireStaffLogin, async (req, res) => {
    const connection = await poolPromise().getConnection();

    try {
        const {
            unique_id,
            otp
        } = req.body;
        const emp_id = req.staff.emp_id;

        // Check if the OTP is valid
        const [userData] = await connection.query(
            "SELECT * FROM login WHERE unique_id = ? AND otp = ?",
            [unique_id, md5(SALT.concat(otp))]
        );

        if (userData.length === 0) {
            connection.release();
            return res.status(200).json({
                status_code: "2",
                status: "failed",
                message: "Invalid OTP.",
            });
        }
        if (userData[0].status === "5") {
            connection.release();
            return res.status(200).json({
                status_code: "2",
                status: "failed",
                message: "Distributor already verified.",
            });
        }

        // OTP is successfully verified, generate customer id and update status in login_data table

        const application_id = Date.now();
        const customer_id =
            String(emp_id).slice(0, 4) +
            Math.floor(10000 + Math.random() * 90000).toString();

        // Update customer_id, application_id, and status in login_data table
        await connection.query(
            "UPDATE `login` SET customer_id = ?, application_id = ?, status = ? WHERE unique_id = ?",
            [customer_id, application_id, "5", unique_id]
        );

        connection.release();

        return res.status(200).json({
            status_code: "16",
            status: "success",
            application_id: application_id,
            message: "Onboard Distributor.",
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status_code: "2",
            status: "failed",
            message: "Internal Server Error",
        });
    } finally {
        connection.release();
    }
});

router.post("/distributor-onboard", requireStaffLogin, async (req, res) => {
    const connection = await poolPromise().getConnection();
    const connection2 = await poolPromise2().getConnection();

    try {
        const {
            application_id,
            name,
            email,
            date_of_birth,
            pan_number,
            aadhar_number,
            residential_address,
            entity_type,
            trade_name,
            legal_name,
            gst_number,
            date_of_registration,
            registration_no,
            offices_address,
        } = req.body;

        // Check if the distributor with the given application id exists
        const [existingDistributor] = await connection.query(
            "SELECT * FROM distributor WHERE pan_number = ?",
            [pan_number]
        );
        const [loginDistributor] = await connection.query(
            "SELECT * FROM login WHERE application_id = ?",
            [application_id]
        );

        if (loginDistributor.length === 0) {
            connection.release();
            return res.status(200).json({
                status_code: "2",
                status: "failed",
                message: "Distributor with the provided application id does not already exists.",
            });
        }
        const unique_id = loginDistributor[0].unique_id;

        if (existingDistributor.length > 0) {
            connection.release();
            return res.status(200).json({
                status_code: "2",
                status: "failed",
                message: "Distributor with the provided application id already exists.",
            });
        }

        // Update distributor data in the distributor table
        await connection.query(
            "INSERT INTO distributor (unique_id, name, email, date_of_birth, pan_number, aadhar_number, residential_address, entity_type, trade_name, legal_name, gst_number, date_of_registration, registration_no, offices_address, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                unique_id,
                name,
                email,
                date_of_birth,
                pan_number,
                aadhar_number,
                JSON.stringify(residential_address),
                entity_type,
                trade_name,
                legal_name,
                gst_number,
                date_of_registration,
                registration_no,
                JSON.stringify(offices_address),
                "KYC-Not Submitted", // Default status
            ]
        );

        // Update wallet data in the wallet table
        await connection2.query(
            "INSERT INTO wallet (user_type, unique_id, wallet, hold, unsettle, created_date, status) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP(), ?)",
            ["Distributor", unique_id, 0, 0, 0, "Enable"]
        );

        // Update status in the login_data table
        await connection.query(
            "UPDATE login SET status = ? WHERE application_id = ?",
            ["4", application_id]
        );

        connection.release();

        return res.status(200).json({
            status_code: "17",
            status: "success",
            application_id,
            message: "Successfully Onboard Distributor, Onboard Distributor KYC",
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status_code: "2",
            status: "failed",
            message: "Internal Server Error",
        });
    } finally {
        connection.release();
        connection2.release();
    }
});

router.post("/onboard-distributor-kyc", requireStaffLogin, upload2.fields([{
            name: "photo",
            maxCount: 1
        },
        {
            name: "pan_front",
            maxCount: 1
        },
        {
            name: "aadhar_front",
            maxCount: 1
        },
        {
            name: "aadhar_back",
            maxCount: 1
        },
        {
            name: "board_resolution",
            maxCount: 1
        },
        {
            name: "registration_certificate",
            maxCount: 1
        },
    ]),
    async (req, res) => {
        const connection = await poolPromise().getConnection();

        try {
            const {
                application_id
            } = req.body;

            const [loginDistributor] = await connection.query(
                "SELECT * FROM login WHERE application_id = ?",
                [application_id]
            );

            if (loginDistributor.length === 0) {
                connection.release();
                return res.status(200).json({
                    status_code: "2",
                    status: "failed",
                    message: "Distributor with the provided application id does not already exists.",
                });
            }
            const unique_id = loginDistributor[0].unique_id;

            // Check if the distributor with the given application id exists
            const [existingDistributor] = await connection.query(
                "SELECT * FROM distributor WHERE unique_id = ?",
                [unique_id]
            );

            if (existingDistributor.length === 0) {
                connection.release();
                return res.status(200).json({
                    status_code: "2",
                    status: "failed",
                    message: "Distributor with the provided application id does not exist.",
                });
            }

            // Upload KYC documents and get file paths
            const photoPath = req.files["photo"] ?
                req.files["photo"][0].filename :
                null;
            const panFrontPath = req.files["pan_front"] ?
                req.files["pan_front"][0].filename :
                null;
            const aadharFrontPath = req.files["aadhar_front"] ?
                req.files["aadhar_front"][0].filename :
                null;
            const aadharBackPath = req.files["aadhar_back"] ?
                req.files["aadhar_back"][0].filename :
                null;
            const boardResolutionPath = req.files["board_resolution"] ?
                req.files["board_resolution"][0].filename :
                null;
            const regCertificatePath = req.files["registration_certificate"] ?
                req.files["registration_certificate"][0].filename :
                null;

            // Update distributor data in the distributor table
            await connection.query(
                "UPDATE distributor SET photo = ?, pan_front = ?, aadhar_front = ?, aadhar_back = ?, board_resolution = ?, reg_certificate = ?, status = ? WHERE unique_id = ?",
                [
                    photoPath,
                    panFrontPath,
                    aadharFrontPath,
                    aadharBackPath,
                    boardResolutionPath,
                    regCertificatePath,
                    "KYC-Pending",
                    unique_id,
                ]
            );

            // Change status code in login_data table from 4 to 3
            await connection.query(
                "UPDATE login SET status = ? WHERE application_id = ?",
                ["3", application_id]
            );

            connection.release();

            return res.status(200).json({
                status_code: "18",
                status: "success",
                application_id,
                message: "Activated Distributor Territory",
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                status_code: "2",
                status: "failed",
                message: "Internal Server Error",
            });
        } finally {
            connection.release();
        }
    }
);


router.post("/assign-territory", requireStaffLogin, async (req, res) => {
    const connection = await poolPromise().getConnection();

    try {
        const {
            application_id,
            territory
        } = req.body; // territory:"pin"
        const asm_unique_id = req.staff.unique_id;
        console.log(asm_unique_id);

        const [loginDistributor] = await connection.query(
            "SELECT * FROM login WHERE application_id = ? AND status = ?",
            [application_id, "3"]
        );

        const [ASMteritory] = await connection.query(
            "SELECT district FROM territory WHERE unique_id = ? AND status = 'Enable' ",
            [asm_unique_id, "3"]
        );
        if (ASMteritory.length === 0) {
            return res.status(200).json({
                status_code: "2",
                status: "failed",
                message: "ASM/SM territory not found.",
            });
        }
        const ASMdata = ASMteritory.map(({
                district
            }) =>
            district.toLowerCase()
        )

        if (loginDistributor.length === 0) {
            connection.release();
            return res.status(200).json({
                status_code: "2",
                status: "failed",
                message: "Distributor with the provided application id does not already exists or status not match.",
            });
        }
        const unique_id = loginDistributor[0].unique_id;

        const [DistributorData] = await connection.query(
            "SELECT name FROM distributor WHERE unique_id = ?",
            [unique_id]
        );

        const pin_data = await pin_code(Number(territory));

        if (ASMdata.includes(pin_data[0].district.toLowerCase())) {
            // console.log(pin_data, "dataaaaaaaaaaa");
            // Extracting territory data for bulk insert
            var bulkInsertData = pin_data.map(({
                area_name,
                district,
                state
            }) => [
                unique_id,
                String(territory),
                area_name,
                district,
                state,
                "Distributor",
                "Enable",
            ]);

        } else {
            return res.status(200).json({
                status_code: "2",
                status: "failed",
                message: "ASM/SM territory not match with pin code.",
            })
        }

        // Bulk insert territory data into the territory table
        await connection.query(
            "INSERT INTO territory (unique_id, pincode, area, district, state, user_type, status) VALUES ?",
            [bulkInsertData]
        );

        // Change status code in login_data table from 3 to 2
        await connection.query("UPDATE login SET status = ? WHERE unique_id = ?", [
            "2",
            unique_id,
        ]);

        // Send OTP to distributor mobile
        smsapi("admin", "distributor_on-boarded", loginDistributor[0].mobile_number, DistributorData[0].name);

        connection.release();

        return res.status(200).json({
            status_code: "1",
            status: "success",
            message: "Distributor Successfully Registered",
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status_code: "2",
            status: "failed",
            message: "Internal Server Error",
        });
    } finally {
        connection.release();
    }
});

router.get("/fetch_distributor", requireStaffLogin, async (req, res) => {

    const emp_id = req.staff.emp_id;

    // Use promise-based connection
    const connection = await poolPromise().getConnection();
    try {
        // Fetch distributor details from login table and distributor table
        const sql = `
      SELECT 
        l.application_id, 
        l.mobile_number, 
        d.name, 
        d.trade_name, 
        d.status 
      FROM 
        login l 
      JOIN 
        distributor d ON l.unique_id = d.unique_id 
      WHERE 
        l.user_type = 'Distributor' 
        AND 
        l.asm_id = ?`;

        const [distributors] = await connection.query(sql, [emp_id]);

        if (!distributors.length) {
            return res.status(200).json({
                status_code: "2",
                status: "success",
                message: "No distributors found for the provided ASM ID."
            });
        }

        return res.status(200).json({
            status_code: "1",
            status: "success",
            data: distributors
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status_code: "2",
            status: "fail",
            message: "Internal Server Error"
        });
    } finally {
        if (connection) {
            await connection.release();
        }
    }
});

router.post("/dist-add-territory", requireStaffLogin, async (req, res) => {
    const connection = await poolPromise().getConnection();

    try {
        const {
            application_id,
            territory
        } = req.body; // territory:"pin"
        const asm_unique_id = req.staff.unique_id;
        console.log(asm_unique_id);

        const [loginDistributor] = await connection.query(
            "SELECT * FROM login WHERE application_id = ? AND status = ?",
            [application_id, "1"]
        );

        const [ASMteritory] = await connection.query(
            "SELECT district FROM territory WHERE unique_id = ? AND status = 'Enable' ",
            [asm_unique_id, "3"]
        );
        if (ASMteritory.length === 0) {
            return res.status(200).json({
                status_code: "2",
                status: "failed",
                message: "ASM/SM territory not found.",
            });
        }
        const ASMdata = ASMteritory.map(({
                district
            }) =>
            district.toLowerCase()
        )

        if (loginDistributor.length === 0) {
            connection.release();
            return res.status(200).json({
                status_code: "2",
                status: "failed",
                message: "Distributor with the provided application id does not already exists or status not match.",
            });
        }
        const unique_id = loginDistributor[0].unique_id;

        const pin_data = await pin_code(Number(territory));

        console.log(ASMdata.includes(pin_data[0].district.toLowerCase()), ASMdata)

        if (ASMdata.includes(pin_data[0].district.toLowerCase())) {
            // console.log(pin_data, "dataaaaaaaaaaa");
            // Extracting territory data for bulk insert
            var bulkInsertData = pin_data.map(({
                area_name,
                district,
                state
            }) => [
                unique_id,
                String(territory),
                area_name,
                district,
                state,
                "Distributor",
                "Enable",
            ]);

        } else {
            return res.status(200).json({
                status_code: "2",
                status: "failed",
                message: "ASM/SM territory not match with pin code.",
            })
        }

        // Bulk insert territory data into the territory table
        await connection.query(
            "INSERT INTO territory (unique_id, pincode, area, district, state, user_type, status) VALUES ?",
            [bulkInsertData]
        );


        connection.release();

        return res.status(200).json({
            status_code: "1",
            status: "success",
            message: "Distributor territory successfully added",
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status_code: "2",
            status: "failed",
            message: "Internal Server Error",
        });
    } finally {
        connection.release();
    }
});

router.post("/dist-remove-territory", requireStaffLogin, async (req, res) => {
    const connection = await poolPromise().getConnection();

    try {
        const {
            application_id,
            territory
        } = req.body; // territory:"pin"

        const [loginDistributor] = await connection.query(
            "SELECT * FROM login WHERE application_id = ? AND status = ?",
            [application_id, "1"]
        );

        if (loginDistributor.length === 0) {
            connection.release();
            return res.status(200).json({
                status_code: "2",
                status: "failed",
                message: "Distributor with the provided application id does not already exists or status not match.",
            });
        }
        const unique_id = loginDistributor[0].unique_id;

        const [updateResult] = await connection.query(
            "UPDATE territory SET status = 'Disable' WHERE unique_id = ? AND pincode = ?",
            [unique_id, String(territory)]
        );

        connection.release();

        if (updateResult.affectedRows > 0) {
            return res.status(200).json({
                status_code: "1",
                status: "success",
                message: "Distributor territory successfully removed",
            });
        } else {
            return res.status(200).json({
                status_code: "2",
                status: "failed",
                message: "Failed to update territory",
            });
        }


    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status_code: "2",
            status: "failed",
            message: "Internal Server Error",
        });
    } finally {
        connection.release();
    }
});

//Onboard New Distributor end

//Customer Services Point & Merchant Registered  start


router.post("/search-merchant", requireStaffLogin, async (req, res) => {

    const connection = await poolPromise2().getConnection();
    try {
        const {
            user_type,
            mobile_number
        } = req.body;
        if (user_type === "csp" || user_type === "merchant")
        {
            const [userResult] = await connection.query(
                "SELECT * FROM auths WHERE user_type = ? AND mobile = ?",
                [user_type, mobile_number]
            );
        
            if (userResult.length > 0)
            {
                const user = userResult[0];
                console.log(user.id);
                switch (user.status)
                {
                    case "6":
                        // Mobile number not verified, generate OTP
                        const otp = Math.floor(100000 + Math.random() * 900000).toString();
                        const saltedOTP = SALT.concat(otp);
                        const hashedOTP = md5(saltedOTP);
                        const auth_time = moment().format('YYYY-MM-DD HH:mm:ss')
                        // Update OTP in the database
                        await connection.query(
                            "UPDATE auths SET otp = ?, updatedAt = ? WHERE id = ?",
                            [hashedOTP, auth_time, user.id]
                        );

                        // Send OTP to user mobile
                        
                       await smsapi("admin", "merchant_on_boarding", mobile_number, otp, `3 min`);
                        // const response = await axios.get(
                        //     `https://2factor.in/API/V1/1f985287-a3f0-11ee-8cbb-0200cd936042/SMS/+91${mobile_number}/${otp}/Onboarding+Confirmation`
                        // );


                        connection.release();
                        
                        return res.status(200).json({
                            status_code: "20",
                            status: "success",
                            unique_id: user.unique_id,
                            message: "OTP Successfully Send to CSP/Merchant Mobile Number.",
                        });

                    case "5":
                        const [schemeResult] = await connection.query(
                            "SELECT * FROM schemes WHERE usertype = ? AND status = ?",
                            ["Merchant", "Enable"]
                        );

                        const packageData = schemeResult.map((item) => {
                            return {
                                pack_name: item.packname,
                                package_id: item.package_id,
                                mrp: item.mrp,
                                discount: item.discount,
                                total: item.total,
                            };
                        });

                        connection.release();
                        return res.status(200).json({
                            status_code: "21",
                            status: "success",
                            message: "Mobile Number Successfully Verify.",
                            data: packageData,
                        });

                    case "4":
                        connection.release();
                        return res.status(200).json({
                            status_code: "22",
                            status: "success",
                            application_id: user.application_id,
                            message: "Onboard Merchant KYC.",
                        });

                    case "3":
                        connection.release();
                        return res.status(200).json({
                            status_code: "23",
                            status: "success",
                            application_id: user.application_id,
                            message: "Activated Merchant Services.",
                        });

                    case "2":
                        connection.release();
                        return res.status(200).json({
                            status_code: "2",
                            status: "success",
                            message: "Merchant/CSP Business Wallet Already Registered.",
                        });

                    case "1":
                        connection.release();
                        return res.status(200).json({
                            status_code: "2",
                            status: "success",
                            message: "Merchant/CSP Business Wallet Already Registered.",
                        });

                    case "0":
                        connection.release();
                        return res.status(200).json({
                            status_code: "20",
                            status: "success",
                            message: "Merchant/CSP Business Wallet is Suspended.",
                        });
                }
                return res.status(200).json({ data: user });

            
            }
            else
            {
                // User not found, generate Unique Id and OTP
                const uniqueId = uuid.v4();
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                const saltedOTP = SALT.concat(otp);
                const hashedOTP = md5(saltedOTP);
                const dateValue = moment().format('YYYY-MM-DD HH:mm:ss')

                // Insert data into login_data table
                const [value] = await connection.query(
                    "INSERT INTO auths (user_type, unique_id, mobile, status, otp,createdAt,updatedAt,timestamp) VALUES (?, ?, ?, ?, ?,?,?,?)",
                    [user_type, uniqueId, mobile_number, "6", hashedOTP, dateValue, dateValue, new Date()]
                );
                console.log(value);
                
                
                // Send OTP to user mobile
                // Send OTP to user mobile
                await smsapi("admin", "merchant_on_boarding", mobile_number, otp, `3 min`);

                connection.release();
                return res.status(200).json({
                    status_code: "20",
                    status: "success",
                    unique_id: uniqueId,
                    message: "OTP Successfully Sent to Merchant Mobile Number.",
                });
            }
        }
        else
        {
            return res.status(404).json({
                status_code: "2",
                status: "failed",
                message: "User Type must be csp or merchant",
            });
        }
    } catch (error) {
         console.error(error.message);
        return res.status(500).json({
            status_code: "2",
            status: "failed",
            message: "Internal Server Error",
        });
    }finally {
        connection.release();
    }
});
router.post("/csp-otp-verification", requireStaffLogin, async (req, res) => {
    const connection = await poolPromise2().getConnection();
    try {
        const {
            unique_id,
            otp
        } = req.body;
        const emp_id = req.staff.emp_id;

        // Check if the user exists with the given unique id
        const [userResult] = await connection.query(
            "SELECT * FROM auths WHERE unique_id = ?",
            [unique_id]
        );

        if (userResult.length > 0) {
            const user = userResult[0];

            // Fetch data from the scheme table
            const [schemeResult] = await connection.query(
                "SELECT * FROM schemes WHERE usertype = ? AND status = ?",
                [user.user_type, "Enable"]
            );

            const packageData = schemeResult.map((item) => {
                return {
                    pack_name: item.packname,
                    package_id: item.package_id,
                    mrp: item.mrp,
                    discount: item.discount,
                    total: item.total,
                };
            });

            if (user.status === "5") {
                connection.release();
                return res.status(200).json({
                    status_code: "2",
                    status: "failed",
                    message: "Merchant already verified.",
                    data: packageData,
                });
            }

            // Validate OTP
            const saltedOTP = SALT.concat(otp);
            const hashedOTP = md5(saltedOTP);

            console.log(user.otp, hashedOTP, hashedOTP === user.otp);
            if (hashedOTP === user.otp) {
                const application_id = Date.now();
                const customer_id =
                    String(emp_id).slice(0, 4) +
                    Math.floor(10000 + Math.random() * 90000).toString();
                const auth_time = moment().format('YYYY-MM-DD HH:mm:ss')
                await connection.query(
                    "UPDATE auths SET status = ?, updatedAt = ? WHERE id = ?",
                    ["5", auth_time,user.id]
                );

                connection.release();
                return res.status(200).json({
                    status_code: "21",
                    status: "success",
                    //application_id: application_id,
                    unique_id:user.unique_id,
                    message: "Merchant Mobile Number Successfully Verified",
                    data: packageData,
                });
            } else {
                connection.release();
                return res.status(200).json({
                    status_code: "2",
                    status: "failed",
                    message: "Invalid OTP",
                });
            }
        } else {
            connection.release();
            return res.status(200).json({
                status_code: "2",
                status: "failed",
                message: "User not found",
            });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status_code: "2",
            status: "failed",
            message: "Internal Server Error",
        });
    } finally {
        connection.release();
    }
});

router.post("/merchant-onboard", requireStaffLogin, async (req, res) => {
    const connection = await poolPromise2().getConnection(); // neopartner
    const connection2 = await poolPromise3().getConnection(); // http://103.93.16.46:2082/
   
    try {
        const {
            unique_id,
            name,
            email,
            gender,
            date_of_birth,
            pan_number,
            aadhar_number,
            residential_address,
            entity_type,
            shop_name,
            office_address,
            package_id,
        } = req.body;
         const application_id = Date.now();
        const customer_id =
            String(req.staff.emp_id).slice(0, 4) +
            Math.floor(10000 + Math.random() * 90000).toString();
        // Insert data into login_data and retailer tables
        //await connection2.beginTransaction();
       
        // Check if the user exists with the given unique id
        const [userResult] = await connection2.query(
            "SELECT * FROM auths WHERE unique_id = ?",
            [unique_id]
        );
        console.log(userResult);
        if (userResult.length === 0) {
            connection2.release();
            return res.status(200).json({
                status_code: "2",
                status: "failed",
                message: "User not found",
            });
        }
       

        const user = userResult[0];
      
        if (parseInt(user.status) !== 5)
        {
            return res.status(422).json({
                status_code:"2",
                status: "failed",
                message:"Status undefined"
            })
        }


        // check for duplicate adhar or pancard 
        //Check if aadhar or pancard exist 
        const [adhar_pan_detail] = await connection2.query(
            "SELECT * FROM merchants WHERE aadhar_no = ? OR pan_number = ?",
            [aadhar_number, pan_number]
        );
        if (adhar_pan_detail.length !== 0) {
            return res.status(422).json({
                status_code: "2",
                status: "failed",
                message: "Duplicate values are not allowed",
            });
        }


        console.log(process.env.callEko);
        // check value
        if (process.env.callEko === "true") {
            try {
                const {
                    secretKey,
                    Timestamp: timestamp
                } = await getSecretKeyAndTimeStamp();

                const details = {
                    pan_number,
                    name,
                    email,
                    residential_address,
                    date_of_birth,
                    shop_name,
                    secretKey,
                    timestamp
                }
                const { requestDetails, details_data } = await checkDetails(details);
                
                  

                if (details_data) {
                    await connection.query(
                        "INSERT INTO `eko_api_log`(`timestamp`, `api_name`, `request`, `response`) VALUES (?, ?, ?, ?);",
                        [
                            moment().format('YYYY-MM-DD HH:mm:ss'),
        
                            requestDetails.url,
                            JSON.stringify(requestDetails),
                            JSON.stringify(details_data),
                            
                        ]
                    );
                   
                       
                    if (details_data['response_status_id'] !== -1)
                    {
                        
                        return res.status(422).json({
                         status_code:"2",
                         status:"failed",
                         message:"Invalid pan number"
                     });
                    //  return res.status(200).json(details_data);
                    }
                }

               
            } catch (err) {
                return res.status(500).json({
                    status_code: "2",
                    status: "failed",
                    message: "Internal Server Error",
                });
            }

        }


        //Check if package exist 
        const [packageDetailss] = await connection2.query(
            "SELECT * FROM schemes WHERE userType = ? AND package_id = ?",
            [user.user_type, package_id]
        );
        console.log(user);
        if (packageDetailss.length === 0) {
            return res.status(404).json({
                status_code: "2",
                status: "failed",
                message: "Data not found for given  package_id",
            });
        }

        const [merchants] = await connection2.query(
            "SELECT * FROM merchants WHERE unique_id = ? ",
            [user.unique_id]
        );

        if (merchants.length > 0) {
            return res.status(422).json({
                status_code: "2",
                status: "failed",
                message: "Merchant already boarded"
            });
        }
        const auth_time = moment().format('YYYY-MM-DD HH:mm:ss')
        // Insert into login_data table
        await connection2.query(
            "UPDATE auths SET status = ?, package_id = ?, updatedAt = ? WHERE id = ?",
            ["4", package_id, auth_time,user.id]
        );
const dateValue = moment().format('YYYY-MM-DD HH:mm:ss')
        // Insert into retailer table
        await connection2.query(
    "INSERT INTO merchants (unique_id, application_id, gender,customer_id, authorized_person_name, email, date_of_birth, pan_number, aadhar_no, residential_address, entity_name, entity_type, office_address, status, createdAt, updatedAt, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?, ?, ?, ?)",
    [
        unique_id,
        application_id,
        gender,
        customer_id,
        name,
        email,
        date_of_birth,
        pan_number,
        aadhar_number,
        JSON.stringify(residential_address),
        shop_name,
        entity_type,
        JSON.stringify(office_address),
        "KYC-Not Submitted",
        dateValue,
        dateValue,
        dateValue
    ]
);



        const packageDetails = packageDetailss[0];

            const scheme_time = moment().format('YYYY-MM-DD HH:mm:ss')
        // Insert into schemesummarys table
        await connection2.query(
            "INSERT INTO schemesummarys (tran_at, order_id, unique_id, customer_id, packid, packname, price, gst, total, status, validity,createdAt,updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?)",
            [
                new Date(),
                user.unique_id,
                user.unique_id,
               customer_id,
                package_id,
                packageDetails.packname,
                packageDetails.price,
                packageDetails.gst,
                packageDetails.total,
                "Pending",
                packageDetails.duration,
                scheme_time,
                scheme_time
            ]
        );

        const [serviceData] = await connection2.execute(
            "SELECT * FROM service_with_packages WHERE packages_id = ?",
            [package_id]
        );

        if (!serviceData.length) {
            connection2.release();
            return res.status(500).json({
                success: false,
                message: "No services found for this package",
            });
        }

        const userData = serviceData.map((item) => [
            user.unique_id,
            item.packages_id,
            item.services_id,
            item.status,
            item.packages_name,
            item.services_name,
        ]);

        await connection2.query(
            "INSERT INTO user_services (unique_id, packages_id, service_id, status, `packages_name`, `service_name`) VALUES ?",
            [userData]
        );
        
        
        
        const wallet_time = moment().format('YYYY-MM-DD HH:mm:ss')
        // Insert into wallet table
        await connection2.query(
            "INSERT INTO wallets (user_type, unique_id, wallet, hold, unsettle, status,createdAt,updatedAt) VALUES (?, ?, ?, ?, ?, ?,?,?)",
            [user.user_type, user.unique_id, 0, 0, 0, "Enable",wallet_time,wallet_time]
        );

        await connection2.commit();
        connection2.release();

        return res.status(200).json({
            status_code: "22",
            status: "success",
            unique_id,
            message: "Merchant successfully onboarded",
        });
    } catch (error) {
        console.error(error);
        await connection2.rollback();
        connection2.release();
        return res.status(500).json({
            status_code: "2",
            status: "failed",
            message: "Internal Server Error",
        });
    }
});



router.post("/onboard-merchant-kyc", requireStaffLogin,
    upload3.fields([{
            name: "photo",
            maxCount: 1
        },
        {
            name: "pan_front",
            maxCount: 1
        },
        {
            name: "aadhar_front",
            maxCount: 1
        },
        {
            name: "aadhar_back",
            maxCount: 1
        },
         {
            name: "shop_photo",
            maxCount: 1
        },
    ]),
    async (req, res) => {
        const connection = await poolPromise2().getConnection();

        try {
            const {
                unique_id
            } = req.body;

            // Check if the user exists with the given unique id
            const [userResult] = await connection.query(
                "SELECT * FROM auths WHERE unique_id = ?",
                [unique_id]
            );
            console.log(userResult);
            if (userResult.length === 0) {
                connection.release();
                return res.status(200).json({
                    status_code: "2",
                    status: "failed",
                    message: "User not found",
                });
            }
            if (!req.files) {
                connection.release();
                return res.status(422).json({
                    status_code: "2",
                    status: "failed",
                    message: "No files found",
                });
            }

            const user = userResult[0];

            const panFrontPath = req.files["pan_front"][0].filename;
            const aadharFrontPath = req.files["aadhar_front"][0].filename;
            const aadharBackPath = req.files["aadhar_back"][0].filename;
           
            const shop_photo = req.files["shop_photo"][0].filename;

            const merchant_time = moment().format('YYYY-MM-DD HH:mm:ss')
          await connection.query(
    "UPDATE merchants SET photo = ?, shop_photo = ?, pan_front = ?, aadhar_front = ?, aadhar_back = ?, status = ?, updatedAt = ? WHERE unique_id = ?",
    [
        panFrontPath,
         shop_photo,

        panFrontPath,
        aadharFrontPath,
        aadharBackPath,
        "KYC-Submit",
        merchant_time,
        user.unique_id,
    ]
);

            const auth_time = moment().format('YYYY-MM-DD HH:mm:ss')
            // Update status code in login_data table
            await connection.query(
                "UPDATE auths SET status = ?, updatedAt = ? WHERE unique_id = ?",
                ["3",auth_time ,unique_id]
            );

            connection.release();

            return res.status(200).json({
                status_code: "23",
                status: "success",
                unique_id,
                message: "Activated Merchant Services",
            });
        } catch (error) {
            console.error(error);
            connection.release();
            return res.status(500).json({
                status_code: "2",
                status: "failed",
                message: "Internal Server Error",
            });
        }
    }
);

router.post("/activated-services", requireStaffLogin, async (req, res) => {
    const connection = await poolPromise2().getConnection();

    try {
        const {
            unique_id,
            model_name,
            device_number,
            mode_of_payment
        } =
        req.body;
        const emp_id = req.staff.emp_id;
        // Check if the user exists with the given unique id
        const [userResult] = await connection.query(
            "SELECT * FROM auths WHERE unique_id = ?",
            [unique_id]
        );
        if (userResult.length === 0) {
            connection.release();
            return res.status(200).json({
                status_code: "2",
                status: "failed",
                message: "User not found",
            });
        }

        const user = userResult[0];
        

        // Check if service_id 41 is enabled for the user
        const [userServices] = await connection.query(
            "SELECT * FROM user_services WHERE  service_id = 41 AND status = ?",
            [ "Enable"]
        );
            
        if (userServices.length === 0) {
            // Insert data in mapping table
            const map_time = moment().format('YYYY-MM-DD HH:mm:ss')
            await connection.query(
                "INSERT INTO mappings (unique_id, services_type,time_stamp, application_id, created_by, asm_id,createdAt,updatedAt) VALUES (?,?, ?, ?, ?, ?,?,?) ",
                [user.unique_id, "None", map_time,user.unique_id, emp_id, emp_id,map_time,map_time]
            );
        } else {
            // Insert data in mapping table
            const map_time = moment().format('YYYY-MM-DD HH:mm:ss')

            await connection.query(
                "INSERT INTO mappings (unique_id, services_type, application_id, created_by, asm_id, model_name, device_number,createdAt,updatedAt) VALUES (?, ?, ?, ?, ?, ?,?,?,?) ",
                [
                    user.unique_id,
                    "AePS",
                    user.unique_id,
                    emp_id,
                    emp_id,
                    model_name,
                    device_number,
                    map_time,
                    map_time
                ]
            );
        }

        // Check if model_name and device_number are provided when the service is enabled
        if (userServices.length > 0 && (!model_name || !device_number)) {
            connection.release();
            return res.status(200).json({
                status_code: "2",
                status: "failed",
                message: "Model Name and Device Number are missing.",
            });
        }
            const auth_time = moment().format('YYYY-MM-DD HH:mm:ss')
        // Update status code in login_data table
        await connection.query(
            "UPDATE auths SET status = ?, updatedAt = ? WHERE unique_id = ?",
            ["2", auth_time,unique_id]
        );

        const [scheme] = await connection.query(
            "SELECT * FROM schemes WHERE package_id = ?",
            [user.package_id]
        );

        const currentTimestamp = Date.now();
        const currentDate = new Date(currentTimestamp);
        const expiryDays = scheme[0].duration;
        const expiryTimestamp = currentTimestamp + expiryDays * 24 * 60 * 60 * 1000;
        const expiryDate = new Date(expiryTimestamp);

        const activedate = currentDate.toISOString().substring(0, 10);
        const expiredate = expiryDate.toISOString().substring(0, 10);

        if (mode_of_payment === "Cash" || mode_of_payment === "cash") {
            // Update status, active date, expire date in login_data table
            // (Only if mode of payment is Cash)
            await connection.query(
                "UPDATE auths SET status = ?, package_activated = ?, package_expiry = ?, package_status = 'Activate' WHERE unique_id = ?",
                ["2", activedate, expiredate, unique_id]
            );
            // Update status, active date, expire date in scheme summary table
            await connection.query(
                "UPDATE schemesummarys SET status = ?, activedate = ?, expiredate = ? WHERE unique_id = ?",
                ["Success", activedate, expiredate, user.unique_id]
            );
        }
         const [merchantResult] = await connection.query(
            "SELECT * FROM merchants WHERE unique_id = ?",
            [unique_id]
        );
    
        const merchantValue = merchantResult[0];
       await smsapi("admin", "csp_on-boarded", user.mobile, merchantValue['authorized_person_name']);

        connection.release();

        return res.status(200).json({
            status_code: "23",
            status: "success",
            unique_id,
            message: "Services Activated successfully.",
        });
    } catch (error) {
        console.error(error);
        connection.release();
        return res.status(500).json({
            status_code: "2",
            status: "failed",
            message: "Internal Server Error",
        });
    }
});
// Sales Manager Appoint / Created Area Sales Manager Account start

//sms pending
router.post("/add-employee", requireStaffLogin, async (req, res) => {
    try {
        const emp_id = req.staff.emp_id;
        const {
            Name,
            contact_no,
            email_id,
            zone_id
        } = req.body;
        const uqid = uuid.v4();
        let Employee_ID, application_id;

        // Use promise-based connection
        const connection = await poolPromise().getConnection();

        try {
            const sql_check_sec_key = "SELECT * FROM staff_data WHERE mobile = ?";
            const value = [contact_no];

            const [staff_data] = await connection.query(sql_check_sec_key, value);

            if (staff_data.length > 0) {
                return res
                    .status(422)
                    .json({
                        status: "failed",
                        message: "Staff already exists"
                    });
            } else {
                const sql_zone_query = "SELECT * FROM zone_tab WHERE id = ?";
                const sql_zone_value = [zone_id];

                const [zone_value] = await connection.query(sql_zone_query, sql_zone_value);
                if (zone_value.length === 0) {
                    return res
                        .status(422)
                        .json({
                            status_code: "2",
                            status: "failed",
                            message: "Zone does not exist"
                        });
                }
                const zone_code = zone_value[0]['code'];
                //const fouth_digit = String(emp_id).slice(0, 4);
                Employee_ID = zone_code + String(Date.now()).slice(-5);
                application_id = Date.now();

                const insertValues = [
                    application_id,
                    uqid,
                    "Marketing",
                    "Area Sales Manager",
                    Employee_ID,
                    Name,
                    contact_no,
                    email_id,
                    emp_id,
                ];

                const sql_insert =
                    "INSERT INTO `staff_data` (`application_id`,`unique_id`, `department`, `designation`, `emp_id`, `name`, `mobile`, `email` ,`mapping`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

                const [insertData] = await connection.query(sql_insert, insertValues);

                if (insertData.affectedRows >= 1) {
                    await smsapi(
                        "admin",
                        "employer_registration",
                        contact_no,
                        "Area Sales Manager",
                        Employee_ID,
                        "crms.egpaid.in"
                    );
                    return res.status(200).json({
                        status_code: "1",
                        status: "success",
                        Employee_ID,
                        Name,
                        Message: "Successfully Registered",
                    });
                }
            }
        } catch (err) {
            console.error(err);
            return res.status(422).json({
                status_code: "2",
                status: "failed",
                error: err.message
            });
        } finally {
            // Release the connection
            if (connection) {
                await connection.release();
            }
        }
    } catch (err) {
        return res.status(422).json({
            status_code: "2",
            status: "failed",
            error: err.message
        });
    }
});

router.post("/appoint", requireStaffLogin, async (req, res) => {
    try {
        const {
            authorization,
            key
        } = req.headers;
        const token = authorization.replace("Bearer ", "");
        const {
            applicationId,
            joiningDate,
            managerId,
            salary,
            shiftsId,
            officeMobile,
            officeEmail,
            territory
        } = req.body;
        const emp_id = req.staff.emp_id;

        const connection = await poolPromise().getConnection();

        try {
            // Check secret key
            const sql = "SELECT id FROM secret_key WHERE secret_key = ?";
            const value = [key];
            const [fetchedKey] = await connection.query(sql, value);

            if (fetchedKey.length === 0) {
                return res
                    .status(422)
                    .json({
                        status_code: "2",
                        status: "failed",
                        message: "INVALID API KEY"
                    });
            }

            // Get department from data
            const sql_department_query = "SELECT * FROM staff_data WHERE application_id = ?";
            const sql_department_value = [applicationId];
            const [staffData] = await connection.query(sql_department_query, sql_department_value);


            if (staffData.length === 0) {
                return res.status(422).json({
                    status_code: "2",
                    status: "failed",
                    message: "Staff does not  exists"
                });
            }
            const status_value = parseInt(staffData[0]['status']);
            if (!(status_value === 2)) {
                return res.status(422).json({
                    status_code: "2",
                    status: "failed",
                    error: "Employee cannot be appointed to any territory"
                });

            }
            const department_value = staffData[0]['department'];
            const designation_value = staffData[0]['designation'];


            if (department_value === "Marketing" && !territory) {
                return res.status(422).json({
                    status_code: "2",
                    status: "failed",
                    message: "Territory is mandatory for Marketing department"
                });
            }

            if (designation_value === "Area Sales Manager") {
                if (territory.length > 0) {
                    //Get List of all districts
                    let districts = territory.map(t => t["district_name"]);
                    if (districts.length === 0) {
                        return res.status(422).json({
                            status_code: "2",
                            status: "failed",
                            message: "Area Sales Manager can only be appointed to specific district"
                        });

                    }
                    const districts_query = `SELECT DISTINCT district_name, state_name FROM district WHERE district_name IN (${districts.map(() => '?').join(',')})`;
                    const districts_value = [...districts];
                    const confirmed_districts = await connection.query(districts_query, districts_value);

                    if (confirmed_districts[0].length === 0) {
                        return res.status(422).json({
                            status_code: "2",
                            status: "failed",
                            message: "Unknown districts"
                        });
                    }

                    for (let row of confirmed_districts[0]) {
                        // check teritorry
                        const sql_territory_query = "SELECT * FROM territory WHERE (district = ? AND user_type = ? AND status = ?)";
                        const sql_territory_value = [row['district_name'], 'ASM', 1];
                        const [territoryData] = await connection.query(sql_territory_query, sql_territory_value)

                        if (territoryData.length === 0)

                        {
                            const insertQuery = 'INSERT INTO territory (user_type, unique_id, district,state,status) VALUES (?, ?, ?,?,?)';
                            const insertValues = ['ASM', uuid.v4(), row['district_name'], row['state_name'], 1];
                            await connection.query(insertQuery, insertValues);
                        } else {
                            return res.status(422).json({
                                status_code: "2",
                                status: "failed",
                                message: `Area Sales Manager already exist for ${row['district_name']} district `
                            });
                        }


                    }

                }
            }
            if (designation_value === "Sales Manager") {
                if (territory.length > 0) {
                    //Get List of all states
                    let states = territory.map(t => t["state_name"]);
                    if (states.length === 0) {
                        return res.status(422).json({
                            status_code: "2",
                            status: "failed",
                            message: "Sales Manager can only be appointed to specific state"
                        });

                    }
                    const state_query = `SELECT DISTINCT state_name FROM state WHERE state_name IN (${states.map(() => '?').join(',')})`;
                    const state_value = [...states];
                    const confirmed_states = await connection.query(state_query, state_value);

                    if (confirmed_states[0].length === 0) {
                        return res.status(422).json({
                            status_code: "2",
                            status: "failed",
                            message: "Unknown State"
                        });
                    }

                    for (let row of confirmed_states[0]) {
                        // check teritorry
                        const sql_territory_query = "SELECT * FROM territory WHERE (state = ? AND user_type = ? AND STATUS = ?)";
                        const sql_territory_value = [row['state_name'], 'SM', 1];
                        const [territoryData] = await connection.query(sql_territory_query, sql_territory_value);


                        if (territoryData.length === 0)

                        {
                            const insertQuery = 'INSERT INTO territory (user_type, unique_id,district,state,status) VALUES (?, ?,?, ?,?)';
                            const insertValues = ['SM', uuid.v4(), " ", row['state_name'], 1];
                            await connection.query(insertQuery, insertValues);
                        } else {
                            return res.status(422).json({
                                status_code: "2",
                                status: "failed",
                                message: `Sales Manager already exist for ${row['state_name']} state `
                            });
                        }

                    }

                }
            }

            // appointing 
            const staff_query = "UPDATE staff_data SET joining_date = ? ,salary = ? , shifts_id = ? , office_mobile = ? , office_email =  ? , approve_by = ? , status = ? WHERE application_id = ? ";
            const staff_values = [joiningDate, salary, shiftsId, officeMobile, officeEmail, 3600, 1, applicationId];
            const [values] = await connection.query(staff_query, staff_values);



            smsapi("admin", "appoint", officeMobile, applicationId);

            return res.json({
                status: "sucess",
                status_code: "1",
                message: "Employee has been appointed to territory"

            })

        } catch (err) {
            console.error(err);
            return res.status(422).json({
                status_code: "2",
                status: "failed",
                error: err.message
            });
        } finally {
            if (connection) {
                await connection.release();
            }
        }
    } catch (err) {
        return res.status(422).json({
            status_code: "2",
            status: "failed",
            error: err.message
        });
    }
});



router.post("/get-asm", requireStaffLogin, async (req, res) => {
    const connection = await poolPromise().getConnection();
    const emp_id = req.staff.emp_id;
    try {
        // Fetch ASM details from staff_data table
        const [asmDetails] = await connection.query(
            "SELECT emp_id, name, status, mobile FROM staff_data WHERE designation = 'Area Sales Manager' AND `mapping` = ?",
            [emp_id]
        );

        return res.status(200).json({
            status_code: "1",
            status: "success",
            data: asmDetails,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status_code: "2",
            status: "failed",
            message: "Internal Server Error",
        });
    } finally {
        if (connection) {
            await connection.release();
        }
    }
});

// Sales Manager Appoint / Created Area Sales Manager Account end

//ticket start

router.post("/add-task", requireStaffLogin, async (req, res) => {
    const connection = await poolPromise().getConnection();

    try {
        const {
            send_to,
            message,
            subject
        } = req.body;
        const send_from = req.staff.mobile;
        // Generate a random 9-digit msg_id
        const msgId = Math.floor(100000000 + Math.random() * 900000000);

        // Insert data into work_report table
        await connection.query(
            "INSERT INTO work_report (send_from, send_to, messa_type, msg_id, subject, message, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [send_from, send_to, "new", msgId, subject, message, "New"]
        );

        return res.status(200).json({
            status_code: "02",
            status: "success",
            message: "Task added successfully",
            subject: subject,
            msg_id: msgId,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status_code: "01",
            status: "failed",
            message: "Internal Server Error",
        });
    } finally {
        await connection.release();
    }
});

router.get("/view", requireStaffLogin, async (req, res) => {
    const connection = await poolPromise().getConnection();

    try {
        const userMobile = req.staff.mobile;

        // Fetch data from work_report table based on user email
        const [result] = await connection.query(
            "SELECT id, send_from, send_to, messa_type, msg_id, subject, message, status, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at FROM work_report WHERE (send_from = ? OR send_to = ?) AND status IN (?, ?) ORDER BY created_at ASC, id ASC",
            [userMobile, userMobile, "New", "Read"]
        );

        await connection.query(
            "UPDATE work_report SET status = ? WHERE (send_from = ? OR send_to = ?) AND status = 'New' ",
            ["Read", userMobile, userMobile]
        );

        return res.status(200).json({
            status_code: "02",
            status: "success",
            message: "Data retrieved successfully",
            data: result,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status_code: "01",
            status: "failed",
            message: "Internal Server Error",
        });
    } finally {
        await connection.release();
    }
});

router.post("/reply", requireStaffLogin, async (req, res) => {
    const connection = await poolPromise().getConnection();

    try {
        const {
            msg_id,
            message
        } = req.body;
        const userMobile = req.staff.mobile;

        // Fetch data from work_report table based on msg_id
        const [originalMessage] = await connection.query(
            "SELECT send_from, subject FROM work_report WHERE msg_id = ? ",
            [msg_id]
        );

        if (originalMessage.length === 0) {
            return res.status(200).json({
                status_code: "02",
                status: "failed",
                message: "Original message not found",
            });
        }

        // Insert data for the reply into work_report table
        await connection.beginTransaction();

        await connection.query(
            "INSERT INTO work_report (send_from, send_to, messa_type, msg_id, subject, message, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                userMobile,
                originalMessage[originalMessage.length - 1].send_from,
                "reply",
                msg_id,
                originalMessage[0].subject,
                message,
                "New",
            ]
        );

        await connection.commit();

        return res.status(200).json({
            status_code: "02",
            status: "success",
            message: "Reply sent successfully",
            msg_id,
        });
    } catch (error) {
        console.error(error);
        await connection.rollback();
        return res.status(500).json({
            status_code: "01",
            status: "failed",
            message: "Internal Server Error",
        });
    } finally {
        await connection.release();
    }
});

router.post("/work-report", requireStaffLogin, async (req, res) => {
    const connection = await poolPromise().getConnection();

    try {
        const {
            msg_id,
            mobile
        } = req.body;
        const userMobile = req.staff.mobile;
        let query;
        let queryParams;

        if (msg_id) {
            // If msg_id is provided, fetch data based on msg_id
            query =
                "SELECT * FROM work_report WHERE msg_id = ? ORDER BY created_at ASC";
            queryParams = [msg_id];
        } else if (mobile) {
            // If mobile is provided, fetch data based on mobile
            query =
                "SELECT * FROM work_report WHERE (send_from = ? OR send_to = ?) ORDER BY created_at ASC";
            queryParams = [mobile, mobile];
        } else {
            // If neither msg_id nor mobile is provided, return an error
            return res.status(200).json({
                status_code: "02",
                status: "failed",
                message: "Either msg_id or mobile must be provided",
            });
        }

        // Fetch data from work_report table
        const [workReportData] = await connection.query(query, queryParams);

        return res.status(200).json({
            status_code: "02",
            status: "success",
            message: "Work report data retrieved successfully",
            data: workReportData,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status_code: "2",
            status: "failed",
            message: "Internal Server Error",
        });
    } finally {
        await connection.release();
    }
});

//ticket end

router.get("/key", (req, res) => {
    const key = "b977803d-0218-456e-a676-79de8c42f4b6";
    const encodedKey = Buffer.from(key).toString("base64");
    const Timestamp = Date.now().toString();
    const signature = crypto
        .createHmac("sha256", encodedKey)
        .update(Timestamp)
        .digest("binary");
    const secretKey = Buffer.from(signature, "binary").toString("base64");
    return res.status(200).json({
        secretKey,
        Timestamp
    });
});



router.post('/insertdata', requireStaffLogin, async (req, res) => {

    const connection = await poolPromise().getConnection();
    try {

        var unique_id = req.staff.unique_id;

        const {
            owner_name,
            shop_name,
            mobile,
            address,
            remark,
            coordinates
        } = req.body;
        if (!owner_name || !shop_name || !mobile || !address || !remark || !coordinates) {
            return res.status(422).json({
                status: "fail",
                message: "Please provide all details"
            });
        }

        // Check employee status
        const empDetailsQuery = 'SELECT id FROM staff_data WHERE unique_id = ? AND status = ?';
        const empDetailsValue = [unique_id, '1']
        const [empdetails] = await connection.query(empDetailsQuery, empDetailsValue);
        console.log(empdetails)
        if (empdetails.length === 0) {
            return res.status(422).json({
                status: "fail",
                message: "Your Account was not active"
            })
        }
        console.log(empdetails)

        //Ensure the mobile number is unique
        const checkMobileQuery = 'SELECT * FROM visiting_data WHERE mobile = ?';
        const checkMobileValues = [mobile];
        const existingMobile = await connection.query(checkMobileQuery, checkMobileValues);

        if (existingMobile[0].length > 0) {
            return res.status(422).json({
                status_code: "2",
                status: "failed",
                message: "Mobile number already exists"
            });
        }
        const addressJson = JSON.stringify(address)
        moment().tz("Asia/Calcutta").format();
        process.env.TZ = 'Asia/Calcutta';
        const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
        const insertDsrQuery = 'INSERT INTO visiting_data (unique_id, owner_name, shop_name, mobile, address, remark, timestamp, coordinates) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        const insertDsrValues = [unique_id, owner_name, shop_name, mobile, addressJson, remark, timestamp, coordinates];
        await connection.query(insertDsrQuery, insertDsrValues);

        return res.status(201).json({
            status: "success",
            message: "Visiting list updated successfully."
        });
    } catch (err) {
        console.error('Error:', err);
        return res.status(400).json({
            status_code: "2",
            status: "failed",
            message: "An error occurred",
            error: err.message
        });
    } finally {
        connection.release();
    }
});

router.post('/dsrreport', requireStaffLogin, async (req, res) => {


    const connection = await poolPromise().getConnection();

    try {
        var unique_id = req.staff.unique_id;
        const {
            page,
            limit,
            toDate,
            fromDate
        } = req.body;

        const date = moment().format('YYYY-MM-DD');

        if (toDate === '' || fromDate === '') {
            const sql1 = 'SELECT unique_id, owner_name, shop_name, mobile, address FROM visiting_data WHERE unique_id = ? AND DATE(timestamp) = ?';
            const values1 = [unique_id, date];
            const [visiting_info] = await connection.query(sql1, values1);
            if (!(visiting_info[0].length > 0)) {
                return res.status(422).json({
                    status_code: "2",
                    status: "failed",
                    message: "No DSR report found"
                });
            } else {
                return res.json(visiting_info[0]);
            }
        } else {
            const offset = (page - 1) * limit;
            const sql = `SELECT unique_id, owner_name, shop_name, mobile, address FROM visiting_data WHERE unique_id = ? AND DATE(timestamp) BETWEEN ? AND ? LIMIT ? OFFSET ?`;
            const values = [unique_id, fromDate, toDate, limit, offset];

            const [dsr] = await connection.query(sql, values);
            console.log(dsr)
            if (!(dsr?.length > 0)) {
                return res.status(422).json({
                    status_code: "2",
                    status: "failed",
                    message: "No DSR report found"
                });
            } else {
                return res.json(dsr);
            }
        }
    } catch (err) {
        console.error('Error:', err);
        return res.status(400).json({
            status_code: "2",
            status: "failed",
            error: err
        });
    } finally {
        connection.release();
    }
});

router.get('/dsrreport/:id', requireStaffLogin, async (req, res) => {


    const connection = await poolPromise().getConnection();
    try {
        const id = req.params.id;
        var unique_id = req.staff.unique_id;
        const sql = 'SELECT * FROM visiting_data WHERE unique_id = ? AND id = ?';
        const values = [unique_id, id];
        const [dsr] = await connection.query(sql, values);
        if (dsr[0].length === 0) {
            return res.status(422).json({
                status: "fail",
                message: "No DSR report found"
            });
        } else {
            return res.json(dsr[0]);
        }
    } catch (err) {
        console.error('Error:', err);
        return res.status(400).json({
            status_code: "2",
            status: "failed",
            error: err
        });
    } finally {
        connection.release();
    }
});


var pin_code = async (pincode) => {

    const connection = await poolPromise().getConnection();
    console.log(pincode, "pincode")
    try {
        const sql = "SELECT * FROM area WHERE pincode = ?";
        const value = [pincode];
        const [area] = await connection.query(sql, value);

        if (area.length === 0) {
            return axios
                .get("https://api.postalpincode.in/pincode/" + pincode)
                .then(async (response) => {
                    const [data] = response.data;
                    // console.log(data);
                    if (data) {
                        let arr = data.PostOffice || null;
                        // console.log({ arr });
                        if (arr === null) {
                            const sql1 = "SELECT * FROM area_data WHERE pincode = ?";
                            const value1 = [pincode];
                            const [area] = await connection.query(sql1, value1);
                            data = area.map(({
                                name,
                                district,
                                division,
                                state
                            }) => ({
                                area_name: name,
                                division,
                                district,
                                state,
                            }))
                            return data;
                        }
                        let sql = `INSERT INTO area (
               name,
               district,
               division,
               state,
               pincode
               
             )
             VALUES `;

                        sql += arr
                            .map((postOffice) => {
                                return `("${postOffice.Name}", "${postOffice.District}", "${postOffice.Division}", "${postOffice.State}", "${postOffice.Pincode}")`;
                            })
                            .join(", ");

                        await connection.query(sql);

                        console.log("data saved", arr);
                        data = await arr.map(({
                            Name,
                            District,
                            Division,
                            State
                        }) => ({
                            area_name: Name,
                            division: Division,
                            district: District,
                            state: State,
                        }))
                        return data
                    }
                })
                .catch(async (error) => {
                    // console.log(error);
                    const sql1 = "SELECT * FROM area_data WHERE pincode = ?";
                    const value1 = [pincode];
                    const [area] = await connection.query(sql1, value1);
                    data = area.map(({
                        name,
                        district,
                        division,
                        state
                    }) => ({
                        area_name: name,
                        division,
                        district,
                        state,
                    }))
                    return data
                });
        } else {
            data = area.map(({
                name,
                district,
                division,
                state
            }) => ({
                area_name: name,
                division,
                district,
                state,
            }))
            return data
        }
    } catch (err) {
        console.log("error", err);
        return res.status(422).json({
            status: "fail",
            error: err
        });
    } finally {
        await connection.release();
    }
}

// Function to call Third-Party Eko Onboard User API
async function callEkoOnboardAPI(userData) {
    // Implement logic to call Eko Onboard User API and return the response
    // Example: const response = await thirdPartyApiClient.post('/eko/onboard', userData);
    // Replace the above line with actual API call
    return {
        status: 0
    }; // Example response, modify as per your API response structure
}

//Customer Services Point & Merchant Registered  end
module.exports = router;