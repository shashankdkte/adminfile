const moment = require('moment-timezone');
const poolPromise = require("../util/connnectionPromise");
const axios = require("axios");

const smsapi = async (usertype, func, mobile, ...variables) => {
    
  const connection = await poolPromise().getConnection();
    try {
        const templateQuery = 'SELECT * FROM sms_template WHERE `function` = ? AND status = ?';
        const templateValues = [func, 1];
        const [smstemplate] = await connection.query(templateQuery, templateValues);
        console.log(smstemplate);

        if (smstemplate.length > 0) {
            const { templates, templateid } = smstemplate[0];

            let message = templates;
            variables.forEach((variable, index) => {
                const varPlaceholder = `VAR${index + 1}`;
                message = message.replace(new RegExp(varPlaceholder, 'g'), variable);
            });

            const smsGatewayQuery = 'SELECT * FROM sms_gateway WHERE sms_gateway.status = ?';
            const smsGatewayValues = [1];
            const [smsapicode] = await connection.query(smsGatewayQuery, smsGatewayValues);
           
            const { api, user_id, password, sender_id,id:gateway_id } = smsapicode[0];

            const finalurl = api
                .replace('USERID', user_id)
                .replace('PASSWORD', password)
                .replace('SENDERID', sender_id)
                .replace('MOBILE', mobile)
                .replace('MESSAGE', message)
                .replace('TEMPLATE', templateid)
                .replace(/\s/g, '%20');
            
            const settings = { method: 'GET' };
        
           
            console.log(finalurl);
            console.log(gateway_id)
 if (gateway_id === 1)
    {
     result = await fetch(finalurl, settings).then((res) => res.text()).catch(err => err);

     let msgstatus = "";
     if (!(result[0] === "S"))
     {
         msgstatus= result.replace(/<br>/, '');
     }
     console.log(msgstatus);
      const smsHistoryQuery =
      "INSERT INTO smshistory (message, mobile, errorcode,msgstatus, templateid, messageurl, date,response) VALUES (?, ?, ?, ?, ?,?,?,?)";
    const smsHistoryValues = [message, mobile,errorcode="",msgstatus , templateid, finalurl, moment().format('DD-MM-YYYY'),result];
     await connection.query(smsHistoryQuery, smsHistoryValues);
    }
    else
    { 
     result = await fetch(finalurl, settings).then((res) => res.json()).catch(err => console.log(err));
     const { ErrorCode, ErrorMessage } = result;
    const msgstatus = ErrorMessage.split('.');
    const smsHistoryQuery = 'INSERT INTO smshistory (message, mobile, errorcode, msgstatus, templateid, messageurl, date,response) VALUES (?, ?, ?, ?, ?, ?, ?,?)';
    const smsHistoryValues = [message, mobile, ErrorCode, msgstatus[0] + msgstatus[1], templateid, finalurl, moment().format('DD-MM-YYYY'),result];
    await connection.query(smsHistoryQuery, smsHistoryValues);
    }
           
        }
    } catch (err) {
        console.error(err);
    } finally {
        connection.release();
    }
};

// Example usage:
// smsapi('admin', 'otp_send', '+123456789', '123456', '3 min msgstatus');

module.exports = smsapi