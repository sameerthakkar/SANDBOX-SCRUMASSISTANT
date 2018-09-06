/*-----------------------------------------------------------------------------
A simple Language Understanding (LUIS) bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');
var botbuilder_azure = require("botbuilder-azure");
const cron = require("node-cron");
var dataMap = {};
var appendData = true;
var currentDialog = "";
var address = JSON.parse("{\"id\":\"1536229691387\",\"channelId\":\"skype\",\"user\":{\"id\":\"29:1f-ZGEa9WTsGODII4h-2Z1AcSlSuevCEq6w_rt1f7-f8\"},\"conversation\":{\"id\":\"29:1f-ZGEa9WTsGODII4h-2Z1AcSlSuevCEq6w_rt1f7-f8\"},\"bot\":{\"id\":\"28:55b7bdd5-da0a-4053-a010-6280955ce335\",\"name\":\"scrumAssistant\"},\"serviceUrl\":\"https:\/\/smba.trafficmanager.net\/apis\/\"}");
// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    openIdMetadata: process.env.BotOpenIdMetadata 
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

/*----------------------------------------------------------------------------------------
* Bot Storage: This is a great spot to register the private state storage for your bot. 
* We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
* For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
* ---------------------------------------------------------------------------------------- */

var inMemoryStorage = new builder.MemoryBotStorage();

// Create your bot with a function to receive messages from the user
// This default message handler is invoked if the user's utterance doesn't
// match any intents handled by other dialogs.

// var bot = new builder.UniversalBot(connector, function (session, args) {
//     session.send('You reached the default message handler. You said \'%s\'.', session.message.text);
// });

var bot = new builder.UniversalBot(connector, [
    function (session, result, next) {
        session.send("Welcome to your Scrum Assistant");
        session.beginDialog('startScrumConfirm');
    }, 
    function (session, result, next) {
        session.beginDialog('scrumYesterday');
    },

    function (session, result, next) {
        session.beginDialog('scrumTodayUpdate');
    },
    function (session, result, next) {
        session.beginDialog('scrumBlocker');
    },
    function (session, result, next) {
        session.send('Thanks for your response.');
        session.endDialog();   
    },
]);

//bot.beginDialog(address, 'startScrum');

//  cron.schedule("* * * * *", function() {
//       bot.beginDialog({
//           to: {
//             address: "{\"id\":\"1536229691387\",\"channelId\":\"skype\",\"user\":{\"id\":\"29:1f-ZGEa9WTsGODII4h-2Z1AcSlSuevCEq6w_rt1f7-f8\"},\"conversation\":{\"id\":\"29:1f-ZGEa9WTsGODII4h-2Z1AcSlSuevCEq6w_rt1f7-f8\"},\"bot\":{\"id\":\"28:55b7bdd5-da0a-4053-a010-6280955ce335\",\"name\":\"scrumAssistant\"},\"serviceUrl\":\"https:\/\/smba.trafficmanager.net\/apis\/\"}",
//             channelId: "skype",
//             id: "29:1f-ZGEa9WTsGODII4h-2Z1AcSlSuevCEq6w_rt1f7-f8",
//             isBot: false
//           },
//           from: {
//             address: "localdev",
//             channelId: "bot",
//             id: "28:55b7bdd5-da0a-4053-a010-6280955ce335",
//             isBot: true
//           }
//         }
//     )});
    
   


// bot.beginDialog({
//      text: "I'm sending you a proactive message!",
//      language: "en",
//      to: { address: "pavisingh1989", channelId: "skype" , id: "29:1f-ZGEa9WTsGODII4h-2Z1AcSlSuevCEq6w_rt1f7-f8"},
//      from: { address: "stuffbot", channelId: "emulator", id: "stuffbot" }
//  });
 
bot.dialog('startScrum', [
    function (session, result, next) {
        console.log('session user -----> ' + session.message.user);
        session.send("Welcome to your Scrum Assistant");
        session.beginDialog('startScrumConfirm');
    }, 
    function (session, result, next) {
        session.beginDialog('scrumYesterday');
    },

    function (session, result, next) {
        session.beginDialog('scrumTodayUpdate');
    },
    function (session, result, next) {
        session.beginDialog('scrumBlocker');
    },
    function (session, result, next) {
        session.send('Thanks for your response.');
        session.endDialog();   
    },
]);

bot.dialog('startScrumConfirm', [
    function (session) {
        builder.Prompts.confirm(session, "Hope you are doing fine!! Should we get started with standup ?");
    },
    function (session, results) {
        if(!results.response) {
            session.send('No problem lets connect some time later !!');
            session.endDialog();   
        } else {
            session.endDialogWithResult(results);
        }
       
    }
]);

bot.dialog('scrumYesterday', [
    function (session, args) {
         setCurrentDialog("scrumYesterday");
        if(args && args.reprompt) {
          appendData = true;
          builder.Prompts.text(session, "Ok. What else?");            
        } else {
          appendData = false;
          builder.Prompts.text(session, "Can you let me know what you worked on yesterday?");            
        }

    },
    function (session, results) {
        addToMap(session.message.user.name, "workedOn", results.response);
        session.replaceDialog('scrumConfirm');
    }
]);

