
var crypto 		= require('crypto');
var MongoDB 	= require('mongodb').Db;
var Server 		= require('mongodb').Server;
var ObjectId = require('mongodb').ObjectID;
var moment 		= require('moment');

var dbPort 		= 27017;
var dbHost 		= 'localhost';
var dbName 		= 'CineMatch';

/* establish the database connection */

var db = new MongoDB(dbName, new Server(dbHost, dbPort, {auto_reconnect: true}), {w: 1});
	db.open(function(e, d){
	if (e) {
		console.log(e);
	}	else{
		console.log('connected to database :: ' + dbName);
	}
});

/* Individual database collection names */
var users = db.collection('users');
var cinemas = db.collection('cinemas');
var films = db.collection('films');
var userfilms = db.collection('userfilms');
var userphotos = db.collection('userphotos');
var matches = db.collection('matches');
var messages = db.collection('messages');
var messageSessions = db.collection('messageSessions');


/* login validation methods */

exports.autoLogin = function(user, pass, callback)
{
	users.findOne({user:user}, function(e, o) {
		if (o){
			o.pass == pass ? callback(o) : callback(null);
		}	else{
			callback(null);
		}
	});
}

exports.manualLogin = function(user, pass, callback)
{
	users.findOne({user:user}, function(e, o) {
		if (o == null){
			callback('user-not-found');
		}	else{
			validatePassword(pass, o.pass, function(err, res) {
				if (res){
					callback(null, o);
				}	else{
					callback('invalid-password');
				}
			});
		}
	});
}

/* record insertion, update & deletion methods */

exports.addNewUser = function(newData, callback)
{
	users.findOne({user:newData.user}, function(e, o) {
		if (e) callback(e, null)
		else if (o) {
			callback('username-taken');
		}	else{
			users.findOne({email:newData.email}, function(e, o) {
				if (o){
					callback('email-taken');
				}	else{
					saltAndHash(newData.pass, function(hash){
						newData.pass = hash;
					//-append date stamp when record was created //
						newData.date = moment().format('MMMM Do YYYY, h:mm:ss a');
						users.insert(newData, {safe: true}, callback);
					});
				}
			});
		}
	});
}

//- Add cinemas to database //
exports.addCinema = function(newData, callback)
{
	//-checks if cinema already exists
	cinemas.findOne({name:newData.name}, function(e, o) {
		if (e) callback(e, null);
		else if (o) {
			//- Checks if the data is new //
			if (o.phone !== newData.phone
				|| o.address !== newData.address || o.postcode !== newData.postcode
				|| o.root !== newData.root){
					//- Save new data if anything is new //
					o.phone = newData.phone
					o.address = newData.address
					o.postcode = newData.postcode
					o.root = newData.root

					cinemas.save(o, {safe: true}, function(err) {
						if (err) callback(err);
						else callback(null, o);
					});
				}
			} else {
				//- If cinema does not already exist, add it to database
				cinemas.insert(newData, {safe: true}, callback);
			}
	});
}

//- Adds film to database
exports.addFilm = function(newData, callback)
{
	//-checks if cinema already exists
	films.findOne({ $and: [{edi : newData.edi, CinemaID : newData.CinemaID}] }, function(e, o) {
		//- If Error //
		if (e) callback(e, null);
		//- If film does not already exist, add it to database
		else if (o) {
			//- Checks if the data is new //
			if (o.title !== newData.title || o.rating !== newData.rating
				|| o.release !== newData.release || o.length !== newData.length
				|| o.poster !== newData.poster || o.director !== newData.director
				|| o.synopsis !== newData.synopsis || o.cast !== newData.cast){
					//- Save new data //
					o.title = newData.title
					o.rating = newData.rating
					o.release = newData.release
					o.length = newData.length
					o.poster = newData.poster
					o.director = newData.director
					o.synopsis = newData.synopsis
					o.cast = newData.cast

					films.save(o, {safe: true}, function(err) {
						if (err) callback(err);
						else callback(null, null);
					});
				}
		}
		else {
			films.insert(newData, {safe: true}, callback);
		}
	});
}

