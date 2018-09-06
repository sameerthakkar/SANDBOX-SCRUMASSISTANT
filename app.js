/*-----------------------------------------------------------------------------
A simple Language Understanding (LUIS) bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');
var botbuilder_azure = require("botbuilder-azure");
var dataMap = {};
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
var bot = new builder.UniversalBot(connector, [
    function (session, result, next) {
        session.send("Welcome to your Scrum Assistant");
        session.beginDialog('startScrum');
    },
    function (session, result, next) {
        if(result.response) {
            builder.Prompts.text(session, "Can you let me know what you worked on yesterday?");
        } else {
            session.send('No problem lets connect some time later !!');
            session.endDialog();       
       }
    },
   
    function (session, result, next) {
        addToMap(session.message.user.name, "workedOn", result.response);
        builder.Prompts.text(session, "What are you working on today?");
    },
    function (session, result, next) {
        addToMap(session.message.user.name, "workingOn", result.response);
        builder.Prompts.text(session, "Are ther any blockers on tasks you are working on?");
    },
    function (session, result, next) {
        addToMap(session.message.user.name, "blockers", result.response);
        session.send('Thanks for your response.');
        session.endDialog();   
    },
]);


bot.dialog('startScrum', [
    function (session) {
        builder.Prompts.confirm(session, "Hope you are doing fine!! Should we get started with standup ?");
    },
    function (session, results) {
        session.endDialogWithResult(results);
    }
]);

bot.dialog('checkAndStart', [
    function (session, result) {
        if(result.response) {
            builder.Prompts.text(session, "Can you let me know what you worked on yesterday?");
        } else {
            session.send('No problem lets connect some time later !!');
            session.endDialog();       
       }
    },
    function (session, results) {
        session.endDialogWithResult(results);
    }
]);


bot.dialog('scrumTodayUpdate', [
    function (session, result, next) {
        addToMap(session.message.user.name, "workedOn", result.response);
        builder.Prompts.text(session, "What are you working on today?");
    },
    function (session, results) {
        session.endDialogWithResult(results);
    }
]);

bot.dialog('scrumBlocker', [
    function (session, result, next) {
        addToMap(session.message.user.name, "workingOn", result.response);
        builder.Prompts.text(session, "Are ther any blockers on tasks you are working on?");
    },
    function (session, results) {
        session.endDialogWithResult(results);
    }
]);

bot.set('storage', inMemoryStorage);

// Make sure you add code to validate these fields
var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

//const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v2.0/apps/' + luisAppId + '?subscription-key=' + luisAPIKey;
const LuisModelUrl="https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/1a8c2639-3734-4eb7-a2fe-00be43b94b12?subscription-key=482a9ae8cb9543f0b4c80728a14ae598&verbose=true&timezoneOffset=0&q=";

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


addToMap = function(user, key, value) {
    if(!dataMap[user]) {
     dataMap[user]={};
    }
    dataMap[user][key]=value;
 }

getMap = function() {
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
        return [topIntent, entities];
    });
};