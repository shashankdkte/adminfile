const express = require("express");
const router = express.Router();
const uuid = require("uuid");
const axios = require("axios");
const poolPromise = require("../util/connnectionPromise.js");
const poolPromise2 = require("../util/connnectionPromise2.js");
const moment = require("moment-timezone");
const smsapi = require("../globalfunction/sms");
moment().tz("Asia/Calcutta").format();
process.env.TZ = "Asia/Calcutta";
const requireLogin = require("../middleware/requireLogin.js");
const requireFseLogin = require("../middleware/requireFseLogin.js");
const md5 = require("md5");
const SALT = process.env.SALT.toString();
const { savevirtualaccount } = require("../globalfunction/savevirtualaccount");
const path = require("path");
const multer = require("multer");

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

router.get("/web-navigation", requireLogin, async (req, res) => {
  try {
    // Use promise-based connection
    const connection = await poolPromise().getConnection();

    try {
      const sql =
        "SELECT * FROM web_navigation WHERE parent = ? AND user_type = ?";
      const value = [0, "Distributor"];

      const [parent_menu] = await connection.query(sql, value);

      const menu = [];
      for (let i = 0; i < parent_menu.length; i++) {
        const parent_id = parent_menu[i].id;
        const sql1 =
          "SELECT * FROM web_navigation WHERE parent = ? AND user_type = ?";
        const value1 = [parent_id, "Distributor"];

        const [submenu] = await connection.query(sql1, value1);

        const data = {
          parent_menu: parent_menu[i],
          sub_menu: submenu,
        };
        menu.push(data);
      }

      return res
        .status(200)
        .json({ status_code: "1", status: "success", menu: menu });
    } catch (err) {
      console.error(err);
      return res
        .status(422)
        .json({ status_code: "2", status: "fail", error: err.message });
    } finally {
      // Release the connection
      if (connection) {
        await connection.release();
      }
    }
  } catch (err) {
    return res
      .status(422)
      .json({ status_code: "2", status: "fail", error: err.message });
  }
});

//New API Distributor Pin start