//- Adds userfilm to database
exports.addUserFilm = function(newData, callback)
{
	//-checks if films already exists in userfilmlist //
	userfilms.findOne({ $and: [{edi:newData.edi, userid:newData.userid, CinemaID:newData.CinemaID}] }, function(e, o) {
		if (o){
			//- If film is already in database //
			callback(null, o);
		} else if (e) callback(e, null);
			else {
					newData.timestamp = Math.floor(Date.now() / 1000)
					//- If film relation does not already exist, add it to database
					userfilms.insert(newData, {safe: true}, callback);
			}
	});
}

//- Adds userfilm to database
exports.RemoveUserFilm = function(newData, callback)
{
	//-Removes film from userfilms//
	userfilms.remove({ $and: [{edi:newData.edi, userid:newData.userid, CinemaID:newData.CinemaID}]}, callback);
}

//-Update User Information//
exports.updateUser = function(newData, callback)
{
	users.findOne({user:newData.user}, function(e, o){
		if (e) callback(e, null);
		o.name 		= newData.name;
		o.email 	= newData.email;

		if (newData.pass == ''){
			users.save(o, {safe: true}, function(err) {
				if (err) callback(err);
				else callback(null, o);
			});
		}	else{
			saltAndHash(newData.pass, function(hash){
				o.pass = hash;
				users.save(o, {safe: true}, function(err) {
					if (err) callback(err);
					else callback(null, o);
				});
			});
		}
	});
}

//-Update Profile information//
exports.updateProfile = function(newData, callback)
{
	users.findOne({user:newData.user}, function(e, o){
		if (e) callback(e, null);
		o.age 				= newData.age;
		o.name				= newData.name;
		o.gender 			= newData.gender;
		o.preference 	= newData.preference;
		o.height 			= newData.height;
		o.bodyType 		= newData.bodyType;
		o.cinema 			= newData.cinema;
		o.CinemaID		= newData.CinemaID;
		o.bio 				= newData.bio;

			users.save(o, {safe: true}, function(err) {
				if (err) callback(err);
				else callback(null, o);
			});
	});
}

exports.updatePassword = function(email, newPass, callback)
{
	users.findOne({email:email}, function(e, o){
		if (e){
			callback(e, null);
		}	else{
			saltAndHash(newPass, function(hash){
		        o.pass = hash;
		        users.save(o, {safe: true}, callback);
			});
		}
	});
}

//- Check if User exists //
exports.checkUser = function(user, callback)
{
	users.findOne({user:user.user}, function(e, o) {
		if (e){
			callback(e, null);
		}
		else if (o == null) {
			callback(e, null);
		}
		else {
			callback (null, o);
		}
	});
}

//- Check if film exists at user's cinema by edi //
exports.checkFilm = function(data, callback)
{
	films.findOne({$and: [{edi:data.edi, CinemaID:data.CinemaID}] }, function(e, o) {
		if (e){
			callback(e, null);
		}
		else if (o == null) {
			callback(e, null);
		}
		else {
			callback (null, o);
		}
	});
}

//- Check if film exists at user's cinema by title //
exports.checkFilmByTitle = function(data, callback)
{
	films.findOne({$and: [{title:data.title, CinemaID:data.CinemaID}] }, function(e, o) {
		if (e){
			callback(e, null);
		}
		else if (o == null) {
			callback(e, null);
		}
		else {
			callback (null, o);
		}
	});
}

/* account lookup methods */

exports.deleteAccount = function(id, callback)
{
	users.remove({_id: getObjectId(id)}, callback);
}

exports.getUserByEmail = function(email, callback)
{
	users.findOne({email:email}, function(e, o){ callback(o); });
}

exports.getUsersByID = function(user, callback)
{
	users.find(
				{ user: { $in: user.users } }
		).toArray(
		function(e, res) {
			if (e) callback(e)
			callback(null, res)
		});
};

