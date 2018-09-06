/* global builder */
var request = require("request");
var builder = require('botbuilder');
var jiraHost='https://scrumassistant.atlassian.net';

var commonHeader = { 'postman-token': 'fc7df2de-54ed-3cef-3901-79b2271a9280',
       'cache-control': 'no-cache',
       'content-type': 'application/json',
       'X-Atlassian-Token': 'nocheck',
       'User-Agent': 'aaabbb',
       'authorization': 'Basic a2h1c2hib29fcGVzd2FuaUBvdXRsb29rLmNvbTpIQGNrQDIwMTg=' };

var getJiraReport = function(session) {
var options = { method: 'GET',
  url: 'https://scrumassistant.atlassian.net/rest/api/2/search',
  qs: { jql: 'Sprint=1' },
  headers:
   { 'postman-token': '03889517-cf05-2e25-c7a3-707a467ce3cb',
     'cache-control': 'no-cache',
     'content-type': 'application/json',
     authorization: 'Basic a2h1c2hib29fcGVzd2FuaUBvdXRsb29rLmNvbTpIQGNrQDIwMTg=' } };

request(options, function (error, response, body) {
  if (error) throw new Error(error);
        var output = JSON.parse(body);
        var todoItems =""; var todoCount= 0;
        var inProgressItems = ""; var inProgressCount= 0;
        var inDoneItems = ""; var inDoneCount= 0;
        var ragStatus = "";
        for(var jiraStatus in output.issues){
          if(output.issues[jiraStatus].fields.status.name === "To Do"){
            todoCount++;
            todoItems += output.issues[jiraStatus].fields.summary +"  ["+output.issues[jiraStatus].key+"]" +"\n";
          }
          if(output.issues[jiraStatus].fields.status.name === "In Progress"){
            inProgressCount++;
            inProgressItems += output.issues[jiraStatus].fields.summary +"  ["+output.issues[jiraStatus].key+"]" +"\n";
          }
          if(output.issues[jiraStatus].fields.status.name === "Done"){
            inDoneCount++;
            inDoneItems += output.issues[jiraStatus].fields.summary +"  ["+output.issues[jiraStatus].key+"]" +"\n";
          }
        }
        //CALCULATE RAG STATUS
        if(todoCount/output.total > 0.5){
          ragStatus = "RED";
        }
        if(todoCount+inProgressCount/output.total > 0.5){
          ragStatus = "AMBER";
        }
        if(inDoneCount/output.total > 0.7){
          ragStatus = "GREEN";
        }
        var card = {
            'contentType': 'application/vnd.microsoft.card.adaptive',
            'content': {
            '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
            'type': 'AdaptiveCard',
            'version': '1.0',
        	   "body": [
		          {
			             "type": "Container",
			             "items": [
				              {
					             "type": "TextBlock",
					             "text": "Total issues in the sprint: "+output.total,
					             "weight": "bolder",
					             "size": "medium"
				              },
                       {
					             "type": "TextBlock",
					             "text": "R.A.G Status: "+ragStatus,
					             "weight": "bolder",
					             "size": "medium"
				              },
                     {
					               "type": "TextBlock",
					               "text": "\nTODO:\n"+todoItems,
					               "weight": "bolder",
					               "size": "medium"
				              },
                      {
					               "type": "TextBlock",
					               "text": "IN PROGRESS:\n"+inProgressItems,
					               "weight": "bolder",
					               "size": "medium"
				              },
                       {
					               "type": "TextBlock",
					               "text": "DONE:\n"+inDoneItems,
					               "weight": "bolder",
					               "size": "medium"
				              }
			             ]
		          }
	           ]
        }
        };
        var msg = new builder.Message(session).addAttachment(card);
        session.send(msg);
        session.endDialog();
});
};

var createJira = function(summary, session) {
  console.log('inside create jira ---');

  var options = { method: 'POST',
    url: jiraHost + '/rest/api/2/issue/',
    headers:commonHeader,
    body:
     { fields:
        { project: { key: 'SCRUM' },
          summary: summary || "Default - Update summary",
          description: 'Creating of an issue using project keys and issue type names using the REST API',
          issuetype: { name: 'Task' } } },
    json: true };

  request(options, function (error, response, body) {
    if (error) throw new Error(error);
    console.log(body.key);
    console.log('check session::: '+JSON.stringify(session));
    session.send('Jira Id '+body.key+' created successfully with summary \'%s\'',session.dialogData.summary);
    session.endDialog();
    console.log(body);
  });
};