router.get("/pin-status", requireLogin, async (req, res) => {

  const { user_type, unique_id } = req.login;

  // Validate user_type
  if (user_type !== 'Distributor') {
    return res.status(400).json({
      status_code: "2",
      status: "fail",
      message: "Invalid user type. User type must be 'Distributor' ."
    });
  }

  // Use promise-based connection
  const connection = await poolPromise().getConnection();
  try {
    // Fetch pin from the login table
    const sql = "SELECT pin FROM login WHERE user_type = ? AND unique_id = ? AND (status = '1' OR status = '2')";
    const [results] = await connection.query(sql, [user_type, unique_id]);

    let message = "";
    if (results.length > 0 && results[0].pin) {
      message = "Pin available.";
    } else {
      message = "Pin not available.";
    }

    return res.status(200).json({
      status_code: "1",
      status: "success",
      message: message
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

router.get("/set-pin/:pin", requireLogin, async (req, res) => {

  const { pin } = req.params;
  const { user_type, unique_id } = req.login;

  // Validate user_type
  if (user_type !== 'Distributor') {
    return res.status(400).json({
      status_code: "2",
      status: "fail",
      message: "Invalid user type. User type must be 'Distributor'."
    });
  }

  // Use promise-based connection
  const connection = await poolPromise().getConnection();
  try {
    // Check if pin is null
    const [existingPin] = await connection.query(
      "SELECT pin FROM login WHERE user_type = ? AND unique_id = ? AND (status = '1' OR status = '2') ",
      [user_type, unique_id]);

    if (existingPin.length > 0 && existingPin[0].pin !== null) {
      return res.status(200).json({
        status_code: "2",
        status: "success",
        message: "Pin already available."
      });
    }

    // Update pin
    await connection.query(
      "UPDATE login SET pin = ? WHERE unique_id = ?",
      [pin, unique_id]);

    return res.status(200).json({
      status_code: "1",
      status: "success",
      message: "Pin set successfully."
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

router.post("/change-pin", requireLogin, async (req, res) => {
  const { oldPin, newPin } = req.body;
  const { unique_id } = req.login;

  // Use promise-based connection
  const connection = await poolPromise().getConnection();
  try {
    // Check if the old pin matches
    const [existingPin] = await connection.query(
      "SELECT pin FROM login WHERE unique_id = ? AND (status = '1' OR status = '2') ",
      [unique_id]
    );

    if (!existingPin.length || existingPin[0].pin !== oldPin) {
      return res.status(200).json({
        status_code: "2",
        status: "success",
        message: "Old pin verification failed."
      });
    }

    // Update the pin
    await connection.query(
      "UPDATE login SET pin = ? WHERE unique_id = ?",
      [newPin, unique_id]
    );

    return res.status(200).json({
      status_code: "1",
      status: "success",
      message: "Pin changed successfully."
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

//New API Distributor Pin end

router.get("/fetch-territory", requireLogin, async (req, res) => {
  const connection = await poolPromise().getConnection();

  try {
    // Extract user_id from the request
    const { unique_id } = req.login;

    // Fetch territory data for the given user_id
    const [territoryResults] = await connection.query(
      "SELECT * FROM territory WHERE unique_id = ?",
      [unique_id]
    );

    return res.status(200).json({
      status: "success",
      data: territoryResults,
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  } finally {
    if (connection) {
      await connection.release();
    }
  }
});


// pending
router.post("/add-fse", requireLogin, async (req, res) => {
  const connection = await poolPromise().getConnection();
  const connection2 = await poolPromise2().getConnection();

  try {
    const { name, mobile_number, email, address, territory } = req.body;
    const { unique_id: distributorId, customer_id, created_by } = req.login;
    // Extract user_id from the request

    // Function to generate a random 9-digit agent ID
    const generateAgentId = Math.floor(100000000 + Math.random() * 900000000);

    // Function to generate a unique ID using uuid
    const generateUniqueId = uuid.v4();
    var successPins = [];

      // Check if the PIN code is available for distributor 
      const [existingPin] = await connection.query(
        "SELECT * FROM territory WHERE unique_id = ? AND pincode = ? AND status = 'Enable' ",
        [distributorId, territory]
      );

      const fse_tdata = existingPin.map(({  area, pincode, district, state }) => [
        "F.S.E",
        area,
        generateUniqueId,
        pincode,
        "Enable",
        district,
        state
      ])
    
    
      if (existingPin.length === 0) {
        // PIN is not available, push the PIN to the errorPins array
        return res.status(500).json({
          status_code: "2",
          status: "failed",
          message: "Invalid Distributor Territory PIN Code",
        });

      } else {
        // PIN is available, proceed with the necessary actions
        // Check if an FSE is already assigned for this PIN
        const [FseTerritories] = await connection.query(
          "SELECT unique_id FROM territory WHERE unique_id != ? AND pincode = ? AND status = 'Enable' ",
          [distributorId, territory]
        );

        if (FseTerritories.length === 0) {
          // No FSE assigned, push the PIN to the successPins array
          // Insert data into the territory table

          await connection.query(
            "INSERT INTO territory (user_type, area, unique_id, pincode, status, district, state) VALUES ?",
            [fse_tdata]
          );
          successPins.push(territory);

        } else {
          // FSE already assigned for this PIN, check FSE status
          // Check if an FSE is already assigned for this PIN
          for (const { unique_id } of FseTerritories) {
            const [existingFSEs] = await connection.query(
              "SELECT status FROM fse WHERE unique_id = ?",
              [unique_id]
            );
            if (existingFSEs.length === 0) {
              return res.status(500).json({
                status_code: "2",
                status: "failed",
                message: "Internal Server Error",
              });
              
            } else if (existingFSEs[0].status === "0") {
              // FSE is suspended, push the PIN to the successPins array
              // Insert data into the territory table
             
              await connection.query(
                "INSERT INTO territory (user_type, area, unique_id, pincode, status, district, state) VALUES ?",
                [fse_tdata]
              );
              successPins.push(territory);
             
            } else {
              // FSE is active, push the PIN to the errorPins array
              return res.status(500).json({
                status_code: "2",
                status: "failed",
                message: "FSE is already active in this territory. ",
              });
            }
          }
        }
      }
    

    if (successPins.length > 0) {
      // At least one successful PIN, insert data into the fse table

      // Insert data into the fse table
      await connection.query(
        "INSERT INTO fse (distributor_id , asm_id, unique_id, agent_id, name, mobile_number, email, address, status, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '1', ?)",
        [
          customer_id,
          created_by,
          generateUniqueId,
          generateAgentId,
          name,
          mobile_number,
          email,
          JSON.stringify(address),
          new Date(),
        ]
      );
      await connection2.query(
        "INSERT INTO wallet (user_type, unique_id, wallet, hold, unsettle, created_date, status) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP(), ?)",
        ["F.S.E", generateUniqueId, 0, 0, 0, "Enable"]
      );
    }
    successPins.length > 0 ? smsapi("admin", "fsc_registration",mobile_number, generateAgentId): "";
    // Send response with success and error PIN details
    return res.status(200).json({
      status_code: successPins.length > 0 ? "1" : "2",
      status: successPins.length > 0 ? "success" : "failed",
      agent_id: successPins.length > 0 ? generateAgentId : undefined,
      message:
        successPins.length > 0
          ? "Field Sales Executive Successfully Created"
          : "No PINs available or FSE already assigned for all PINs"
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

//pending test
router.put("/modify-fse", requireLogin, async (req, res) => {
  const connection = await poolPromise().getConnection();

  try {
    const { agent_id, name, mobile_number, email, address, status } = req.body;

    // Update FSE data based on the agent_id
    const [updateResult] = await connection.query(
      "UPDATE fse SET name = ?, mobile_number = ?, email = ?, address = ?, status = ? WHERE agent_id = ?",
      [name, mobile_number, email, JSON.stringify(address), status, agent_id]
    );

    if (updateResult.affectedRows === 0) {
      return res.status(200).json({
        status_code: "2",
        status: "failed",
        message: "FSE not found or not modified",
      });
    }

    // Send success response
    return res.status(200).json({
      status_code: "1",
      status: "success",
      message: "FSE modified successfully",
      data: {
        fse_id: updateResult.insertId,
      },
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

router.get("/get-fse", requireLogin, async (req, res) => {
  const connection = await poolPromise().getConnection();
  const customer_id = req.login.customer_id;
  try {
    const { agent_id } = req.query;
    const data = [];

    if (agent_id) {
      // Fetch FSE data based on the agent_id
      var [fseResults] = await connection.query(
        "SELECT id AS Fse_id, unique_id, agent_id, name, mobile_number FROM fse WHERE agent_id = ?",
        [agent_id]
      );
      if (fseResults.length > 0) {
        var [fseTerritoryResults] = await connection.query(
          "SELECT * FROM territory WHERE unique_id = ?",
          [fseResults[0].unique_id]
        );
        data.push({ fseResults, territory: fseTerritoryResults });
      }
    } else {
      // Fetch FSE data based on the agent_id
      var [fseResults] = await connection.query(
        "SELECT id AS Fse_id, unique_id, agent_id, name, mobile_number FROM fse WHERE distributor_id = ?",
        [customer_id]
      );
      if (fseResults.length > 0) {
        for (let i = 0; i < fseResults.length; i++) {
          var [fseTerritoryResults] = await connection.query(
            "SELECT * FROM territory WHERE unique_id = ?",
            [fseResults[i].unique_id]
          );
          data.push({
            fseResults: fseResults[i],
            territory: fseTerritoryResults,
          });
        }
      }
    }

    if (fseResults.length === 0) {
      return res.status(200).json({
        status_code: "2",
        status: "failed",
        message: "FSE not found",
      });
    }

    // Send response with FSE details
    return res.status(200).json({
      status_code: "1",
      status: "success",
      message: "FSE details retrieved successfully",
      data: data,
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

//pending test
router.put("/remove-territory", requireLogin, async (req, res) => {
  const connection = await poolPromise().getConnection();

  try {
    const { agent_id, pin_codes } = req.body;

    // Fetch unique_id from fse table based on agent_id
    const [fseResult] = await connection.query(
      "SELECT unique_id FROM fse WHERE agent_id = ?",
      [agent_id]
    );

    if (fseResult.length === 0) {
      return res.status(200).json({
        status_code: "2",
        status: "failed",
        message: "FSE not found",
      });
    }

    const unique_id = fseResult[0].unique_id;

    // Update territory status to 'Disable' for the specified pin codes
    const updateResults = await Promise.all(
      pin_codes.map(async (pin) => {
        const [updateResult] = await connection.query(
          "UPDATE territory SET status = 'Disable' WHERE unique_id = ? AND pincode = ?",
          [unique_id, pin]
        );
        return updateResult;
      })
    );

    // Check if any update was successful
    const anySuccess = updateResults.some((result) => result.affectedRows > 0);

    if (anySuccess) {
      return res.status(200).json({
        status_code: "1",
        status: "success",
        message: "Territories removed successfully",
        data: {
          fse_id: fseResult[0].id,
        },
      });
    } else {
      return res.status(200).json({
        status_code: "2",
        status: "failed",
        message: "No territories removed or invalid pin codes",
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
    await connection.release();
  }
});

//pending test
router.post("/add-territory", requireLogin, async (req, res) => {
  const connection = await poolPromise().getConnection();

  try {
    const { agent_id, territory } = req.body;
    const { unique_id: distributorId } = req.login;
    // Extract user_id from the request

    const territories = territory; // Array of PIN codes [pin ,pin ,pin]

    const [existingFSE] = await connection.query(
      "SELECT * FROM fse WHERE agent_id = ?  ",
      [agent_id]
    );

    const fseUniqueId = existingFSE[0].unique_id;
    const successPins = [];
    const errorPins = [];
    for (const pin of territories) {
      // Check if the PIN code is available
      const [existingPin] = await connection.query(
        "SELECT * FROM territory WHERE unique_id = ? AND pincode = ? AND status = 'Enable' ",
        [distributorId, pin]
      );

      if (existingPin.length === 0) {
        // PIN is not available, push the PIN to the errorPins array
        errorPins.push(pin);
      } else {
        // PIN is available, proceed with the necessary actions
        // Check if an FSE is already assigned for this PIN
        const [FseTerritories] = await connection.query(
          "SELECT unique_id FROM territory WHERE unique_id != ? AND pincode = ? AND status = 'Enable' ",
          [distributorId, pin]
        );

        if (FseTerritories.length === 0) {
          // No FSE assigned, push the PIN to the successPins array
          successPins.push(pin);

          // Insert data into the territory table
          await connection.query(
            "INSERT INTO territory (unique_id, pincode, status, district, state) VALUES (?, ?, 'Enable', ?, ?)",
            [generateUniqueId, pin, " ", " "]
          );
        } else {
          // FSE already assigned for this PIN, check FSE status
          // Check if an FSE is already assigned for this PIN
          for (const { unique_id } of FseTerritories) {
            const [existingFSEs] = await connection.query(
              "SELECT status FROM fse WHERE unique_id = ?",
              [unique_id]
            );
            if (existingFSEs.length === 0) {
              errorPins.push(pin);
              continue;
            } else if (existingFSEs[0].status === "0") {
              // FSE is suspended, push the PIN to the successPins array
              // Insert data into the territory table
              await connection.query(
                "INSERT INTO territory (unique_id, pincode, status, district,state) VALUES (?, ?, 'Enable', ?, ?)",
                [fseUniqueId, pin, " ", " "]
              );
              successPins.push(pin);
            } else {
              // FSE is active, push the PIN to the errorPins array
              while (successPins.includes(pin)) {
                successPins.splice(successPins.lastIndexOf(pin), 1); // Remove from the end for efficiency
              }
              // console.log(successPins);
              errorPins.push(pin);
              break;
            }
          }
        }
      }
    }

    // Send response with success and error PIN details
    return res.status(200).json({
      status_code: successPins.length > 0 ? "1" : "2",
      status: successPins.length > 0 ? "success" : "failed",
      message:
        successPins.length > 0
          ? "Field Sales Executive territory Successfully Added"
          : "No PINs available or FSE already assigned for all PINs",
      success_pins: successPins,
      error_pins: errorPins,
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

router.post("/request-evalue", requireLogin, upload3.fields([
  { name: "uploadReceipt", maxCount: 1 }
]), async (req, res) => {
  const connection = await poolPromise2().getConnection();

  try {
    const {
      depositBankName,
      depositDate,
      modeOfPayment,
      amount,
      transactionReferenceNumber
    } = req.body;

    // Example: Get user's information from the login_data table
    const { unique_id, customer_id } = req.login;
    const order_id = Date.now();

    const [existingEvalue] = await connection.query(
      "SELECT * FROM evalue WHERE unique_id = ? AND bank_ref_num = ? ",
      [unique_id, transactionReferenceNumber]
    );

    if (existingEvalue.length > 0) {

      return res.status(400).json({
        status_code: "2",
        status: "Fail",
        message: "bank reference number is already availbale.",
      });
    }
      const uploadReceipt = req.files["uploadReceipt"]
      ? req.files["uploadReceipt"][0].filename
      : null;
    
    // Insert data into evalue table
    const [insertResult] = await connection.query(
      "INSERT INTO evalue (request_at, order_id, customer_id, unique_id, deposited, date, amount, mode_of_payment, bank_ref_num, receipt, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        new Date(),
        order_id,
        customer_id,
        unique_id,
        depositBankName,
        depositDate,
        amount,
        modeOfPayment,
        transactionReferenceNumber,
        uploadReceipt,
        "Pending",
      ]
    );

    if (insertResult.affectedRows === 1) {
      return res.status(200).json({
        status_code: "1",
        status: "Success",
        message: "Request E-Value successful",
      });
    } else {
      return res.status(500).json({
        status_code: "2",
        status: "Fail",
        message: "Failed to insert into evalue table",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status_code: "2",
      status: "Fail",
      message: "Internal Server Error",
    });
  } finally {
    connection.release();
  }
});

router.get("/e-value-history", async (req, res) => {
  try {
    const { token } = req.headers;
    const { date, page = 1, limit = 10 } = req.body;

    // TODO: Implement token verification using the provided token

    const connection = await poolPromise2().getConnection();

    let query =
      "SELECT request_at, order_id, mode_of_payment, bank_ref_num, amount, status, remark FROM evalue";
    const params = [];

    if (date) {
      query += " WHERE date = ?";
      params.push(date);
    }

    query += ` ORDER BY request_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, (page - 1) * limit);

    const [results] = await connection.query(query, params);
    connection.release();

    return res.status(200).json({
      status: "Success",
      data: results,
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      status: "Error",
      message: "Internal Server Error",
    });
  }
});

router.get("/search-product", requireLogin, async (req, res) => {
  try {
    //   const { token } = req.headers;
    //   const { product_id } = req.body;

    const connection = await poolPromise().getConnection();
    const [results] = await connection.query("SELECT * FROM products", []);
    connection.release();

    if (results.length === 0) {
      return res.status(404).json({
        status: "Fail",
        message: "Product not found",
      });
    }

    const productDetails = results.map((product) => ({
      product_id: product.product_id,
      product_name: product.product_name,
      mrp: product.mrp,
      rate: product.rate,
      gst: product.gst,
      moq: product.moq,
    }));

    return res.status(200).json({
      status: "Success",
      data: productDetails,
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      status: "Error",
      message: "Internal Server Error",
    });
  }
});

router.post("/generated-order", requireLogin, async (req, res) => {
  try {
    const { products } = req.body;
    const { unique_id, customer_id, name } = req.login;
    const connection = await poolPromise().getConnection();

    let subTotal = 0;
    let cgst = 0;
    let sgst = 0;
    let roundOff = 0;
    let total = 0;
    var responsedata = [];
    const order_id =
      Math.floor(1000 + Math.random() * 9000).toString() + Date.now();
    const invoice_id =
      Math.floor(1000 + Math.random() * 9000).toString() + Date.now();
    const created_on = moment().format("YYYY-MM-DD HH:mm:ss");
    console.log(order_id, invoice_id, created_on);

    // Iterate through each product in the request
    for (const { product_id, moq } of products) {
      // Fetch product details from our_product table
      const [productResults] = await connection.query(
        "SELECT * FROM products WHERE product_id = ?",
        [product_id]
      );

      if (productResults.length === 0) {
        connection.release();
        return res.status(404).json({
          status: "Fail",
          message: "Product not found",
        });
      }

      var product = productResults[0];

      // Check if the requested MOQ is greater than our_product MOQ
      if (moq < product.moq) {
        connection.release();
        return res.status(200).json({
          status: "Fail",
          message: `Minimum Quantity of Order is ${product.moq}`,
        });
      }

      const rate = product.rate;
      const quantity = moq;
      const discount = 0; // Assuming no discount for now
      const gst = product.gst;
      const amount = rate * quantity;

      responsedata.push({
        product_id,
        product_name: product.product_name,
        hsncode: product.hsncode,
        rate: product.rate,
        quantity: moq,
        discount: 0,
        gst: product.gst,
        amount: product.rate * moq,
      });

      subTotal += amount;
      cgst += ((gst / 2) * amount) / 100;
      sgst += ((gst / 2) * amount) / 100;
    }

    total = subTotal + cgst + sgst;

    // Round off the total amount
    roundOff = total - Math.floor(total);

    function roundOffToOneOrZero(value) {
      return value >= 0.5 ? 1 : 0;
    }

    const decimalValue = roundOff;
    const roundedValue = roundOffToOneOrZero(decimalValue);
    total = Math.floor(total) + roundedValue;

    connection.release();

    return res.status(200).json({
      status: "Success",
      data: {
        products: responsedata,
        total: {
          "sub-Total": subTotal,
          Discount: 0,
          SGST: sgst,
          CGST: cgst,
          "Round Off": roundOff,
          Total: total,
        },
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "Error",
      message: "Internal Server Error",
    });
  }
});

//doubt inv Unknown column 'created_on' in 'field list'

router.post("/conform-order", requireLogin, async (req, res) => {
  const { unique_id, customer_id, name } = req.login;
  var { products, pin } = req.body;

  const connection = await poolPromise().getConnection();
  const connection2 = await poolPromise2().getConnection();
  try {
    await connection.beginTransaction();
    await connection2.beginTransaction();
    // Validate TPIN
    const [tpinResult] = await connection.query(
      "SELECT pin FROM login WHERE unique_id = ?",
      [unique_id]
    );

    if (tpinResult.length === 0 || tpinResult[0].pin !== String(pin)) {
      return res.status(400).json({ status: "fail", message: "Invalid PIN" });
    } else {
      // Validate product MOQ
      let subTotal = 0;
      let cgst = 0;
      let sgst = 0;
      let roundOff = 0;
      let total = 0;
      var responsedata = [];
      const order_id =
        Math.floor(1000 + Math.random() * 9000).toString() + Date.now();
      const invoice_id =
        Math.floor(1000 + Math.random() * 9000).toString() + Date.now();
      const created_on = moment().format("YYYY-MM-DD HH:mm:ss");
      console.log(order_id, invoice_id, created_on);
      var opening_stock = 0;
      // Iterate through each product in the request

      for (const { product_id, moq } of products) {
        const [productResults] = await connection.query(
          "SELECT * FROM products WHERE product_id = ?",
          [product_id]
        );

        if (productResults.length === 0) {
          connection.release();
          return res.status(404).json({
            status: "Fail",
            message: "Product not found",
          });
        }

        var product = productResults[0];

        // Check if the requested MOQ is greater than our_product MOQ
        if (moq < product.moq) {
          // Rollback the transaction if an error occurs
          await connection.rollback();
          connection.release();
          return res.status(200).json({
            status: "Fail",
            product_id: product.product_id,
            product_mor: product.moq,
            you_moq: moq,
            message: `Minimum Quantity of Order is ${product.moq}`,
          });
        }

        const rate = product.rate;
        const quantity = moq;
        const discount = 0; // Assuming no discount for now
        const gst = product.gst;
        const amount = rate * quantity;

        // Insert data into inv_details table
        await connection.query(
          "INSERT INTO inv_details (unique_id, order_id, productid, productname, hsncode, rate, quantity, amount, discount_type, discount, total,free_qty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            unique_id,
            order_id,
            product.product_id,
            product.product_name,
            product.hsncode,
            rate,
            quantity,
            amount,
            "",
            discount,
            amount,
            0,
          ]
        );

        const [stockResults] = await connection.query(
          "SELECT * FROM stock WHERE purchase_id = ? AND unique_id = ?",
          [product_id, unique_id]
        );

        if (stockResults.length === 0) {
          await connection.query(
            "INSERT INTO stock ( unique_id, customer_id, purchase_id, quantity) VALUES ( ?, ?, ?, ?)",
            [unique_id, customer_id, product_id, quantity]
          );
        } else {
          opening_stock = Number(stockResults[0].quantity);
          // Update stock
          await connection.query(
            "UPDATE stock SET quantity = quantity + ? WHERE purchase_id = ? AND unique_id = ? AND status = ?",
            [quantity, product_id, unique_id, "Enable"]
          );
        }
        const [stock_summaryResults] = await connection.query(
          "SELECT * FROM stock_summary WHERE product_id = ? AND unique_id = ? AND order_id = ?",
          [product_id, unique_id, order_id]
        );
        if (stock_summaryResults.length === 0) {
          await connection.query(
            "INSERT INTO stock_summary ( order_id, unique_id, transaction_type, transaction_at, product_id, opening_stock, quantity, closing_stock, description) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
              order_id,
              unique_id,
              "Credit",
              created_on,
              product.product_id,
              opening_stock,
              product.moq,
              opening_stock + quantity,
              `${quantity} stock Credit Successfully`,
            ]
          );
        } else {
          // Update stock
          await connection.query(
            "UPDATE stock_summary  SET quantity = quantity + ?, closing_stock = ? WHERE product_id = ? AND unique_id = ? AND order_id = ?",
            [
              quantity,
              Number(stock_summaryResults[0].closing_stock) + Number(quantity),
              product_id,
              unique_id,
              order_id,
            ]
          );
        }

        responsedata.push({
          product_id,
          product_name: product.product_name,
          hsncode: product.hsncode,
          rate: product.rate,
          quantity: moq,
          discount: 0,
          gst: product.gst,
          amount: product.rate * moq,
        });
        opening_stock = 0;
        subTotal += amount;
        cgst += ((gst / 2) * amount) / 100;
        sgst += ((gst / 2) * amount) / 100;
      }

      total = subTotal + cgst + sgst;
      var gst = cgst + sgst;
      gst = Math.floor(gst);
      // Round off the total amount
      roundOff = total - Math.floor(total);

      function roundOffToOneOrZero(value) {
        return value >= 0.5 ? 1 : 0;
      }

      const decimalValue = roundOff;
      const roundedValue = roundOffToOneOrZero(decimalValue);

      const totalCost = Math.floor(total) + roundedValue; // total cost

      // Insert data into inv table
      await connection.query(
        "INSERT INTO inv (customer_id, order_id, invoice_id, unique_id, customer_type, subtotal, cgst, sgst, round_off, total, created_by, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          customer_id,
          order_id,
          invoice_id,
          unique_id,
          "Distributor",
          subTotal,
          cgst,
          sgst,
          roundOff,
          totalCost,
          customer_id,
          "Success",
        ]
      );

      // Debit from Wallet
      const [walletResult] = await connection2.query(
        "SELECT wallet FROM wallet WHERE unique_id = ?",
        [unique_id]
      );

      const walletBalance = walletResult[0].wallet;
      if (walletBalance < totalCost) {
        // Rollback the transaction if an error occurs
        await connection.rollback();
        return res
          .status(400)
          .json({ status: "fail", message: "Insufficient Wallet Balance" });
      }

      // Debit from Wallet and update in Wallet Summary
      const update_amount = Number(walletBalance) - Number(totalCost);

      await connection2.query(
        "UPDATE wallet SET wallet = ? WHERE unique_id = ?",
        [update_amount, unique_id]
      );

      const [results] = await connection2.query(
        "SELECT MAX(`tran_id`) as max_tran_id FROM walletsummary"
      );

      var tran_id_ = results[0].max_tran_id || 0;
      var tran_id_w_ = tran_id_ + 1;
      var description_ = `invoice_id ${invoice_id} and Order Cost Rs${totalCost}/- debited from your Wallet.`;

      const [update_wallet] = await connection2.query(
        "SELECT * FROM wallet WHERE unique_id = ?",
        [unique_id]
      );

      await connection2.query(
        "INSERT INTO walletsummary (unique_id, tran_id, type, amount, status, description, closing_balance) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          unique_id,
          tran_id_w_,
          "DR",
          totalCost,
          "Success",
          description_,
          update_wallet[0].wallet,
        ]
      );

      // Credit to Admin Wallet
      const [admin_wallet] = await connection2.query(
        "SELECT * FROM admin_wallet WHERE status = ?",
        ["Enable"]
      );

      var bal_amount = Number(admin_wallet[0].wallet) + Number(totalCost) - Math.floor(gst);
      var admin_wbal = Number(totalCost) - Math.floor(gst);
      
      await connection2.query(
        "UPDATE admin_wallet SET wallet = ? ,gst = gst + ? WHERE id  = ?",
        [bal_amount, gst, admin_wallet[0].id]
      );

      const [result] = await connection2.query(
        "SELECT MAX(`tran_id`) as max_tran_id FROM admin_wallet_summary"
      );

      var tran_id = result[0].max_tran_id || 0;
      var tran_id_w = tran_id + 1;
      var description = `invoice id ${invoice_id} Rs ${totalCost}/-  credited ${admin_wbal} to admin Wallet.`;

      const admin_summary = {
        tran_id: tran_id_w,
        unique_id: "bf508e4f-b685-11ec-9735-00163e0948d5",
        ac_type: "wallet",
        type: "CR",
        amount: admin_wbal,
        description: description,
        clo_bal: bal_amount,
        status: "Success",
      };

      await connection2.query("INSERT INTO admin_wallet_summary SET ?", [
        admin_summary,
      ]);
      // gst data insert in admin_wallet_summary
      const admin_summary_gst = {
        tran_id: tran_id_w + 2,
        unique_id: "bf508e4f-b685-11ec-9735-00163e0948d5",
        ac_type: "gst",
        type: "CR",
        amount: gst,
        description: `invoice id ${invoice_id} Rs ${gst} Credit in GST Wallet.`,
        clo_bal: admin_wallet[0].gst + gst,
        status: "Success",
      };

      await connection2.query("INSERT INTO admin_wallet_summary SET ?", [
        admin_summary_gst,
      ]);

      // Continue with the rest of your logic
      // Commit the transaction if everything is successful
      await connection.commit();
      await connection2.commit();
      return res.status(200).json({
        status_code: "1",
        status: "Success",
        data: {
          order: {
            order_id,
            invoice_id,
            customer_id: unique_id,
            customer_name: name,
          },
          products: responsedata,
          total: {
            "sub-Total": subTotal,
            Discount: 0,
            SGST: sgst,
            CGST: cgst,
            "Round Off": roundOff,
            Total: totalCost,
            Payment: totalCost,
            "Payment Mode": "wallet",
            Outstanding: 0,
          },
        },
      });
    }
  } catch (error) {
    console.error(error);
    // Rollback the transaction if an error occurs
    await connection.rollback();
    await connection2.rollback();
    return res.status(500).json({
      status_code: "2",
      status: "failed",
      message: "Failed to Conform Order",
    });
  } finally {
    connection.release();
    connection2.release();
  }
});

router.post("/get-invoice", requireLogin, async (req, res) => {
  const connection = await poolPromise().getConnection();

  try {
    const { date, page = 1, limit = 25 } = req.body;
    const { unique_id } = req.login;

    let query = `SELECT * FROM inv WHERE unique_id = ?`;
    const queryParams = [unique_id];

    if (date) {
      query += ` AND timestamp BETWEEN ? AND ? `;;
      queryParams.push(date + " 00:00:00", date + " 23:59:59",);
    }

    query += ` LIMIT ? OFFSET ?`;
    queryParams.push( limit, (page - 1) * limit);

    const [results] = await connection.query(query, queryParams);

    return res.status(200).json({
      status: "success",
      data: results,
    });
  } catch (error) {
    console.error(error.message);
    return res
      .status(500)
      .json({ status: "error", message: "Internal Server Error" });
  } finally {
    connection.release();
  }
});

router.get("/get-invoice-details/:orderId", requireLogin, async (req, res) => {
  const connection = await poolPromise().getConnection();

  try {
    const { orderId } = req.params;
    const { unique_id, customer_id, name } = req.login;

    // Fetching order details from the inv table
    const [orderResult] = await connection.query(
      "SELECT order_id, invoice_id, subtotal, cgst, sgst, round_off, total FROM inv WHERE order_id = ? AND unique_id = ?",
      [orderId, unique_id]
    );

    if (orderResult.length === 0) {
      return res
        .status(404)
        .json({ status: "fail", message: "Order not found" });
    }

    const orderDetails = {
      order_id: orderResult[0].order_id,
      invoice_id: orderResult[0].invoice_id,
      customer_id: customer_id,
      customer_name: name,
    };

    // Fetching product details from the inv_details table
    const [detailsResult] = await connection.query(
      "SELECT id AS inv_details_id, productid, productname, hsncode, rate, quantity, discount_type, discount, amount, total FROM inv_details WHERE order_id = ?",
      [orderId]
    );

    const productDetails = detailsResult.map((row) => ({
      product_id: row.productid,
      product_name: row.productname,
      hsncode: row.hsncode,
      rate: row.rate,
      quantity: row.quantity,
      discount_type: row.discount_type,
      discount: row.discount,
      amount: row.amount,
      total: row.total,
    }));

    const totalDetails = {
      subTotal: orderResult[0].subtotal,
      discount: 0,
      cgst: orderResult[0].cgst,
      sgst: orderResult[0].sgst,
      roundOff: orderResult[0].round_off,
      total: orderResult[0].total,
      Payment: orderResult[0].total,
      "Payment Mode": "Cass",
      Outstanding: 0,
    };

    return res.status(200).json({
      status: "success",
      data: {
        order: orderDetails,
        details: productDetails,
        total: totalDetails,
      },
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: "error", message: "Internal Server Error" });
  } finally {
    connection.release();
  }
});

//distributer onboarding CSP/REtailer start

router.get("/dst-search-stock", requireLogin, async (req, res) => {
  try {
    const { customer_id } = req.login;

    const connection = await poolPromise().getConnection();

    const [results] = await connection.query(
      "SELECT purchase_id AS Product_id, quantity FROM stock WHERE customer_id  = ?",
      [customer_id]
    );

    if (results.length === 0) {
      connection.release();
      return res.status(404).json({
        status: "Fail",
        message: "stock not found",
      });
    }

    connection.release();
    return res.status(200).json({
      status_code: "1",
      status: "Success",
      data: results,
    });
  } catch (error) {
    console.error(error.message);
    connection.release();
    return res.status(500).json({
      status: "Error",
      message: "Internal Server Error",
    });
  }
});


router.post("/dst-search-merchant", requireLogin, async (req, res) => {
  const connection = await poolPromise().getConnection();
  const connection2 = await poolPromise2().getConnection();

  try {
    const { mobile_number, product_id, pin_code, agent_id } = req.body;
    const { customer_id } = req.login;

    // Check if retailer data is available in login_data table
    const [distributorData] = await connection.query(
      "SELECT * FROM login WHERE customer_id = ?",
      [customer_id]
    );
    const [cspData] = await connection2.query(
      "SELECT * FROM login_data WHERE mobile = ?",
      [mobile_number]
    );

    const [fseData] = await connection.query(
      "SELECT * FROM fse WHERE agent_id = ?",
      [agent_id]
    );

    const fse_unique_id = fseData[0].unique_id;

    if (cspData.length > 0) {
      // Retailer data is available, check status
      const statusObject = {
        6: "Mobile Number Verification Pending",
        5: "Onboard Is Pending",
        4: "KYC Onboard Pending",
        3: "Territory Assign is Pending",
        2: "KYC Verification Pending",
        1: "Active",
        0: "Suspended",
      };

      return res.status(200).json({
        status_code: "04",
        status: "success",
        message: statusObject[cspData[0].status],
      });
    }

    //  distributor data not available, check stock
    const [stockData] = await connection.query(
      "SELECT * FROM stock WHERE purchase_id = ? AND unique_id = ?",
      [product_id, distributorData[0].unique_id]
    );

    if (stockData.length === 0) {
      // Stock not available
      connection.release();
      return res.status(200).json({
        status_code: "2",
        status: "failed",
        message:
          "This service is currently not available. Contact Distributor Admin.",
      });
    }

    // Stock available, verify pin code
    const [territoryData] = await connection.query(
      'SELECT * FROM territory WHERE unique_id = ? AND pincode = ? AND status = "Enable"',
      [fse_unique_id, pin_code]
    );

    if (territoryData.length === 0) {
      // Pin code not whitelisted
      connection.release();
      return res.status(200).json({
        status_code: "2",
        status: "failed",
        message: "FSE not activate in this pin code area.",
      });
    }

    // Pin code is whitelisted, perform activation
    const uniqueId = uuid.v4();
    const customerId = String(customer_id).slice(0,4) + Math.floor(10000 + Math.random() * 90000).toString();
    const applicationId = Date.now().toString() + Math.floor(10 + Math.random() * 90).toString();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Create csp in login_data table
    await connection2.query("INSERT INTO login_data SET ?", {
      user_type: "CSP",
      unique_id: uniqueId,
      application_id: applicationId,
      customer_id: customerId,
      mobile: mobile_number,
      otp: md5(SALT.concat(otp)),
      status: "6", // Default status is 6
    });

    // Create transaction in stock_summary table
    await connection.query("INSERT INTO stock_summary SET ?", {
      order_id: product_id,
      unique_id: uniqueId,
      transaction_type: "Debit",
      transaction_at: new Date(),
      product_id: product_id,
      quantity: 1, // Assuming 1 quantity for the activation
      opening_stock: 0,
      closing_stock: Number(stockData[0].quantity) - 1,
      description: `1 stock Debit for customer_id: ${customerId},application_id:${applicationId}`,
    });

    await connection.query(
      "UPDATE stock SET quantity = quantity - 1 WHERE purchase_id = ? AND unique_id = ?",
      [product_id, distributorData[0].unique_id]
    );

    // Send OTP to user mobile
    const response = await axios.get(
      `https://2factor.in/API/V1/1f985287-a3f0-11ee-8cbb-0200cd936042/SMS/+91${mobile_number}/${otp}/Onboarding+Confirmation`
    );
    console.log(response.data);

    connection.release();

    return res.status(200).json({
      status_code: "03",
      status: "success",
      customer_id: customerId,
      application_id: applicationId,
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

router.post("/dst-csp-verification", requireLogin, async (req, res) => {
  const connection = await poolPromise2().getConnection();

  try {
    const { application_id, otp } = req.body;
    const { unique_id } = req.login;

    let saltedOTP = SALT.concat(otp);
    var hashedOTP = md5(saltedOTP);

    // Fetch retailer details from the login_data table
    const [retailerResult] = await connection.query(
      'SELECT * FROM login_data WHERE  application_id = ? AND otp = ? AND status = "6"',
      [application_id, hashedOTP]
    );

    if (retailerResult.length === 0) {
      return res.status(200).json({
        status_code: "2",
        status: "failed",
        message: "Invalid OTP or Retailer not found",
      });
    }

    // Update status in login_data table from 6 to 5
    await connection.query(
      'UPDATE login_data SET status = "5" WHERE application_id = ?',
      [application_id]
    );

    return res.status(200).json({
      status_code: "01",
      status: "success",
      application_id: application_id,
      message: "Retailer Successfully Verified",
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      status_code: "2",
      status: "error",
      message: "Internal Server Error",
    });
  } finally {
    connection.release();
  }
});

router.post("/dst-merchant-onboard", requireLogin, async (req, res) => {
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
      shop_name,
      office_address,
      package_id,
    } = req.body;

    // Insert data into login_data and retailer tables
    await connection2.beginTransaction();

    // Check if the user exists with the given unique id
    const [userResult] = await connection2.query(
      "SELECT * FROM login_data WHERE application_id = ? AND status != ?",
      [application_id, "4"]
    );
    if (userResult.length === 0) {
      connection2.release();
      return res.status(200).json({
        status_code: "2",
        status: "failed",
        message: "User not found or status is already 4 (KYC Onboard Pending)",
      });
    }

    const user = userResult[0];

    console.log(
      process.env.callEko,
      "callEko vertual",
      typeof process.env.callEko
    );
    if (process.env.callEko !== "false") {
      // Call Third-Party API (Eko Onboard User)
      const ekoOnboardResponse = await savevirtualaccount(
        req,
        res,
        user.unique_id,
        user.trade_name || "no data", // need to change
        pan_number,
        residential_address // need to change
      );
      // Check if Third-Party API response is successful (status 0)
      if (ekoOnboardResponse.status !== 0) {
        connection2.release();
        return res.status(200).json({
          status_code: "2",
          status: "failed",
          message: "CSP onboarding failed with Third-Party API",
        });
      }
    }

    // Insert into login_data table
    await connection2.query(
      "UPDATE login_data SET status = ?, name = ?, package_id = ?, package_status = 'Pending' WHERE id = ?",
      ["4", name, package_id, user.id]
    );

    // Insert into retailer table
    await connection2.query(
      "INSERT INTO retailer (unique_id, email, date_of_birth, pan_number, aadhar_no, residential_address, shop_name, entity_type, office_address, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        user.unique_id,
        email,
        date_of_birth,
        pan_number,
        aadhar_number,
        JSON.stringify(residential_address),
        shop_name,
        entity_type,
        JSON.stringify(office_address),
        "KYC-Not Submitted",
      ]
    );

    const [packageDetailss] = await connection2.query(
      "SELECT * FROM scheme WHERE usertype = ? AND package_id = ?",
      ["CSP", package_id]
    );
    const packageDetails = packageDetailss[0];

    // Insert into schemesummary table
    await connection2.query(
      "INSERT INTO schemesummary (tran_at, order_id, unique_id, customer_id, packid, packname, price, gst, total, status, validity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        new Date(),
        application_id,
        user.unique_id,
        user.customer_id,
        package_id,
        packageDetails.packname,
        packageDetails.price,
        packageDetails.gst,
        packageDetails.total,
        "Pending",
        packageDetails.duration,
      ]
    );

    const [serviceData] = await connection2.execute(
      "SELECT * FROM service_with_package WHERE packages_id = ?",
      [package_id]
    );

    if (!serviceData.length) {
      connection.release();
      return res.status(500).json({
        success: false,
        message: "No services found for this package",
      });
    }

    const userData = serviceData.map((item) => [
      user.customer_id,
      item.packages_id,
      item.services_id,
      item.status,
      item.packages_name,
      item.services_name,
    ]);

    await connection2.query(
      "INSERT INTO users_services (customer_id, packages_id, service_id, status, `packages_name`, `service_name`) VALUES ?",
      [userData]
    );

    // Insert into wallet table
    await connection2.query(
      "INSERT INTO wallet (user_type, unique_id, wallet, hold, unsettle, status) VALUES (?, ?, ?, ?, ?, ?)",
      ["CSP", user.unique_id, 0, 0, 0, "Enable"]
    );

    await connection2.commit();
    connection2.release();

    return res.status(200).json({
      status_code: "05",
      status: "success",
      application_id,
      message: "CSP successfully onboarded. Onboard KYC pending",
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

router.post("/dst-onboard-merchant-kyc", requireLogin, upload3.fields([
    { name: "photo", maxCount: 1 },
    { name: "pan_front", maxCount: 1 },
    { name: "aadhar_front", maxCount: 1 },
    { name: "aadhar_back", maxCount: 1 },
  ]),
  async (req, res) => {
    const connection = await poolPromise2().getConnection();

    try {
      const { application_id } = req.body;

      // Check if the user exists with the given unique id
      const [userResult] = await connection.query(
        "SELECT * FROM login_data WHERE application_id = ?",
        [application_id]
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

      const panFrontPath = req.files["pan_front"][0].filename;
      const aadharFrontPath = req.files["aadhar_front"][0].filename;
      const aadharBackPath = req.files["aadhar_back"][0].filename;

      await connection.query(
        "UPDATE retailer SET photo = ?, pan_front = ?, aadhar_front = ?, aadhar_back = ?, status = ? WHERE unique_id = ?",
        [
          panFrontPath,
          panFrontPath,
          aadharFrontPath,
          aadharBackPath,
          "KYC-Submit",
          user.unique_id,
        ]
      );

      // Update status code in login_data table
      await connection.query(
        "UPDATE login_data SET status = ? WHERE application_id = ?",
        ["3", application_id]
      );

      connection.release();

      return res.status(200).json({
        status_code: "06",
        status: "success",
        application_id,
        message: "Activated Merchant/CSP Services",
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

router.post("/dst-activated-services", requireLogin, async (req, res) => {
  const connection = await poolPromise2().getConnection();

  try {
    const {
      application_id,
      model_name,
      device_number,
      mode_of_payment,
      agent_id,
    } = req.body;

    const { created_by, customer_id, unique_id } = req.login;

    let distributor_id = unique_id;
    let asm_id = created_by;
    // Check if the user exists with the given unique id
    const [userResult] = await connection.query(
      "SELECT * FROM login_data WHERE application_id = ?",
      [application_id]
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
      "SELECT * FROM users_services WHERE customer_id = ? AND service_id = 41 AND status = ?",
      [user.customer_id, "Enable"]
    );

    if (userServices.length === 0) {
      // Insert data in mapping table
      await connection.query(
        "INSERT INTO mapping (unique_id, application_id, services_type, created_by ,agent_id, distributor_id, asm_id) VALUES ( ?, ?, ?, ?, ?, ?, ?) ",
        [
          user.unique_id,
          application_id,
          "None",
          agent_id,
          agent_id,
          distributor_id,
          asm_id,
        ]
      );
    } else {
      // Insert data in mapping table
      await connection.query(
        "INSERT INTO mapping (unique_id, application_id, services_type, created_by ,agent_id, distributor_id, asm_id, model_name, device_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ",
        [
          user.unique_id,
          application_id,
          "AePS",
          agent_id,
          agent_id,
          distributor_id,
          asm_id,
          model_name,
          device_number,
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

    // Update status code in login_data table
    await connection.query(
      "UPDATE login_data SET status = ? WHERE application_id = ?",
      ["2", application_id]
    );

    const [scheme] = await connection.query(
      "SELECT * FROM scheme WHERE package_id = ?",
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
        "UPDATE login_data SET status = ?, package_activated = ?, package_expiry = ?, package_status = 'Activate' WHERE application_id = ?",
        ["2", activedate, expiredate, application_id]
      );
      // Update status, active date, expire date in scheme summary table
      await connection.query(
        "UPDATE schemesummary SET status = ?, activedate = ?, expiredate = ? WHERE unique_id = ?",
        ["Success", activedate, expiredate, user.unique_id]
      );
    }

    connection.release();

    return res.status(200).json({
      status_code: "1",
      status: "success",
      application_id,
      message: "Retailer is Successfully Created ",
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

//distributer onboard CSP/REtailer end

//FSE onboard CSP/REtailer start

//In ERP Page Add This Field Sales Executive APIs

router.get("/search-stock", requireFseLogin, async (req, res) => {
  try {
    const { distributor_id } = req.login;

    const connection = await poolPromise().getConnection();

    const [results] = await connection.query(
      "SELECT purchase_id AS Product_id, quantity FROM stock WHERE customer_id  = ?",
      [distributor_id]
    );

    if (results.length === 0) {
      connection.release();
      return res.status(404).json({
        status_code: "2",
        status: "Failed",
        message: "stock not found",
      });
    }

    connection.release();
    return res.status(200).json({
      status_code: "1",
      status: "Success",
      data: results,
    });
  } catch (error) {
    console.error(error.message);
    connection.release();
    return res.status(500).json({
      status_code: "2",
      status: "Failed",
      message: "Internal Server Error",
    });
  }
});

// router.post("/search-merchant", requireFseLogin, async (req, res) => {
//   const connection = await poolPromise().getConnection();
//   const connection2 = await poolPromise2().getConnection();
//   const { distributor_id, unique_id } = req.login;
//   try {
//     const { mobile_number, product_id, pin_code } = req.body;

//     const [distributorData] = await connection.query(
//       "SELECT * FROM login WHERE customer_id = ?",
//       [distributor_id]
//     );
//     const [cspData] = await connection.query(
//       "SELECT * FROM login WHERE mobile_number= ?",
//       [mobile_number]
//     );

//     if (cspData.length > 0) {
//       // Retailer data is available, check status
//       const statusObject = {
//         6: "Mobile Number Verification Pending",
//         5: "Onboard Is Pending",
//         4: "KYC Onboard Pending",
//         3: "Territory Assign is Pending",
//         2: "KYC Verification Pending",
//         1: "Active",
//         0: "Suspended",
//       };

//       return res.status(200).json({
//         status_code: "004",
//         status: "success",
//         message: statusObject[cspData[0].status],
//       });
//     }

//     //  distributor data not available, check stock
//     const [stockData] = await connection.query(
//       "SELECT * FROM stock WHERE purchase_id = ? AND unique_id = ?",
//       [product_id, distributorData[0].unique_id]
//     );

//     if (stockData.length === 0) {
//       // Stock not available
//       connection.release();
//       return res.status(200).json({
//         status_code: "2",
//         status: "failed",
//         message:
//           "This service is currently not available. Contact Distributor Admin.",
//       });
//     }

//     // Stock available, verify pin code
//     const [territoryData] = await connection.query(
//       'SELECT * FROM territory WHERE unique_id = ? AND pincode = ? AND status = "Enable"',
//       [unique_id, pin_code]
//     );

//     if (territoryData.length === 0) {
//       // Pin code not whitelisted
//       connection.release();
//       return res.status(200).json({
//         status_code: "2",
//         status: "failed",
//         message: "FSE not activate in this pin code area.",
//       });
//     }

//     // Pin code is whitelisted, perform activation
//     const uniqueId = uuid.v4();
//     const customerId = Math.floor(10000 + Math.random() * 90000).toString();
//     const applicationId = Date.now().toString();
//     const otp = Math.floor(100000 + Math.random() * 900000).toString();

//     // Create csp in login_data table
//     await connection2.query("INSERT INTO login_data SET ?", {
//       user_type: "CSP",
//       unique_id: uniqueId,
//       application_id: applicationId,
//       customer_id: customerId,
//       mobile: mobile_number,
//       otp: md5(SALT.concat(otp)),
//       status: "6", // Default status is 6
//     });

//     // Create transaction in stock_summary table
//     await connection.query("INSERT INTO stock_summary SET ?", {
//       order_id: product_id,
//       unique_id: uniqueId,
//       transaction_type: "Debit",
//       transaction_at: new Date(),
//       product_id: product_id,
//       quantity: "1", // Assuming 1 quantity for the activation
//       opening_stock: "0",
//       closing_stock: Number(stockData[0].closing_stock) - 1,
//       description: `1 stock Debit for customer_id: ${customerId},application_id:${applicationId}`,
//     });

//     await connection.query(
//       "UPDATE stock SET quantity = quantity - 1 WHERE unique_id = ?",
//       [distributorData[0].unique_id]
//     );

//     // Send OTP to user mobile
//     const response = await axios.get(
//       `https://2factor.in/API/V1/1f985287-a3f0-11ee-8cbb-0200cd936042/SMS/+91${mobile_number}/${otp}/Onboarding+Confirmation`
//     );
//     console.log(response.data);

//     connection.release();

//     return res.status(200).json({
//       status_code: "03",
//       status: "success",
//       customer_id: customerId,
//       application_id: applicationId,
//     });
//   } catch (error) {
//     console.error(error.message);
//     return res.status(500).json({
//       status_code: "2",
//       status: "failed",
//       message: "Internal Server Error",
//     });
//   } finally {
//     connection.release();
//   }
// });

router.post("/search-merchant", requireFseLogin, async (req, res) => {
  const connection = await poolPromise().getConnection();
  const connection2 = await poolPromise2().getConnection();
  const { distributor_id, unique_id } = req.login;
  try {
    const { mobile_number, product_id, pin_code } = req.body;

    const [distributorData] = await connection.query(
      "SELECT * FROM login WHERE customer_id = ?",
      [distributor_id]
    );
    const [cspData] = await connection.query(
      "SELECT * FROM login WHERE mobile_number= ?",
      [mobile_number]
    );

    if (cspData.length > 0) {
      // Retailer data is available, check status
      const statusObject = {
        6: "Mobile Number Verification Pending",
        5: "Onboard Is Pending",
        4: "KYC Onboard Pending",
        3: "Territory Assign is Pending",
        2: "KYC Verification Pending",
        1: "Active",
        0: "Suspended",
      };

      return res.status(200).json({
        status_code: "004",
        status: "success",
        message: statusObject[cspData[0].status],
      });
    }

    //  distributor data not available, check stock
    const [stockData] = await connection.query(
      "SELECT * FROM stock WHERE purchase_id = ? AND unique_id = ?",
      [product_id, distributorData[0].unique_id]
    );

    if (stockData.length === 0) {
      // Stock not available
      connection.release();
      return res.status(200).json({
        status_code: "2",
        status: "failed",
        message:
          "This service is currently not available. Contact Distributor Admin.",
      });
    }

    // Stock available, verify pin code
    const [territoryData] = await connection.query(
      'SELECT * FROM territory WHERE unique_id = ?, pincode = ? AND status = "Enable"',
      [unique_id, pin_code]
    );

    if (territoryData.length === 0) {
      // Pin code not whitelisted
      connection.release();
      return res.status(200).json({
        status_code: "2",
        status: "failed",
        message: "FSE not activate in this pin code area.",
      });
    }

    // Pin code is whitelisted, perform activation
    const uniqueId = uuid.v4();
    const customerId = String(distributor_id).slice(0 ,4) + Math.floor(10000 + Math.random() * 90000).toString();
    const applicationId = Date.now().toString() + Math.floor(10 + Math.random() * 90).toString();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Create csp in login_data table
    await connection2.query("INSERT INTO login_data SET ?", {
      user_type: "CSP",
      unique_id: uniqueId,
      application_id: applicationId,
      customer_id: customerId,
      mobile: mobile_number,
      otp: md5(SALT.concat(otp)),
      status: "6", // Default status is 6
    });

    // Create transaction in stock_summary table
    await connection.query("INSERT INTO stock_summary SET ?", {
      order_id: product_id,
      unique_id: uniqueId,
      transaction_type: "Debit",
      transaction_at: new Date(),
      product_id: product_id,
      quantity: 1, // Assuming 1 quantity for the activation
      opening_stock: 0,
      closing_stock: Number(stockData[0].quantity) - 1,
      description: `1 stock Debit for customer_id: ${customerId},application_id:${applicationId}`,
    });

    await connection.query(
      "UPDATE stock SET quantity = quantity - 1 WHERE purchase_id = ? AND unique_id = ?",
      [product_id, distributorData[0].unique_id]
    );

    // Send OTP to user mobile
    const response = await axios.get(
      `https://2factor.in/API/V1/1f985287-a3f0-11ee-8cbb-0200cd936042/SMS/+91${mobile_number}/${otp}/Onboarding+Confirmation`
    );
    console.log(response.data);

    connection.release();

    return res.status(200).json({
      status_code: "03",
      status: "success",
      customer_id: customerId,
      application_id: applicationId,
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

router.post("/csp-verification", requireFseLogin, async (req, res) => {
  const connection = await poolPromise2().getConnection();

  try {
    const { application_id, otp } = req.body;
    const { unique_id } = req.login;
    let saltedOTP = SALT.concat(otp);
    var hashedOTP = md5(saltedOTP);

    // Fetch retailer details from the login_data table
    const [retailerResult] = await connection.query(
      'SELECT * FROM login_data WHERE  application_id = ? AND otp = ? AND status = "7"',
      [application_id, hashedOTP]
    );

    if (retailerResult.length === 0) {
      return res.status(200).json({
        status_code: "2",
        status: "failed",
        message: "Invalid OTP or Retailer not found",
      });
    }

    // Update status in login_data table from 6 to 5
    await connection.query(
      'UPDATE login_data SET status = "5" WHERE application_id = ?',
      [application_id]
    );

    return res.status(200).json({
      status_code: "01",
      status: "success",
      application_id: application_id,
      message: "Retailer Successfully Verified",
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

router.post("/merchant-onboard", requireFseLogin, async (req, res) => {
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
      shop_name,
      office_address,
      package_id,
    } = req.body;

    // Insert data into login_data and retailer tables
    await connection2.beginTransaction();

    // Check if the user exists with the given unique id
    const [userResult] = await connection2.query(
      "SELECT * FROM login_data WHERE application_id = ? AND status != ?",
      [application_id, "4"]
    );
    if (userResult.length === 0) {
      connection2.release();
      return res.status(200).json({
        status_code: "2",
        status: "failed",
        message: "User not found or status is already 4 (KYC Onboard Pending)",
      });
    }

    const user = userResult[0];

    console.log(
      process.env.callEko,
      "callEko vertual",
      typeof process.env.callEko
    );
    if (process.env.callEko !== "false") {
      // Call Third-Party API (Eko Onboard User)
      const ekoOnboardResponse = await savevirtualaccount(
        req,
        res,
        user.unique_id,
        user.trade_name || "no data", // need to change
        pan_number,
        residential_address // need to change
      );
      // Check if Third-Party API response is successful (status 0)
      if (ekoOnboardResponse.status !== 0) {
        connection2.release();
        return res.status(200).json({
          status_code: "2",
          status: "failed",
          message: "CSP onboarding failed with Third-Party API",
        });
      }
    }

    // Insert into login_data table
    await connection2.query(
      "UPDATE login_data SET status = ?, name = ?, package_id = ?, package_status = 'Pending' WHERE id = ?",
      ["4", name, package_id, user.id]
    );

    // Insert into retailer table
    await connection2.query(
      "INSERT INTO retailer (unique_id, email, date_of_birth, pan_number, aadhar_no, residential_address, shop_name, entity_type, office_address, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        user.unique_id,
        email,
        date_of_birth,
        pan_number,
        aadhar_number,
        JSON.stringify(residential_address),
        shop_name,
        entity_type,
        JSON.stringify(office_address),
        "KYC-Not Submitted",
      ]
    );

    const [packageDetailss] = await connection2.query(
      "SELECT * FROM scheme WHERE usertype = ? AND package_id = ?",
      ["CSP", package_id]
    );
    const packageDetails = packageDetailss[0];

    // Insert into schemesummary table
    await connection2.query(
      "INSERT INTO schemesummary (tran_at, order_id, unique_id, customer_id, packid, packname, price, gst, total, status, validity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        new Date(),
        application_id,
        user.unique_id,
        user.customer_id,
        package_id,
        packageDetails.packname,
        packageDetails.price,
        packageDetails.gst,
        packageDetails.total,
        "Pending",
        packageDetails.duration,
      ]
    );

    const [serviceData] = await connection2.execute(
      "SELECT * FROM service_with_package WHERE packages_id = ?",
      [package_id]
    );

    if (!serviceData.length) {
      connection.release();
      return res.status(500).json({
        success: false,
        message: "No services found for this package",
      });
    }

    const userData = serviceData.map((item) => [
      user.customer_id,
      item.packages_id,
      item.service_id,
      item.status,
      item.packname,
      item.services_name,
    ]);

    await connection2.query(
      "INSERT INTO users_services (customer_id, packages_id, service_id, status, `packages_name`, `service_name`) VALUES ?",
      [userData]
    );

    // Insert into wallet table
    await connection2.query(
      "INSERT INTO wallet (user_type, unique_id, wallet, hold, unsettle, status) VALUES (?, ?, ?, ?, ?, ?)",
      ["CSP", user.unique_id, 0, 0, 0, "Enable"]
    );

    await connection2.commit();
    connection2.release();

    return res.status(200).json({
      status_code: "05",
      status: "success",
      application_id,
      message: "CSP successfully onboarded. Onboard KYC pending",
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

// provide merchant userdocs path in storage3
router.post("/onboard-merchant-kyc",
  requireFseLogin,
  upload3.fields([
    { name: "photo", maxCount: 1 },
    { name: "pan_front", maxCount: 1 },
    { name: "aadhar_front", maxCount: 1 },
    { name: "aadhar_back", maxCount: 1 },
  ]),
  async (req, res) => {
    const connection = await poolPromise2().getConnection();

    try {
      const { application_id } = req.body;

      // Check if the user exists with the given unique id
      const [userResult] = await connection.query(
        "SELECT * FROM login_data WHERE application_id = ?",
        [application_id]
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

      const panFrontPath = req.files["pan_front"][0].filename;
      const aadharFrontPath = req.files["aadhar_front"][0].filename;
      const aadharBackPath = req.files["aadhar_back"][0].filename;

      await connection.query(
        "UPDATE retailer SET photo = ?, pan_front = ?, aadhar_front = ?, aadhar_back = ?, status = ? WHERE unique_id = ?",
        [
          panFrontPath,
          panFrontPath,
          aadharFrontPath,
          aadharBackPath,
          "KYC-Submit",
          user.unique_id,
        ]
      );

      // Update status code in login_data table
      await connection.query(
        "UPDATE login_data SET status = ? WHERE application_id = ?",
        ["3", application_id]
      );

      connection.release();

      return res.status(200).json({
        status_code: "06",
        status: "success",
        application_id,
        message: "Activated Merchant/CSP Services",
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

// fse data table pendind for ids in mapping
router.post("/activated-services", requireFseLogin, async (req, res) => {
  const connection = await poolPromise2().getConnection();

  try {
    const { application_id, model_name, device_number, mode_of_payment } =
      req.body;
    const { unique_id, agent_id, distributor_id, asm_id } = req.login;
    // Check if the user exists with the given unique id
    const [userResult] = await connection.query(
      "SELECT * FROM login_data WHERE application_id = ?",
      [application_id]
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
      "SELECT * FROM users_services WHERE customer_id = ? AND service_id = 41 AND status = ?",
      [user.customer_id, "Enable"]
    );

    if (userServices.length === 0) {
      // Insert data in mapping table
      await connection.query(
        "INSERT INTO mapping (unique_id, application_id, services_type, created_by ,agent_id, distributor_id, asm_id) VALUES ( ?, ?, ?, ?, ?, ?, ?) ",
        [
          user.unique_id,
          application_id,
          "None",
          agent_id,
          agent_id,
          unique_id,
          asm_id,
        ]
      );
    } else {
      // Insert data in mapping table
      await connection.query(
        "INSERT INTO mapping (unique_id, application_id, services_type, created_by ,agent_id, distributor_id, asm_id, model_name, device_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ",
        [
          user.unique_id,
          application_id,
          "AePS",
          agent_id,
          agent_id,
          unique_id,
          asm_id,
          model_name,
          device_number,
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

    // Update status code in login_data table
    await connection.query(
      "UPDATE login_data SET status = ? WHERE application_id = ?",
      ["2", application_id]
    );

    const [scheme] = await connection.query(
      "SELECT * FROM scheme WHERE package_id = ?",
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
        "UPDATE login_data SET status = ?, package_activated = ?, package_expiry = ?, package_status = 'Activate' WHERE application_id = ?",
        ["2", activedate, expiredate, application_id]
      );
      // Update status, active date, expire date in scheme summary table
      await connection.query(
        "UPDATE schemesummary SET status = ?, activedate = ?, expiredate = ? WHERE unique_id = ?",
        ["Success", activedate, expiredate, user.unique_id]
      );
    }

    connection.release();

    return res.status(200).json({
      status_code: "1",
      status: "success",
      application_id,
      message: "Retailer is Successfully Created ",
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

//FSE onboard CSP/REtailer end

module.exports = router;