exports.validateResetLink = function(email, passHash, callback)
{
	users.find({ $and: [{email:email, pass:passHash}] }, function(e, o){
		callback(o ? 'ok' : null);
	});
}

//- Get all user records (for admin)//
exports.getAllRecords = function(callback)
{
	users.find().toArray(
		function(e, res) {
		if (e) callback(e)
		else callback(null, res)
	});
}

//- Handles adding of match request //
exports.addmatchrequest = function(request, callback)
{
	//- If a user is accepting the request (sender is false) //
	matches.find({
		$and : [ { $or :
			[{ matchuser:request.matchuser, receiver:request.receiver, sender: false},
				{ matchuser:request.receiver, receiver:request.matchuser, sender: true}]
			}]
		}).toArray( function(e, o) {
			if (e) callback(e, null);
			if (o.length > 0) {
				for (var i = 0; i < o.length; i++) {
				if (o[i].matchuser == request.matchuser && o[i].sender == false) {
					o[i].accepted 	= true
					o[i].seen 			= true
					matches.save(o[i], {safe: true}, function(err) {
						if (err) callback(err);
					});
				}
				else {
					o[i].accepted 	= true
					o[i].seen 			= false
					matches.save(o[i], {safe: true}, function(err) {
						if (err) callback(err);
						else callback(null, o)
					});
				}
			}
			} else {
				//- If user is resending a request (that hasn't yet been accepted)
				matches.find({
					$and : [ { $or :
						[{ matchuser:request.matchuser, receiver:request.receiver, sender: true},
							{ matchuser:request.receiver, receiver:request.matchuser, sender: false}]
						}]
					}).toArray( function(e, o) {
					if (e) callback(e, null);
					if (o.length > 0) {
						callback(null, o)
					}
					else {
						//- If match request does not exist, add match pairs to database
						matches.insert([
							{matchuser:request.matchuser, receiver:request.receiver, seen:true, accepted:false, sender:true},
							{matchuser:request.receiver, receiver:request.matchuser, seen:false, accepted:false, sender:false}
						], {ordered: false}, callback);
					}
				});
			}
	});
}

//- Handles adding of match request //
exports.declineMatchRequest = function(request, callback)
{
	//- If a user is accepting the request (sender is false) //
	matches.find({
		$and : [ { $or :
			[{ matchuser:request.matchuser, receiver:request.receiver, sender: false},
			{ matchuser:request.receiver, receiver:request.matchuser, sender: true}]
		}]
	}).toArray( function(e, o) {
		if (e) callback(e, null);
		if (o.length > 0) {
			for (var i = 0; i < o.length; i++) {

				matches.remove(o[i], {safe: true}, function(err) {
					if (err) callback(err);
				});
			}
		}
		else callback(null, null)
	});
}

exports.dismissMatchNotifications = function(user, callback){
	//- If a user is accepting the request (sender is false) //
	matches.find({
		$and : [ { matchuser:user.matchuser, accepted:true, seen:false}]
	}).toArray( function(e, o) {
		if (e) callback(e, null);
		if (o) {
			for (var i = 0; i < o.length; i++) {
				o[i].seen = true
				matches.save(o[i], {safe: true}, function(err) {
					if (err) callback(err);
				});
			}
		}
	});
}
//- Get all the users match requests //
exports.getMatchRequests = function(user, callback)
{
	matches.find({matchuser:user.matchuser}).toArray(
	function(e, res) {
		if (e) callback(e)
		else callback(null, res)
	});
}

//- Get all the user's accepted match requests //
exports.getAcceptedMatchRequests = function(user, callback)
{
	matches.find({
		$and : [ 	{matchuser:user.matchuser, accepted:true}	]
	}).toArray(
	function(e, res) {
		if (e) callback(e)
		else callback(null, res)
	});
}

