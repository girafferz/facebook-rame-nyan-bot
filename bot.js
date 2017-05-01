//
// This is main file containing code implementing the Express server and functionality for the Express echo bot.
//
'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const path = require('path');
const host = 'https://petal-bus.glitch.me/'
const ramenConfig = require('./ramenConfig')
const _ = require('underscore')
const argConfig = require('./argConfig')
let app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

// Webhook validation
app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
    //console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);          
  }
});

// Message processing
app.post('/webhook', function (req, res) {
  //console.log(req.body);
  var data = req.body;

  // Make sure this is a page subscription
  if (data.object === 'page') {
    
    // Iterate over each entry - there may be multiple if batched
    data.entry.forEach(function(entry) {
      var pageID = entry.id;
      var timeOfEvent = entry.time;

      // Iterate over each messaging event
      entry.messaging.forEach(function(event) {
        if (event.message) {
          receivedMessage(event);
        } else if (event.postback) {
          //receivedPostback(event);   
        } else {
          console.log("Webhook received unknown event: ", event);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know
    // you've successfully received the callback. Otherwise, the request
    // will time out and we will keep trying to resend.
    res.sendStatus(200);
  }
});

function checkLength(msg){
  console.log('-----------67----------')
  if(!msg) return false
  let kekka = msg.split(" ");
  if (kekka.length !== 3){
    return false
  } else {
    console.log('-----------93----------')
    return true
  } 
}

// Incoming events handling
function receivedMessage(event) {
//  console.log('-----------ramenConfig----------')
//  console.log(ramenConfig)
//  console.log(ramenConfig.data)
  
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log("Received message for user %d and page %d at %d with message:", 
  senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var messageId = message.mid;

  var messageText = message.text;
  var messageAttachments = message.attachments;

  if (messageText) {
    if (!checkLength(messageText)) {
        sendTextMessage(senderID, "plz send a message like below\n"
                        + "[location] [food-type] [review-star]\n"
                        + "(3words and be splitted by space, english only))\n\n"
                        + "aka wa 2 (赤坂 和食 星2)\n"
                        + "koji you 3 (麹町 洋食 星3)\n"
                        + "hanzo ramen 2 (半蔵門 ラーメン 星2)\n"
                        + "hanzo sakana 3 (半蔵門 魚 星3)\n"
                        + "ropp miso 2 (六本木 味噌ラーメン 星2)\n"
                        + "shibu ie all (渋谷 家系 星全種)\n"
                       );
      return      
    }
    
    var kekka = messageText.split(" ");
    var match = false
    match = _.find(argConfig.firstList, function(obj){ return obj == kekka[0] })
    if(!match) {
      sendTextMessage(senderID, "these locations are available [" + argConfig.firstList.join(',') + "]");
      return
    }

    match = _.find(argConfig.secondList, function(obj){ return obj == kekka[1] })
    if(!match) {
      sendTextMessage(senderID, "these food tyes are available [" + argConfig.secondList.join(',') + "]");
      return
    }

    // If we receive a text message, check to see if it matches a keyword
    // and send back the template example. Otherwise, just echo the text we received.
    sendRamen(senderID, messageText)
    sendTextMessage(senderID, messageText);
  } else if (messageAttachments) {
    sendTextMessage(senderID, "plz text me!");
  }
}

function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  };
  callSendAPI(messageData);
}

var elem0 = {
title: "Jirorian",
subtitle: "Next-generation Ramen Restaurant",
item_url: "https://tabelog.com/tokyo/A1308/A130801/13184422/",               
image_url: "https://tabelog.ssl.k-img.com/restaurant/images/Rvw/40445/640x640_rect_40445111.jpg"
}
 
var buttons = [
              {type: "web_url",url: host + "/ilikeit",title: "like it"}, 
              {type: "web_url",url: host + "/nope",title: "nope"}, 
                      {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for first bubble",
            }]

function sendRamen(recipientId, messageText) {
     
  
  
    var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [
            {
              title: "Jirorian",subtitle: "Next-generation Ramen Restaurant",
              item_url: "https://tabelog.com/tokyo/A1308/A130801/13184422/",               
              image_url: "https://tabelog.ssl.k-img.com/restaurant/images/Rvw/40445/640x640_rect_40445111.jpg",
            //buttons: ,
          }, {
            title: "touch",
            subtitle: "Your Hands, Now in VR",
            item_url: "https://www.oculus.com/en-us/touch/",               
            image_url: "http://messengerdemo.parseapp.com/img/touch.png",
            
          }, elem0,elem0,elem0,elem0,elem0,elem0,elem0,elem0]
        }
      }
    }
  };  

  callSendAPI(messageData);  
}

function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      console.log("Successfully sent generic message with id %s to recipient %s", 
        messageId, recipientId);
    } else {
      console.error("Unable to send message.");
      console.error(response);
      console.error(error);
    }
  });  
}

// Set Express to listen out for HTTP requests
var server = app.listen(process.env.PORT || 3000, function () {
  console.log("Listening on port %s", server.address().port);
});
