
/**
	* Node.js CineMatch
	* Copyright (c) 2015 Stephen Griffith
**/

var express = require('express');
var app = express();
var http = require('http');
var busboy = require('connect-busboy');
var bodyParser = require("body-parser");
var xssFilters = require("xss-filters");
var AM = require('./app/server/modules/account-manager');

app.set('port', 8080);
app.set('views', __dirname + '/app/server/views');
app.set('view engine', 'jade');
app.locals.pretty = true;

var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8080
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1'

app.use(busboy());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.cookieParser());
app.use(express.session({ secret: 'super-duper-secret-secret' }));
app.use(express.methodOverride());
app.use(require('stylus').middleware({ src: __dirname + '/app/public' }));
app.use(express.static(__dirname + '/app/public'));

require('./app/server/router')(app);

var server = http.createServer(app).listen(server_port, function(){
	console.log("Express server listening on port " + app.get('port'));
})

//- Start socket.io server to handle messages //////////////////////////////////////////
var io = require('socket.io').listen(server);

//- Array of connected chat users //
var users = {};

//- Handle each connection and sent message ////////////////////////////////////////////
io.sockets.on('connection', function(socket) {

	//- Assign socket to connection //////////////////////////////////////////////////////
	socket.on('user connect', function(data){
		AM.getMessageHistory({sender:data.sender, receiver: data.receiver}, function(e, o) {
			if (e) callback (e)
			else {
				users[socket.nickname].emit('chat history', o);
			}
		});
		socket.nickname = data.senderSocketNickname;
		//- Add socket to users //
		users[socket.nickname] = socket;
		//- Update online status //
		if (data.receiverSocketNickname in users) {
			users[data.receiverSocketNickname].emit('online', data);
			users[socket.nickname].emit('online', data);
		}
	});

	//- Handle message sending ////////////////////////////////////////////////////////////
	socket.on('send message', function(data){
		//- Sanitise message //
		data.msg = xssFilters.inHTMLData(data.msg);
		//- Update sender chat window //
		users[data.senderSocketNickname].emit('new message', data);
		//- If receiver is online //
		if(data.receiverSocketNickname in users){
			//- Save message in database with seen as true //
			AM.sendMessage({ sender: data.sender, receiver: data.receiver, msg: data.msg, seen : true, timestamp: Math.floor(Date.now() / 1000)},
				function(e, o){
					if (e) callback (e)
					else {
						AM.updateMessageSession({ sender: data.sender, receiver: data.receiver, msg: data.msg, timestamp: Math.floor(Date.now() / 1000)},
						function(e, obj){
							if (e) callback (e)
							else {
								//- Update online status //
								users[data.receiverSocketNickname].emit('online', data);
								//- Send to receiver //
								users[data.receiverSocketNickname].emit('new message', data);
							}
						});
					}
				});
			}
			else {
				//- Save message in database with seen as false //
				AM.sendMessage({sender: data.sender, receiver: data.receiver, msg: data.msg, seen : false, timestamp: Math.floor(Date.now() / 1000)},
					function(e, o){
						if (e) callback (e)
						else {
							AM.updateMessageSession({sender: data.sender, receiver: data.receiver, msg: data.msg, timestamp: Math.floor(Date.now() / 1000)},
								function(e, obj){
									if (e) callback (e)
									else {
									//- Update online status if receiver is offline //
									users[data.senderSocketNickname].emit('offline', data);
									}
								});
						}
				});
			}
	});

	//- Handle page exit, remove socket connection ////////////////////////////////////////////////////////
	socket.on('disconnect', function(data) {
		if(!socket.nickname) return;
		delete users[socket.nickname];
	});

});