//- Get Users based on Cinema //
exports.getMatchesCinema = function(user, callback)
{
	//- Set correct query parameter values //
	var Male='';
	var Female='';
	var age='';
	var gender='';
	if (user.preference == 'Men')  Male = 'Male';
	if (user.preference == 'Women') Female = 'Female';
	if (user.preference == 'Men & Women') {Male = 'Male'; var Female = 'Female';}
	if (user.gender == 'Male') preference = 'Men';
	if (user.gender == 'Female') preference = 'Women';
	if (user.age =='All') {
		users.find({
			$and : [
				//- Search for users based on gender preference, if 'Male' or 'Female' == '' no results will be returned for that gender //
				{ $or : [ { gender: Male }, { gender:Female } ] },
				//- Make sure the matches want to be viewed by the user (has their gender as their prefered choice) //
				{ $or : [ { preference: preference }, { preference:'Men & Women' } ] },
				//- Make sure match is at the same cinema //
				{ CinemaID:user.CinemaID },
				//- Exclude the user's object from the results //
				{ user: { $ne: user.user } }
			]
		}).toArray(
			function(e, res) {
				if (e) callback(e)
				else callback(null, res)
			});
		}
		else {
			users.find({
				$and : [
					//- Search for users based on gender preference, if 'Male' or 'Female' == '' no results will be returned for that gender //
					{ $or : [ { gender: Male }, { gender:Female } ] },
					//- Make sure the matches want to be viewed by the user (has their gender as their prefered choice) //
					{ $or : [ { preference: gender }, { preference:'Men & Women' } ] },
					//- Make sure match is at the same cinema //
					{ CinemaID:user.CinemaID },
					{ age: user.age },
					//- Exclude the user's object from the results //
					{ user: { $ne: user.user } }
				]
			}).toArray(
				function(e, res) {
					if (e) callback(e)
					else callback(null, res)
				});
			}
		};

//- Get Users based on Films //
exports.getMatchesFilms = function(user, callback)
{
	if (user.film.length == 0) {
		userfilms.find({ $and: [
			{ CinemaID:user.CinemaID, user: { $in: user.usernames }},
			{ user: { $ne: user.user } }
			]}).toArray(
			function(e, res) {
				if (e) callback(e)
				else {
					callback(null, res)}
			});
	}
	else {
		userfilms.find({ $and: [
			{CinemaID:user.CinemaID, user: { $in: user.usernames },title: { $in: user.film }, user: { $ne: user.user } }

			]}).toArray(
			function(e, res) {
				if (e) callback(e)
				else callback(null, res)
			});
		}
	};

//- Get all cinemas //
exports.getAllCinemas = function(callback)
{
	cinemas.find().toArray(
		function(e, res) {
		if (e) callback(e)
		else {
			//- Sort Alphabetical //
			res.sort(function(a, b){
				if (a.name < b.name)
					return -1;
				if (a.name > b.name)
					return 1;
				return 0;
			});
			callback(null, res)
		}
	});
};

//- Get Users based on Cinema //
exports.getCinemaNameFromID = function(cinema, callback)
{
	cinemas.findOne({CinemaID:cinema.CinemaID},
		function(e, res) {
		if (e) callback(e)
		else if (res == null) callback('error', null)
		else callback(null, res.name)
	});
};

//- Get Films based on Cinema //
exports.getFilms = function(cinema, callback)
{
	films.find({CinemaID:cinema.CinemaID}).toArray(
		function(e, o) {
		if (e) callback(e)
		else {
			//- Sort films by date //
			o.sort(function(a, b){
    		var aa = a.release.split('/').reverse().join(),
        	bb = b.release.split('/').reverse().join();
    		return aa > bb ? -1 : (aa < bb ? 1 : 0);
			});
			callback(null, o)
		}
	});
};

//- Get Films based on edi //
exports.getSingleFilm = function(data, callback)
{
	films.findOne({edi:data.edi},
		function(e, res) {
		if (e) callback(e)
		else callback(null, res);
	});
}