var assignJira = function(jiraId, assigneeName) {
  var options = { method: 'PUT',
    url: jiraHost + '/rest/api/2/issue/'+jiraId,
    headers:commonHeader,
    body: { fields: { assignee: { name: assigneeName } } },
    json: true };

  request(options, function (error, response, body) {
    if (error) throw new Error(error);
    // console.log("FAILURE");
    // console.log(JSON.stringify(error));
    // console.log(JSON.stringify(response));
    console.log(body);
  });
};

var commentJira = function(jiraId, comment) {
console.log("update jira with comment: " + comment + " for Jira id: " + jiraId);
var options = { method: 'POST',
  url: jiraHost + '/rest/api/2/issue/'+jiraId + '/comment',
  headers:
   { 'postman-token': 'fc7df2de-54ed-3cef-3901-79b2271a9280',
     'cache-control': 'no-cache',
     'content-type': 'application/json',
     'X-Atlassian-Token': 'nocheck',
     'User-Agent': 'aaabbb',
     'authorization': 'Basic a2h1c2hib29fcGVzd2FuaUBvdXRsb29rLmNvbTpIQGNrQDIwMTg='},
    body: {body: comment},
  json: true };

request(options, function (error, response, body) {
  if (error) throw new Error(error);
});
};

var updateJiraStatus = function(jiraId, transitionId) {
console.log("update jira status transtion id: " + transitionId + " Jira id: " + jiraId);
var options = { method: 'POST',
  url: jiraHost + '/rest/api/2/issue/'+jiraId + '/transitions',
  headers:
   { 'postman-token': 'fc7df2de-54ed-3cef-3901-79b2271a9280',
     'cache-control': 'no-cache',
     'content-type': 'application/json',
     'X-Atlassian-Token': 'nocheck',
     'User-Agent': 'aaabbb',
     'authorization': 'Basic a2h1c2hib29fcGVzd2FuaUBvdXRsb29rLmNvbTpIQGNrQDIwMTg=' },
    body: { transition: {id : transitionId} },
  json: true };

request(options, function (error, response, body) {
  if (error) throw new Error(error);

  console.log("************"+JSON.stringify(body));

});
};

var updateStatus = function(jiraId, status, response, session) {

  var options = { method: 'GET',
    url: jiraHost + '/rest/api/2/issue/'+jiraId + '/transitions',
    headers:
     { 'postman-token': 'fc7df2de-54ed-3cef-3901-79b2271a9280',
       'cache-control': 'no-cache',
       'content-type': 'application/json',
       'X-Atlassian-Token': 'nocheck',
       'User-Agent': 'aaabbb',
       'authorization': 'Basic a2h1c2hib29fcGVzd2FuaUBvdXRsb29rLmNvbTpIQGNrQDIwMTg=' },
    json: true };

  console.log("JIRA ID " + jiraId);


  request(options, function (error, response, body, session) {
    if (error) throw new Error(error);
      console.log(JSON.stringify(body));

     var transitionId = body.transitions.find(transition =>transition.name.toUpperCase() === status.toUpperCase());

      console.log("=RESPONSE-" + response);
      console.log("=transition id-" + transitionId.id);
      updateJiraStatus(jiraId, transitionId.id);
  });
};

var getJiraStatus = function(jiraId, session) {

var options = { method: 'GET',
  url: jiraHost + '/rest/api/2/issue/'+jiraId,
  headers:
   { 'postman-token': 'fc7df2de-54ed-3cef-3901-79b2271a9280',
     'cache-control': 'no-cache',
     'content-type': 'application/json',
     'X-Atlassian-Token': 'nocheck',
     'User-Agent': 'aaabbb',
     'authorization': 'Basic a2h1c2hib29fcGVzd2FuaUBvdXRsb29rLmNvbTpIQGNrQDIwMTg=' },
  json: true };

request(options, function (error, response, body) {
  if (error) throw new Error(error);
  console.log("======================================"+JSON.stringify(body));
  console.log("JIRA STATUS IS: "  + body.fields.status.name);
  session.send('Jira status for JIRA ID : ' + jiraId + " is " + body.fields.status.name);
  session.endDialog();
});
};

module.exports.createJira = createJira;
module.exports.assignJira = assignJira;
module.exports.updateStatus = updateStatus;
module.exports.commentJira = commentJira;
module.exports.getJiraReport = getJiraReport;
module.exports.getJiraStatus = getJiraStatus;
