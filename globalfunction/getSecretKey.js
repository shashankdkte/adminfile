const crypto = require("crypto");
const axios = require("axios");
const qs = require('qs');
const moment = require("moment-timezone");

async function getSecretKeyAndTimeStamp()
{
  
  const key = "b977803d-0218-456e-a676-79de8c42f4b6";
  const encodedKey = Buffer.from(key).toString("base64");
  
    const Timestamp = Date.now().toString();
    const signature = crypto
        .createHmac("sha256", encodedKey)
        .update(Timestamp)
    .digest("binary");

  const secretKey = Buffer.from(signature, "binary").toString("base64");
  console.log(secretKey)
    return {
        secretKey,
        Timestamp
    };

}
async function checkDetails(details) {
  try {
      
    const { pan_number, name, email, residential_address, date_of_birth, shop_name
    ,secretKey,timestamp} = details;
    let data = qs.stringify({
      'initiator_id': '9830299198',
      'pan_number': pan_number,
      'mobile': '9830299198',
       'first_name': name.split(' ')[0],
        'last_name': name.split(' ')[1],
        'email': email,
      'residence_address': JSON.stringify(residential_address),
        'dob': date_of_birth,
  'shop_name': shop_name 
    });
    console.log(data);
    let ekoconfig = {
      method: 'put',
      maxBodyLength: Infinity,
      url: 'https://api.eko.in:25002/ekoicici/v1/user/onboard',
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/x-www-form-urlencoded',
        'developer_key': process.env.ekodeveloper_key,
        'secret-key': secretKey,
        'secret-key-timestamp': timestamp
      },
      data: data
    };

    response = await axios.request(ekoconfig);
    return {requestDetails:ekoconfig,details_data :response.data};
  
   

  } catch (error) {
    console.log(error);
    
  }
}
module.exports = {
  getSecretKeyAndTimeStamp,
  checkDetails,
};