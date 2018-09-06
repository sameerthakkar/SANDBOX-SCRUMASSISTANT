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
var linesCount=0;
var luisResponse = [];
var luisResponseParseIndex=0;
var address = JSON.parse("{\"id\":\"1536229691387\",\"channelId\":\"skype\",\"user\":{\"id\":\"29:1f-ZGEa9WTsGODII4h-2Z1AcSlSuevCEq6w_rt1f7-f8\"},\"conversation\":{\"id\":\"29:1f-ZGEa9WTsGODII4h-2Z1AcSlSuevCEq6w_rt1f7-f8\"},\"bot\":{\"id\":\"28:55b7bdd5-da0a-4053-a010-6280955ce335\",\"name\":\"scrumAssistant\"},\"serviceUrl\":\"https:\/\/smba.trafficmanager.net\/apis\/\"}");
var jiraHandler = require("./jira-handler");
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
        session.send('Thanks for your response. Let me cross check if everyhting is updated fine.');
        getEachSentenceIntent(session);
        //session.endDialog();   
    },
]);

getEachSentenceIntent = function(session) {
    luisResponse=[];  linesCount = 0;
    let userName = session.message.user.name;
    console.log("Worked on  " + JSON.stringify(dataMap[userName]["workedOn"]));
    for(let workedOnIndex = 0; workedOnIndex < dataMap[userName]["workedOn"].length; workedOnIndex++) {
        
        let paras = dataMap[userName]["workedOn"][workedOnIndex].split("\n");
        console.log("paras on  " + JSON.stringify(paras));
       
        for(let i=0; i<paras.length; i++) {
            let lines = paras[i].split(".");
            console.log("lines  on  " + JSON.stringify(lines));
            for(let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
               console.log("line  " + lines[lineIndex]);
               if(lines[lineIndex]) {
                linesCount ++;
                testLuis(lines[lineIndex], session);
               }
               
            }
        }
    }
    
}
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
          builder.Prompts.text(session, "Can you let me know what you worked on yesterday? What are you working on Today and are there any blockers?");            
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
// const LuisModelUrl="https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/1a8c2639-3734-4eb7-a2fe-00be43b94b12?subscription-key=482a9ae8cb9543f0b4c80728a14ae598&verbose=true&timezoneOffset=0&q=";

const LuisModelUrl="https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/00253af6-c210-4fdf-92dd-6ec261ecf58e?subscription-key=263b179fa47e4cb58be54e91e0109ca3&spellCheck=true&bing-spell-check-subscription-key={YOUR_BING_KEY_HERE}&verbose=true&timezoneOffset=0&q=";
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
    matches: 'Welcome'
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
        session.send('Thanks for your response.');
        session.endDialog();
    },
]).triggerAction({
    matches: 'Start-Scrum'
})