//- Get Films based on User//
exports.getUserFilms = function(user, callback)
{
	userfilms.find({ $and: [{userid:user.userid, CinemaID:user.CinemaID}]}).toArray(
		function(e, res) {
			if (e) callback(e)
			else {
				if (user.sort=='alphabetical'){
					//- Sort films alphabetically //
					res.sort(function(a, b){
						if(a.title < b.title) return -1;
				    if(a.title > b.title) return 1;
				    return 0;
					});
				}
				else {
				//- Sort films by time added //
				res.sort(function(a, b){
					var aa = a.timestamp;
					bb = b.timestamp;
					return aa > bb ? -1 : (aa < bb ? 1 : 0);
				});
			}
			callback(null, res);
		}
	});
};

//- Adds or subtracts from a film's viewers //
exports.alterFilmViewers = function(film, callback)
{
	films.findOne({ $and: [{edi:film.edi, CinemaID:film.CinemaID}] }, function(e, o){
		if (e) callback(e, null);
		if (o) {
			if (film.viewers == '1'){
				o.viewers = parseInt(o.viewers) + 1
			}
			else if (film.viewers == '-1'){
				o.viewers = parseInt(o.viewers) - 1
			}
			films.save(o, {safe: true}, function(err) {
				if (err) callback(err);
				else callback(null, o);
			});
		}
	});
};

//- Add User Photos //
exports.addUserPhoto = function(photo, callback)
{
	//- If film relation does not already exist, add it to database
	userphotos.insert(photo, {safe: true}, callback);
};

//- Remove User Photos //
exports.removeUserPhoto = function(photo, callback)
{
		//-Removes film from userfilms//
		userphotos.remove({ $and: [{name:photo.name, userid:photo.userid}]}, callback);
};

//- Get Photos based on User//
exports.getUserPhotos = function(user, callback)
{
	userphotos.find({userid:user.userid}).toArray(
		function(e, res) {
			if (e) callback(e)
			else if (res) {
				//- Sort films by time added //
				res.sort(function(a, b){
					var aa = a.timestamp;
					bb = b.timestamp;
					return aa > bb ? -1 : (aa < bb ? 1 : 0);
				});
				//- Move Profile Photo to front of array //
				res.sort(function(a, b){
					var aa = a.profile;
					bb = b.profile;
					return aa > bb ? -1 : (aa < bb ? 1 : 0);
				});
				callback(null, res);
			}
		});
	};

//- Save profile photo information //
exports.setProfilePhoto = function(profilePhoto, callback)
{
	userphotos.find({userid:profilePhoto.userid}).each(
		function(e, photos) {
			if (e) callback(e)
			//- If photos found //
			if (photos) {
				//- Remove profile photo indicator from all user's photos //
				photos.profile = false;
				//- If photo name equals the selected photo name, set profile to true //
				if (photos.name == profilePhoto.name){
					photos.profile = true;
				}
				//- Save photo information //
				userphotos.save(photos, {safe: true}, function(err) {
					if (err) callback(err);
				});
			}
	});
	users.findOne({user:profilePhoto.user}, function(e, o){
		if (e) callback(e, null);
		else {
			o.profilePhoto = profilePhoto.name;
			users.save(o, {safe: true}, function(err) {
				if (err) callback(err);
				else callback(null, o);
			});
		}
	});
};

//- Check if photo exists in user's photos //
exports.checkPhoto = function(photo, callback)
{
	userphotos.findOne({$and: [{userid:photo.userid, name:photo.name}] }, function(e, o) {
		if (e){
			callback(e, null);
		}
		else if (o == null) {
			callback(e, null);
		}
		else {
			callback (null, o);
		}
	});
}

//- Save a sent message in the database //
exports.sendMessage = function(message, callback)
{
	messages.insert(message, {safe: true}, callback);
}

//- Get a users chat history with another user //
exports.getMessageHistory = function(data, callback)
{
	messages.find({
		$and : [ { $or :
			[{ sender: data.sender, receiver: data.receiver },
				{ sender: data.receiver, receiver: data.sender }]
			}]
		}).toArray(
		function(e, res) {
			if (e) callback(e)
			else if (res) {
				//- Sort films by time added //
				res.sort(function(a, b){
					var aa = a.timestamp;
					bb = b.timestamp;
					return aa < bb ? -1 : (aa > bb ? 1 : 0);
				});
				callback(null, res);
			}
		});
}

