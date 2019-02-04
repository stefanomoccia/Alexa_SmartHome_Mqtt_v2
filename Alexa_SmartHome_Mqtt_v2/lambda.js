var http = require('http');

var Paho = require('mqtt')
/*
	* MQTT-WebClient example for Web-IO 4.0
*/
var hostname = "io.adafruit.com";
var port = 8883;
var clientId = "clientId";
clientId += new Date().getUTCMilliseconds();;
var myusername = "smoccia";
var mypassword = "ac7b6bfdab824cfab74b9140e6a85cda";
var subscription = "smoccia/f/status";
/*
mqttClient = Paho.connect('mqtts://io.adafruit.com',{
    port: 8883,
    username: myusername,
    password: mypassword
  });

mqttClient.onMessageArrived = MessageArrived;
mqttClient.onConnectionLost = ConnectionLost;
Connect();
*/

/*Initiates a connection to the MQTT broker*/
function Connect() {
    mqttClient.connect({
        onSuccess: Connected,
        onFailure: ConnectionFailed,
        //keepAliveInterval: 0,
        userName: username,
        useSSL: true,
        password: password
    });
}

/*Callback for successful MQTT connection */
function Connected() {
    console.log("Connected");
    mqttClient.subscribe(subscription);
}

/*Callback for failed connection*/
function ConnectionFailed(res) {
    console.log("Connect failed:" + res.errorMessage);
}

/*Callback for lost connection*/
function ConnectionLost(res) {
    if (res.errorCode !== 0) {
        console.log("Connection lost:" + res.errorMessage);
        Connect();
    }
}

/*Callback for incoming message processing */
function MessageArrived(message) {
    console.log(message.destinationName + " : " + message.payloadString);
    switch (message.payloadString) {
        case "ON":
            displayClass = "on";
            break;
        case "OFF":
            displayClass = "off";
            break;
        default:
            displayClass = "unknown";
    }
    var topic = message.destinationName.split("/");
    if (topic.length == 3) {
        var ioname = topic[1];
        UpdateElement(ioname, displayClass);
    }
}

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: 'PlainText',
            text: output,
        },
        card: {
            type: 'Simple',
            title: `SessionSpeechlet - ${title}`,
            content: `SessionSpeechlet - ${output}`,
        },
        reprompt: {
            outputSpeech: {
                type: 'PlainText',
                text: repromptText,
            },
        },
        shouldEndSession,
    };
}
function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: '1.0',
        sessionAttributes,
        response: speechletResponse,
    };
}


function onSessionStarted(sessionStartedRequest, session) {
    console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
}

function onLaunch(launchRequest, session, callback) {
    console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);
    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

function getWelcomeResponse(callback) {
    const sessionAttributes = {};
    const cardTitle = 'Welcome';
    const speechOutput = 'Welcome to the Smart Home application of Moccias';

    const repromptText = 'Which light should I control ?';
    const shouldEndSession = false;
    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}


function onIntent(intentRequest, session, callback) {
    console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);
    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;
    // Dispatch to your skill's intent handlers
    if (intentName === 'AMAZON.HelpIntent') {
        getWelcomeResponse(callback);
    } else if (intentName === 'AMAZON.StopIntent') {
        handleSessionEndRequest(callback);
    } else if (intentName === 'lights') {
        var color = intent.slots.color.value;
        var lightstatus = intent.slots.lightstatus.value;
        lights(callback, color, lightstatus);
    } else if (intentName === 'HelloWorldIntent') {
        securelight(callback);
    }
}

function handleSessionEndRequest(callback) {
    const cardTitle = 'Session Ended';
    const speechOutput = 'Thank you for using Smart Home application of Moccias, have a nice day!';
    const shouldEndSession = true;
    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}



function lights(callback, color, lightstatus) {

    var _switch = "";
    var _status = "";

    if (color == "red")
        _switch = "V1";
    else if (color == "green")
        _switch = "V2";
    else if (color == "orange")
        _switch = "V0";
    else
        _switch = "error";

    if (lightstatus == "on")
        _status = "1";
    else if (lightstatus == "off")
        _status = "0";

    var endpoint = "http://13.232.30.228:8080/ad05422526054585af9097a984f0177f/update/" + _switch + "?value=" + _status;
    var status = "offline";
    var body = "";
    http.get(endpoint, (response) => {
        console.log("Got response: " + response.statusCode)
        response.on('data', (chunk) => { body += chunk })
        response.on('end', () => {
        })
    });

    const sessionAttributes = {};

    //Get card title from data
    const cardTitle = 'device status';

    //Get output from data
    const speechOutput = 'The  ' + color + '  light is turned ' + lightstatus;
    const repromptText = '';
    const shouldEndSession = false;
    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}


function securelight(callback) {

    const sessionAttributes = {};

    //Get card title from data
    const cardTitle = 'device status';

    //Get output from data
    const speechOutput = 'The hood light is switched off ';
    const repromptText = '';
    const shouldEndSession = false;
    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}



function onSessionEnded(sessionEndedRequest, session) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
    // Add cleanup logic here
}

exports.handler = (event, context, callback) => {
    try {
        console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);


        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }
        if (event.request.type === 'LaunchRequest') {
            onLaunch(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'IntentRequest') {
            onIntent(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            callback();
        }
    } catch (err) {
        callback(err);
    }
};