bot.dialog('ReportingJiraDialog',
    (session, results) => {
        console.log("results " + JSON.stringify(results));

        jiraHandler.getJiraReport(session);
    }
).triggerAction({
    matches: 'Jira-Reporting'
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

bot.dialog('CreateJiraDialog',[
    function (session, results, next) {
      builder.Prompts.text(session, "Ok. What you would like summary of Jira to be?");
    },
    function (session, results, next) {
        session.dialogData.summary = results.response;
        console.log("session dialog data " + JSON.stringify(session.dialogData));
        next();
    },
    function (session, results, next) {
        jiraHandler.createJira(session.dialogData.summary, session);
    },
]).triggerAction({
    matches: 'Jira-Create'
})

bot.dialog('updateStatusDialog',[
     function (session, results, next) {
         console.log(JSON.stringify(results));
        const jiraStatus = results.intent.entities.find(entity => entity.type === "Jira-Status").entity;
        const jiraId = results.intent.entities.find(entity => entity.type === 'Jira-Id').entity.replace(/\s/g,'');
        console.log("Update status of Jira ID "+jiraId+ " to >>>> status " + JSON.stringify(jiraStatus));
        jiraHandler.updateStatus(jiraId, jiraStatus, results.response, session);
        session.send('Jira status is successfully updated to \'%s\'',jiraStatus);
        session.endDialog();
    },
]
).triggerAction({
    matches: 'Jira-Status-Update'
})

bot.dialog('UpdateJiraCommentDialog',[
    function (session, results, next) {
        session.dialogData.jiraId = results.intent.entities.find(entity => entity.type === 'Jira-Id').entity.replace(/\s/g,'');
        builder.Prompts.text(session, "Sure. Please state the comment that needs to be added to Jira "+ session.dialogData.jiraId);
    },
    function (session, results, next) {
        console.log(JSON.stringify(results));
        session.dialogData.comment = results.response;
        jiraHandler.commentJira(session.dialogData.jiraId, session.dialogData.comment);
        session.send('Comment on Jira '+session.dialogData.jiraId+' successfully updated');
        session.endDialog();
    },
]
).triggerAction({
    matches: 'Jira-Comment-Update'
})

bot.dialog('AssignJiraDialog',[
     function (session, results, next) {
        console.log(JSON.stringify(results));
        const assigneeName = results.intent.entities.find(entity => entity.type === "User-Name").entity.replace(/\s/g,'');
        const jiraId = results.intent.entities.find(entity => entity.type === 'Jira-Id').entity.replace(/\s/g,'');
        console.log("Assign Jira ID "+jiraId+ " to >>>> assigneeName " + assigneeName);
        jiraHandler.assignJira(jiraId, assigneeName);
        session.send('Jira '+jiraId+' successfully assigned to '+assigneeName);
        session.endDialog();
    },
]
).triggerAction({
    matches: 'Jira-Assign'
})

bot.dialog('getJiraStatusDialog',[
     function (session, results, next) {
         console.log("---RESULT IN JIRA STATUS DIALOG -----" + JSON.stringify(results));
        const jiraId = results.intent.entities.find(entity => entity.type === 'Jira-Id').entity.replace(/\s/g,'');
        console.log("input Jira ID "+jiraId);

        jiraHandler.statusJira(jiraId, session);

    },
]
).triggerAction({
    matches: 'Jira-Status-Get'
})

testLuis = function (message, session) {
    var request = require("request");
   console.log("calling kluis for " + message + " linesCount " + linesCount);
    var options = {
        method: 'GET',
        url: 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/00253af6-c210-4fdf-92dd-6ec261ecf58e?subscription-key=263b179fa47e4cb58be54e91e0109ca3&spellCheck=true&bing-spell-check-subscription-key={YOUR_BING_KEY_HERE}&verbose=true&timezoneOffset=0&q=' + message,
    }

    request(options, function (error, response, body) {
        if (error) throw new Error(error);

        console.log("Response for message  " + message + " " + body);
        var jsonObj = JSON.parse(body);
        if(jsonObj &&  jsonObj.topScoringIntent) {
            var topIntent = jsonObj.topScoringIntent.intent;
            var entities = jsonObj.entities;
            let response2 = {};
            response2.topIntent = topIntent;
            response2.entities = entities;
            luisResponse[luisResponse.length] = response2;
        }
       
        linesCount--;
        if(linesCount == 0) {
            luisResponseParseIndex = 0;
            parseLuisResponse(session, luisResponseParseIndex);
        }
        
    });
};

parseLuisResponse = function(session, index) {
       if(index < luisResponse.length) {
        console.log("luis " + JSON.stringify(luisResponse[index]));
        if(luisResponse[index].topIntent == "Jira-Status") {
            let jiraId = luisResponse[index].entities.filter(entity => entity.type == "Jira-Id").entity;
            let jiraStatus = luisResponse[index].entities.filter(entity => entity.type == "Jira-Status").entity;
            let currentJiraStatus = "ssds";
            if(jiraStatus != currentJiraStatus) {
                let args = {};
                args.jiraId = jiraId || "dumm";
                args.jiraStatus = jiraStatus || "sssss";
                args.currentJiraStatus = currentJiraStatus;
                
                session.beginDialog('confirmJiraUpdate2', args);
                console.log('passed ' + index);
            }
        } else {
            parseLuisResponse(session, ++luisResponseParseIndex);
        }
       }
       
    
};

bot.dialog('confirmJiraUpdate2',[
    function (session, args) {
       if(args) {
          appendData = true;
          builder.Prompts.confirm(session, "Jira number " + args.jiraId + " current status is " + args.currentJiraStatus + ". Do you want to change it to " + args.jiraStatus);            
        } else {
          appendData = false;
          builder.Prompts.text(session, "Else condition no args ");            
        }
    },
    function (session, results) {
        if(results.response) {
            session.send("Updated jira status");
        } else {
            session.send("Ok ! Leaving as it is");

        }
        session.endDialog();
        parseLuisResponse(session, ++luisResponseParseIndex);
    }
]
);