bot.dialog('scrumConfirm', [
    function (session, result) {
      builder.Prompts.confirm(session, "Anything else you want to add?");            
    },
    function (session, results) {
        if(results.response) {
            session.replaceDialog(currentDialog, { reprompt: true });
        } else {
           session.endDialogWithResult(results);
        }      
       
    }
]);


bot.dialog('scrumTodayUpdate', [
    function (session, args) {
        setCurrentDialog("scrumTodayUpdate");
        if(args && args.reprompt) {
          appendData = true;
          builder.Prompts.text(session, "Ok. What else?");            
        } else {
          appendData = false;
          builder.Prompts.text(session, "What are you working on today?");            
        }

    },
    function (session, results) {
        addToMap(session.message.user.name, "workingOn", results.response);
        session.replaceDialog('scrumConfirm');
    }
]);

bot.dialog('scrumBlocker', [
    function (session, args) {
       setCurrentDialog("scrumTodayUpdate");
       if(args && args.reprompt) {
          appendData = true;
          builder.Prompts.text(session, "Ok. What else?");            
        } else {
          appendData = false;
          builder.Prompts.text(session, "Are ther any blockers on tasks you are working on?");            
        }
    },
    function (session, results) {
        addToMap(session.message.user.name, "blockers", results.response);
        getMap();
        session.replaceDialog('scrumConfirm');
    }
]);

bot.set('storage', inMemoryStorage);

// Make sure you add code to validate these fields
var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

//const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v2.0/apps/' + luisAppId + '?subscription-key=' + luisAPIKey;
//const LuisModelUrl="https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/1a8c2639-3734-4eb7-a2fe-00be43b94b12?subscription-key=482a9ae8cb9543f0b4c80728a14ae598&verbose=true&timezoneOffset=0&q=";

const LuisModelUrl = "https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/00253af6-c210-4fdf-92dd-6ec261ecf58e?subscription-key=482a9ae8cb9543f0b4c80728a14ae598&&verbose=true&timezoneOffset=0&q=";
// Create a recognizer that gets intents from LUIS, and add it to the bot
var recognizer = new builder.LuisRecognizer(LuisModelUrl);
bot.recognizer(recognizer);

// Add a dialog for each intent that the LUIS app recognizes.
// See https://docs.microsoft.com/en-us/bot-framework/nodejs/bot-builder-nodejs-recognize-intent-luis 
bot.dialog('GreetingDialog',
    (session) => {
        session.send('You reached the Greeting intent. You said \'%s\'.', session.message.text);
        session.endDialog();
    }
).triggerAction({
    matches: 'Greeting'
})

bot.dialog('HelpDialog',
    (session) => {
        session.send('You reached the Help intent. You said \'%s\'.', session.message.text);
        session.endDialog();
    }
).triggerAction({
    matches: 'Help'
})

bot.dialog('CancelDialog',
    (session) => {
        session.send('You reached the Cancel intent. You said \'%s\'.', session.message.text);
        session.endDialog();
    }
).triggerAction({
    matches: 'Cancel'
})

bot.dialog('StartScrumDialog',[
    function (session, result, next) {
        session.send("Welcome to your Scrum Assistant");
        session.beginDialog('startScrumConfirm');
    }, 
    function (session, result, next) {
        session.beginDialog('scrumYesterday');
    },
   
    function (session, result, next) {
        session.beginDialog('scrumTodayUpdate');
    },
    
    function (session, result, next) {
        session.beginDialog('scrumBlocker');
    },
    
    function (session, result, next) {
        session.send('Thanks for your response.');
        session.endDialog();   
    },
]).triggerAction({
    matches: 'Start-Scrum'
})


addToMap = function(user, key, value) {
    console.log("user -----------------> " + user);
    if(!dataMap[user]) {
     dataMap[user]={};
    }
    
    if(!dataMap[user][key]) {
        dataMap[user][key] = [];
    }
    if(appendData) {
           dataMap[user][key][dataMap[user][key].length] = value;
    } else {
            dataMap[user][key]=[];
            dataMap[user][key][0] = value;
    }

 }

setCurrentDialog = function(newValue) {
    currentDialog = newValue;
}
getMap = function() {
    console.log("Map    " + JSON.stringify(dataMap));
     return dataMap;
 }


// Function to test LUIS API 
testLuis = function (message) {
    var request = require("request");

    var options = {
        method: 'GET',
        url: 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/1a8c2639-3734-4eb7-a2fe-00be43b94b12?subscription-key=482a9ae8cb9543f0b4c80728a14ae598&verbose=true&timezoneOffset=0&q=' + message,
    }

    request(options, function (error, response, body) {
        if (error) throw new Error(error);

        console.log("Response: " + body);
        var jsonObj = JSON.parse(body);
        var topIntent = jsonObj.topScoringIntent.intent;
        var entities = jsonObj.entities;
        var response = {};
        response.topIntent = topIntent;
        response.entities = entities;
        return response;
    });
};