//- Gets unread messages from users //
exports.getMessageNotifications = function(data, callback)
{
	messages.find({ $and : [{receiver: data.receiver, seen: false }] }).toArray(
		function(e, message) {
			if (e) callback(e)
			//- If unseen messages found //
			else {
				var sendernames = [];
				for (var i = 0; i < message.length; i++) {
					if (sendernames.indexOf(message[i].sender) == -1) {
						sendernames.push(message[i].sender)
					}
				}
			callback(null, sendernames)
		}
	});
}

exports.updateMessageSession = function(message, callback)
{
	//- Check if sessions exists //
	messageSessions.findOne({
		$and : [ { $or :
			[{ user1: message.sender, user2: message.receiver },
				{ user1: message.receiver, user2: message.sender }]
			}]
		}, function(e, o) {
			if (e) callback(e, null);
			if (o) {
					//- update last message sent and the sender //
					o.lastMsg		= message.msg
					o.lastSender = message.sender
					o.timestamp = message.timestamp
					messageSessions.save(o, {safe: true}, function(err) {
						if (err) callback(err, null);
						else callback(null, o);
					});
			} else {
					//- If message session does not exist add it to the database //
					messageSessions.insert(
						{user1: message.sender, user2: message.receiver, lastMsg: message.msg, lastSender: message.sender, timestamp: message.timestamp},
						{ordered: false}, callback);
			}
	});
}

//- Gets unread messages from users //
exports.getMessageSessions = function(data, callback)
{
	messageSessions.find({
		$and : [ { $or :
			[{ user1: data.user },
				{ user2: data.user }]
			}]
		}).toArray(
			function(e, message) {
				if (e) callback(e)
				else {
					message.sort(function(a, b){
						var aa = a.timestamp;
						bb = b.timestamp;
						return aa > bb ? -1 : (aa < bb ? 1 : 0);
					});
					callback(null, message)
				}
	});
}

exports.dismissMessageNotifications = function(data, callback){
	//- If a user is accepting the request (sender is false) //
	messages.find({
		$and : [ { sender: data.sender, receiver: data.receiver, seen:false}]
	}).toArray( function(e, o) {
		if (e) callback(e, null);
		if (o) {
			for (var i = 0; i < o.length; i++) {
				o[i].seen = true
				messages.save(o[i], {safe: true}, function(err) {
					if (err) callback(err);
				});
			}
			callback(null, o);
		}
		else callback(null, null);
	});
}

exports.delAllRecords = function(callback)
{
	messageSessions.remove({}, callback); //-reset accounts collection for testing //
}


/* private encryption & validation methods */
var generateSalt = function()
{
	var set = '0123456789abcdefghijklmnopqurstuvwxyzABCDEFGHIJKLMNOPQURSTUVWXYZ';
	var salt = '';
	for (var i = 0; i < 10; i++) {
		var p = Math.floor(Math.random() * set.length);
		salt += set[p];
	}
	return salt;
}

var md5 = function(str) {
	return crypto.createHash('md5').update(str).digest('hex');
}

var saltAndHash = function(pass, callback)
{
	var salt = generateSalt();
	callback(salt + md5(pass + salt));
}

var validatePassword = function(plainPass, hashedPass, callback)
{
	var salt = hashedPass.substr(0, 10);
	var validHash = salt + md5(plainPass + salt);
	callback(null, hashedPass == validHash);
}

/* auxiliary methods */

var getObjectId = function(id)
{
	return users.db.bson_serializer.ObjectID.createFromHexString(id)
}

var findById = function(id, callback)
{
	users.findOne({_id: getObjectId(id)},
		function(e, res) {
		if (e) callback(e)
		else callback(null, res)
	});
};

var findByMultipleFields = function(a, callback)
{
//-this takes an array of name/val pairs to search against {fieldName : 'value'} //
	users.find( { $or : a } ).toArray(
		function(e, results) {
		if (e) callback(e)
		else callback(null, results)
	});
}
