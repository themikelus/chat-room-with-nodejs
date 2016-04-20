var express = require('express');
var app = express();
app.use(express.static('public'));

var server = require('http').createServer(app);
var io = require('socket.io')(server)

var redis = require('redis');
var redisClient = redis.createClient();

var storeMessage = function(username, data) {
	var message = JSON.stringify({username: username, data: data});
	
	redisClient.lpush("messages", message, function(err, response) {
		redisClient.ltrim("messages", 0, 9);
	});
}

io.on('connection', function(client) {
	client.on('join', function(username) {
		client.username = username;

		client.broadcast.emit("add chatter", username);

		redisClient.smembers('chatters', function(err, names) {
			names.forEach(function(username) {
				client.emit('add chatter', username);
			});
		});

		redisClient.sadd("chatters", username);

		redisClient.lrange("messages", 0, -1, function(err, messages) {
			messages = messages.reverse();

			messages.forEach(function(message) {
				message = JSON.parse(message);
				client.emit("message", message.username + ": " + message.data);
			});
		});
	});

	client.on('message', function(data) {
		client.broadcast.emit("message", client.username + ": " + data);
		client.emit("message", client.username + ": " + data);
		storeMessage(client.username, data);
	});
});

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/index.html');
});

server.listen(8080, function (err) {
  console.log('server listening...');
  console.log('pid is: ' + process.pid)
});