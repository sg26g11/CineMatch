
var AGE = require('./modules/age-list');
var GEN = require('./modules/genders');
var PREF = require('./modules/preferences');
var HT = require('./modules/heightlist');
var BOD = require('./modules/bodytypes');
var AM = require('./modules/account-manager');
var EM = require('./modules/email-dispatcher');
var XML = require('./modules/xmlParser');
var lwip = require('lwip');
var fs = require('fs');

module.exports = function(app) {

//- Sets interval inbetween each XML update ///////////////////////////////////////////////////////////////////////////////////
var cinemaxml = setInterval(function(){ XML.parseCinemas()}, 1000000);

//-DEV /////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get('/print', function(req, res) {
	AM.getAllRecords( function(e, accounts){
		res.render('print', { title : 'Account List', accts : accounts });
	})
});

//-DEV/////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.post('/delete', function(req, res){
	AM.deleteAccount(req.body.id, function(e, obj){
		if (!e){
			res.clearCookie('user');
			res.clearCookie('pass');
			req.session.destroy(function(e){ res.send('ok', 200); });
		}	else{
			res.send('record not found', 400);
		}
	});
});

//-Check Logout /////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post('/home', function(req, res){
	if (req.param('logout') == 'true'){
		res.clearCookie('user');
		res.clearCookie('pass');
		res.clearCookie('film');
		res.clearCookie('age');
		res.clearCookie('show');
		req.session.destroy(function(e){ res.send('ok', 200); });
	}
});

//- DEV ///////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/reset', function(req, res) {
	AM.delAllRecords(function(){
		res.redirect('/print');
	});
});

//-main login page /////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/', function(req, res){
	//-check if the user's credentials are saved in a cookie //
	if (req.cookies.user == undefined || req.cookies.pass == undefined){
		res.render('login', { title: 'Hello - Please Login To Your Account' });
	}	else{
		//-attempt automatic login //
		AM.autoLogin(req.cookies.user, req.cookies.pass, function(o){
			if (o != null){
				req.session.user = o;
				res.redirect('/home');
			}	else{
				res.render('login', { title: 'Hello - Please Login To Your Account' });
			}
		});
	}
});

//-set cookies /////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post('/', function(req, res){
	AM.manualLogin(req.param('user'), req.param('pass'), function(e, o){
		if (!o){
			res.send(e, 400);
		}	else{
			req.session.user = o;
			if (req.param('remember-me') == 'true'){
				res.cookie('user', o.user, { maxAge: 900000 });
				res.cookie('pass', o.pass, { maxAge: 900000 });
			}
			res.send(o, 200);
		}
	});
});

//-logged-in user homepage /////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/home', function(req, res) {
	if (req.session.user == null){
		//-if user is not logged-in redirect back to login page //
		res.redirect('/');
	}   		//- Load account Page //
	else {
		AM.getFilms({CinemaID : req.session.user.CinemaID}, function(e, obj){
			if (e){
				//-if error updating//
				res.send('error', 400);
			}	else{
				//function to get user filmlist //
				AM.getUserFilms({userid : req.session.user._id.toString(), CinemaID: req.session.user.CinemaID}, function(e, userfilms){
					if (e){ res.send('error', 400);}
					else if (userfilms) {
						//- array of user film titles //
						var userfilmsedi = [];
						for (var i = 0; i < userfilms.length; i++) {
							userfilmsedi.push(userfilms[i].edi);
						}
						//- Get user nofications //
						AM.getMatchRequests({matchuser: req.session.user.user}, function(e, matchRequests){
							if (e) res.send('error', 400)
							else {
								var matchNotifications = [];
								for (var i = 0; i < matchRequests.length; i++) {
									if (matchRequests[i].seen == false) {
										matchNotifications.push(matchRequests[i])
									}
								}
								AM.getMessageNotifications({receiver: req.session.user.user}, function(e, messageNotifications){
									if (e) res.render('404', { title: 'Page Not Found'})
									else {
										res.render('home', {
											title : 'Home',
											messageNotifications : messageNotifications,
											matchNotifications : matchNotifications,
											userfilms : userfilmsedi,
											films : obj,
											udata : req.session.user
										});
									}
								});
							}
						});
					}
				});
			}
		});
	}
});

//- Load rest page /////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/reset-password', function(req, res) {
	var email = req.query["e"];
	var passH = req.query["p"];
	AM.validateResetLink(email, passH, function(e){
		if (e != 'ok'){
			res.redirect('/');
		} else{
			//-save the user's email in a session instead of sending to the client //
			req.session.reset = { email:email, passHash:passH };
			res.render('reset', { title : 'Reset Password' });
		}
	})
});

//- Load Signup Page /////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/signup', function(req, res) {
	AM.getAllCinemas( function(e, cinemas){
		if (e) res.send('error', 400)
		else res.render('signup', {
			title: 'Signup',
			preferences	: PREF,
			genders 		: GEN,
			agelist 		: AGE,
			cinemas 		: cinemas
		})
	});
});

//- Add new user to database with some dummy details //////////////////////////////////////////////////////////////////////////////////////////
app.post('/signup', function(req, res){
	//- Form checks if javascript is disabled //
	if (typeof req.param('name') !== 'undefined'
			&& typeof req.param('age') !== 'undefined'
			&& typeof req.param('gender') !== 'undefined'
			&& typeof req.param('preference') !== 'undefined'
			&& typeof req.param('cinema') !== 'undefined'
			&& typeof req.param('email') !== 'undefined'
			&& typeof req.param('user') !== 'undefined'
			&& typeof req.param('pass') !== 'undefined'
			&& req.param('name') !== ''
			&& req.param('age') !== ''
			&& req.param('gender') !== ''
			&& req.param('preference') !== ''
			&& req.param('cinema') !== ''
			&& req.param('email') !== ''
			&& req.param('user') !== ''
			&& req.param('pass') !== ''
			&& req.param('age') !== 'Please Select..'
			&& req.param('gender') !== 'Please Select..'
			&& req.param('preference') !== 'Please Select..'
			&& req.param('cinema') !== 'Please Select..'
		){
	//- Get cinema name from ID //
	AM.getCinemaNameFromID({CinemaID:req.param('cinema')},
	function(e, cinema){
		if (e) res.redirect('/');
		else {
		//- Save cinema name for storing in database //
		var cinemaName = cinema;
		AM.addNewUser({
			name 				: req.param('name'),
			age 				: req.param('age'),
			gender 			: req.param('gender'),
			preference 	: req.param('preference'),
			cinema			: cinemaName,
			height 			: '-',
			bodyType		: '-',
			bio 				: 'Nothing written yet!',
			email 			: req.param('email'),
			user 				: req.param('user'),
			pass				: req.param('pass'),
			profilePhoto	: 'user.jpg',
			CinemaID		: req.param('cinema')
		}, function(e){
			if (e){
				res.send(e, 400);
			}	else{
				res.send('ok', 200);
			}
		});
	}
	})
}
else res.send('Your JavaScript is disabled, please enable it to use our website.', 200);
});

//-Load User Profile /////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/:username', function(req, res) {
	//-if user is not logged-in redirect back to login page //
	if (req.session.user == null){
		res.redirect('/');
	}
	else {
		//- Check user exists//
		AM.checkUser({user : req.params.username
		}, function(e, o){
			//-if no object returned, user does not exist, throw 404 //
			if (o === null){
				res.render('404', { title: 'Page Not Found'});
			} else {
				//function to get user filmlist //
				AM.getUserFilms({userid : o._id.toString(), CinemaID: o.CinemaID}, function(e, obj){
					if (e){ res.send('error', 400);}
					else if (obj === null){
						res.render('404', { title: 'Page Not Found'});
					}
					else{
						//function to get user photos //
						AM.getUserPhotos({userid : o._id.toString()}, function(e, photos){
							if (e) res.render('404', { title: 'Page Not Found'})
							else{
								AM.getMatchRequests({matchuser: req.session.user.user}, function(e, matchRequests){
									if (e) res.render('404', { title: 'Page Not Found'})
									else {
										//- Create array of all usernames from match requests //
										var allRequestUsernames = [];
										var matchNotifications = [];
										for (var i = 0; i < matchRequests.length; i++) {
											if (matchRequests[i].seen == false) {
												matchNotifications.push(matchRequests[i])
											}
											allRequestUsernames.push(matchRequests[i].receiver)
										}
										//- Get user accounts from list of IDs //
										AM.getUsersByID({users:allRequestUsernames}, function(e, users){
											if (e) res.render('404', { title: 'Page Not Found'})
											else {
												//- Combine matchRequests and user objects //
												for (var i = 0; i < users.length; i++) {
													for (var x = 0; x < matchRequests.length; x++) {
														if (users[i].user == matchRequests[x].receiver) {
															for(var key in matchRequests[x]) {
																if (matchRequests[x].hasOwnProperty(key)) {
																	users[i][key] = matchRequests[x][key];
																}
															}
														}
													}
												}
												//- Create array of accepted matches array //
												var acceptedRequests = [];
												for (var i = 0; i < users.length; i++) {
													if (users[i].accepted == true) {
														acceptedRequests.push(users[i])
													}
												}
												AM.getMessageNotifications({receiver: req.session.user.user}, function(e, messageNotifications){
													if (e) res.render('404', { title: 'Page Not Found'})
													else {
														//-Load Profile
														res.render('profile', {
															title 						: 'Profile',
															messageNotifications 	: messageNotifications,
															matchNotifications		: matchNotifications,
															myfilms 					: obj,
															photos 						: photos,
															acceptedRequests	: acceptedRequests,
															allRequests				: users,
															user 							: o,
															udata 						: req.session.user
														});
													}
												});
											}
										});
									}
								});
							}
						});
					}
				});
			}
		});
	}
});

//-Load Edit Profile Page /////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/:username/edit-profile', function(req, res) {
	if (req.session.user == null){
		//-if user is not logged-in redirect back to login page //
		res.redirect('/');
	}
	//- Redirect if url is changed //
	else if(req.session.user.user !== req.params.username) {
		res.redirect('/' + req.session.user.user + '/edit-profile');
	} else{
		AM.getAllCinemas( function(e, cinemas){
			if (e) re.send('error', 400)
			else {
				//- Get user nofications //
				AM.getMatchRequests({matchuser: req.session.user.user}, function(e, matchRequests){
					if (e) res.send('error', 400)
					else {
						var matchNotifications = [];
						for (var i = 0; i < matchRequests.length; i++) {
							if (matchRequests[i].seen == false) {
								matchNotifications.push(matchRequests[i])
							}
						}
						AM.getMessageNotifications({receiver: req.session.user.user}, function(e, messageNotifications){
							if (e) res.render('404', { title: 'Page Not Found'})
							else {
								//- load edit profile page//
								res.render('edit-profile', {
									title : 'CineMatch',
									messageNotifications : messageNotifications,
									matchNotifications : matchNotifications,
									preferences	: PREF,
									genders 		: GEN,
									agelist 		: AGE,
									heightlist 	: HT,
									bodytypes 	: BOD,
									cinemas 		: cinemas,
									udata : req.session.user
								});
							}
						});
					}
				});
			}
		});
	}
});

//-Update Profile /////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post('/update-profile', function(req, res){
	if (req.param('user') !== undefined) {
		//-Check if user field has been tampered //
		if (req.session.user.user !== req.param('user')) res.redirect('/');
		else if (typeof req.param('name') !== 'undefined'
				&& typeof req.param('age') !== 'undefined'
				&& typeof req.param('gender') !== 'undefined'
				&& typeof req.param('preference') !== 'undefined'
				&& typeof req.param('height') !== 'undefined'
				&& typeof req.param('bodyType') !== 'undefined'
				&& typeof req.param('cinema') !== 'undefined'
				&& typeof req.param('bio') !== 'undefined'
				&& req.param('name') !== ''
				&& req.param('age') !== ''
				&& req.param('gender') !== ''
				&& req.param('preference') !== ''
				&& req.param('height') !== ''
				&& req.param('bodyType') !== ''
				&& req.param('cinema') !== ''
				&& req.param('age') !== 'Please Select..'
				&& req.param('gender') !== 'Please Select..'
				&& req.param('preference') !== 'Please Select..'
			){
			AM.getCinemaNameFromID({CinemaID:req.param('cinema')},
			function(e, cinema){
				if (e) res.send('error', 400)
				//- Save cinema name for storing in database //
				var cinemaName = cinema;
				AM.updateProfile({
					user				: req.param('user'),
					name				: req.param('name'),
					age 				: req.param('age'),
					gender 			: req.param('gender'),
					cinema			: cinemaName,
					preference 	: req.param('preference'),
					height 			: req.param('height'),
					bodyType 		: req.param('bodyType'),
					CinemaID		: req.param('cinema'),
					bio 				: req.param('bio')
				}, function(e, o){
					if (e){
						//-if error updating//
						res.send('error-updating-profile', 400);
					}	else{
						req.session.user = o;
						//-update the user's login cookies if they exists //
						if (req.cookies.user != undefined && req.cookies.pass != undefined){
							res.cookie('user', o.user, { maxAge: 900000 });
							res.cookie('pass', o.pass, { maxAge: 900000 });
						}
						res.redirect('/' + req.session.user.user);
					}
				});
			})
		}
		else res.redirect('/');
	}
});

//-Load Account Page /////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/:username/MyAccount', function(req, res) {
	if (req.session.user == null){
		//-if user is not logged-in redirect back to login page //
		res.redirect('/');
	}
	//- Redirect if url is changed //
	else if(req.session.user.user !== req.params.username) {
		res.redirect('/' + req.session.user.user + '/MyAccount');
	}
	//- Load account Page //
	else{
		//- Get user nofications //
		AM.getMatchRequests({matchuser: req.session.user.user}, function(e, matchRequests){
			if (e) res.send('error', 400)
			else {
				var matchNotifications = [];
				for (var i = 0; i < matchRequests.length; i++) {
					if (matchRequests[i].seen == false) {
						matchNotifications.push(matchRequests[i])
					}
				}
				AM.getMessageNotifications({receiver: req.session.user.user}, function(e, messageNotifications){
					if (e) res.render('404', { title: 'Page Not Found'})
					else {
						res.render('MyAccount', {
							title : 'CineMatch',
							messageNotifications : messageNotifications,
							matchNotifications : matchNotifications,
							udata : req.session.user
						});
					}
				});
			}
		});
	}
});

//- Handle Posted Account Page, updating database //////////////////////////////////////////////////////////////////////////////////////
app.post('/update-account', function(req, res){
	if (req.param('user') != undefined) {
		//-Check if user field or url has been tampered //
		if (req.session.user.user !== req.param('user')){
			res.redirect('/');
		}
		else if (
					typeof req.param('name') !== 'undefined'
					&& typeof req.param('email') !== 'undefined'
					&& typeof req.param('user') !== 'undefined'
					&& req.param('name') !== ''
					&& req.param('email') !== ''
					&& req.param('user') !== ''
		){
			AM.updateUser({
				user 		: req.param('user'),
				name 		: req.param('name'),
				email 	: req.param('email'),
				pass		: req.param('pass')
			}, function(e, o){
				if (e){
					//-if error updating//
					res.send('error-updating-account', 400);
				}	else{
					req.session.user = o;
					//-update the user's login cookies if they exists //
					if (req.cookies.user != undefined && req.cookies.pass != undefined){
						res.cookie('user', o.user, { maxAge: 900000 });
						res.cookie('pass', o.pass, { maxAge: 900000 });
					}
					res.send('ok', 200);
				}
			});
		}
		else res.redirect('/');
	}
});


//- Redirect if leaf removed from URL //
app.get(('/:username/CineMatches/', '/:username/CineMatches'), function(req, res) {
	if (req.session.user == null){
		//-if user is not logged-in redirect back to login page //
		res.redirect('/');
	}
	else res.redirect('/' + req.session.user.user + '/CineMatches/1')
});

//-Load matches page /////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.all('/:username/CineMatches/:page', function(req, res) {
	if (req.session.user == null){
		//-if user is not logged-in redirect back to login page //
		res.redirect('/');
	}
	//- Redirect if url is changed //
	else if(req.session.user.user !== req.params.username) {
		res.redirect('/' + req.session.user.user + '/CineMatches/1');
	} else {

		//- get user films //
		AM.getUserFilms({sort : 'alphabetical', userid : req.session.user._id.toString(), CinemaID: req.session.user.CinemaID}, function(e, films){
			if (e){ res.send('error', 400);}
			else if (films) {

				//- Set variables for storing post data & if no data is submitted //
				var selectedFilm =[];
				var selectedAge ='All';
				var selectedShow = 'All';

				//- Set cookies if search form is posted //
				if (typeof req.param('film') !== 'undefined' || typeof req.param('age') !== 'undefined' || typeof req.param('show') !== 'undefined'){
					res.cookie('film', req.param('film'), { maxAge: 900000 });
					res.cookie('age', req.param('age'), { maxAge: 900000 });
					res.cookie('show', req.param('show'), { maxAge: 900000 });
					selectedFilm.push(req.param('film'));
					selectedAge = req.param('age');
					selectedShow = req.param('show');
				}
				//- Set values of selected film & age range from cookies if set //
				else if (typeof req.cookies.film !== 'undefined' || typeof req.cookies.age !== 'undefined' || typeof req.cookies.show !== 'undefined') {
					selectedFilm.push(req.cookies.film);
					selectedAge = req.cookies.age;
					selectedShow = req.cookies.show;
				}
				//- If 'any films' is selected, selectedFilm = user films array //
				if (selectedFilm == '-- Any of MyFilms --'){
					//- Create array of film titles to send to db query //
					for (var i = 0; i < films.length; i++) {
						selectedFilm.push(films[i].title);
					}
				}
				//- If 'any cinema film' is selected, make selected film array empty (so that the query includes all films) //
				else if (selectedFilm == 'Any Cinema Film' || selectedFilm == '') {
					selectedFilm = [];
				}
				//- Get matches based on cinema, preference & age if selected //
				AM.getMatchesCinema(
					{	CinemaID 		: req.session.user.CinemaID,
						preference	: req.session.user.preference,
						gender			: req.session.user.gender,
						age					: selectedAge,
						user				: req.session.user.user
					}, function(e, matches){
						if (e)res.send('error', 400)
						else if (matches) {
							//- Create username Id list //
							var usernames = [];
							for (var i = 0; i < matches.length; i++) {
								usernames.push(matches[i].user);
							}
							AM.getMatchRequests({matchuser: req.session.user.user}, function(e, matchRequests){
								if (e) res.send('error', 400)
								else {
									//- Create array of all usernames from match requests //
									var allRequestUsernames = [];
									var matchNotifications = [];
									for (var i = 0; i < matchRequests.length; i++) {
										if (matchRequests[i].seen == false) {
											matchNotifications.push(matchRequests[i])
										}
										allRequestUsernames.push(matchRequests[i].receiver)
									}

									var filteredmatches = [];
									//- If all matches are to be shown //
									if (selectedShow == 'All') {
										filteredmatches = usernames;
									}
									//- Filter matches as submitted in form //
									else if (selectedShow == 'New Users') {
										for (var i = 0; i < usernames.length; i++) {
											//- If username does not appear in allrequests array //
											if (allRequestUsernames.indexOf(usernames[i])==-1)
												filteredmatches.push(usernames[i])
											}
									}
									else if (selectedShow == 'Matched Users'){
										for (var i = 0; i < matchRequests.length; i++) {
											//- If a request has been accepted //
											if (matchRequests[i].accepted == true)
												filteredmatches.push(matchRequests[i].receiver)
											}
									}
									else if (selectedShow == 'Sent Requests'){
										for (var i = 0; i < matchRequests.length; i++) {
											//- If a request has been sent and not accepted //
											if (matchRequests[i].sender == true && matchRequests[i].accepted == false) {
												filteredmatches.push(matchRequests[i].receiver)
											}
										}
									}
									else if (selectedShow == 'Received Requests'){
										for (var i = 0; i < matchRequests.length; i++) {
											//- If a request has been received and not accepted //
											if (matchRequests[i].sender == false && matchRequests[i].accepted == false)
												filteredmatches.push(matchRequests[i].receiver)
											}
									}
									//- Get user accounts from list of IDs //
									AM.getUsersByID({users:filteredmatches}, function(e, users){
										if (e) res.render('404', { title: 'Page Not Found'})
										else {
											//- Combine matchRequests and user objects //
											for (var i = 0; i < users.length; i++) {
												for (var x = 0; x < matchRequests.length; x++) {
													if (users[i].user == matchRequests[x].receiver) {
														for(var key in matchRequests[x]) {
															if (matchRequests[x].hasOwnProperty(key)) {
																users[i][key] = matchRequests[x][key];
															}
														}
													}
												}
											}
											//- Create array of accepted matches array //
											var acceptedRequests = [];
											for (var i = 0; i < allRequestUsernames.length; i++) {
												if (allRequestUsernames[i].accepted == true) {
													acceptedRequests.push(users[i])
												}
											}
											//- Gets film matches from list of usernames //
											AM.getMatchesFilms(
												{	CinemaID 		: req.session.user.CinemaID,
													usernames		: filteredmatches,
													user				: req.session.user.user,
													film				: selectedFilm
												}, function(e, filmMatches){
													if (e){res.send('error', 400);
													console.log(e)}
													else {
														var filmMatchesUsers = [];
														//- Create id list from matching films //
														for (var i = 0; i < filmMatches.length; i++) {
															//- Check for duplicates //
															if (filmMatchesUsers.indexOf(filmMatches[i].user)==-1) {
																filmMatchesUsers.push(filmMatches[i].user);
															}
														}
														//- Get all user account from username list //
														AM.getUsersByID(
															{ users : filmMatchesUsers
															}, function(e, finalMatches){
																if (e) res.send('error', 400)
																else {
																	//- Check page number entered is a positive int and non decimal //
																	if (isNaN(req.params.page)==false && req.params.page.indexOf(".")==-1 && req.params.page>0){
																		//- Number of match tiles displayed per page //
																		var tiles = 18
																		//- From page number, determine the start and end points in the matches array for the slice() //
																		var start = ((req.params.page-1)*tiles)
																		var end = start + tiles
																		var match = finalMatches.slice(start, end);
																		//- Calculate total page numbers from number of results and matches per page //
																		var totalPages = Math.floor(finalMatches.length/tiles);
																		var remainder = finalMatches.length/tiles % 1;
																		if (remainder !== 0) totalPages = totalPages + 1;

																		//- If array contains 0s matches //
																		if (match.length == 0 && finalMatches.length > 0 ) {
																			res.redirect('/' + req.session.user.user + '/CineMatches/1');
																		}
																		else {
																			AM.getMessageNotifications({receiver: req.session.user.user}, function(e, messageNotifications){
																				if (e) res.render('404', { title: 'Page Not Found'})
																				else {
																					//- Render match page //
																					res.render('CineMatches', {
																						title 				: 'CineMatch',
																						messageNotifications : messageNotifications,
																						matchNotifications	: matchNotifications,
																						allRequests		: users,
																						start					: start,
																						end						: end,
																						preferences 	: PREF,
																						selectedFilm	: selectedFilm,
																						selectedAge 	: selectedAge,
																						selectedShow	: selectedShow,
																						ageRange			: AGE,
																						films					: films,
																						matches 			: match,
																						totalMatches	: finalMatches.length,
																						totalPages		: totalPages,
																						currentPage		: req.params.page,
																						user 					: req.session.user,
																						udata 				: req.session.user
																					});
																				}
																			});
																		}
																	}
																	else {
																		res.redirect('/' + req.session.user.user + '/CineMatches/1');
																	}
																}
															});
														}
													});
												}
											});
										}
									});
								}
								else {
									res.redirect('/' + req.session.user.user + '/CineMatches/1');
								}
							});
						}
					});
				}
});

//-Load MyMatches /////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/:username/MyMatches', function(req, res) {
	//-if user is not logged-in redirect back to login page //
	if (req.session.user == null){
		res.redirect('/');
	}
	//- Redirect if url is changed //
	else if(req.session.user.user !== req.params.username) {
		res.redirect('/' + req.session.user.user + '/MyMatches');
	}
	else {
		//- Check user exists//
		AM.checkUser({user : req.params.username
		}, function(e, o){
			//-if no object returned, user does not exist, throw 404 //
			if (o === null){
				res.render('404', { title: 'Page Not Found'});
			} else {
				AM.getMatchRequests({matchuser: req.session.user.user}, function(e, matchRequests){
					if (e) res.render('404', { title: 'Page Not Found'})
					else {
						//- Create array of all usernames from match requests //
						var allRequestUsernames = [];
						var matchNotifications = [];
						for (var i = 0; i < matchRequests.length; i++) {
							if (matchRequests[i].seen == false) {
								matchNotifications.push(matchRequests[i])
							}
							allRequestUsernames.push(matchRequests[i].receiver)
						}
						//- Get user accounts from list of IDs //
						AM.getUsersByID({users:allRequestUsernames}, function(e, users){
							if (e) res.render('404', { title: 'Page Not Found'})
							else {
								//- Combine matchRequests and user objects //
								for (var i = 0; i < users.length; i++) {
									for (var x = 0; x < matchRequests.length; x++) {
										if (users[i].user == matchRequests[x].receiver) {
											for(var key in matchRequests[x]) {
												if (matchRequests[x].hasOwnProperty(key)) {
													users[i][key] = matchRequests[x][key];
												}
											}
										}
									}
								}
								//- Create array of accepted matches, new matches & match requests //
								var acceptedRequests = [];
								var newMatches = [];
								var newMatchRequests = [];
								var sentRequests = [];
								for (var i = 0; i < users.length; i++) {
									//- If match is seen //
									if (users[i].accepted == true && users[i].seen == true) {
										acceptedRequests.push(users[i])
									}
									// If match has not been seen //
									else if (users[i].accepted == true && users[i].seen == false) {
										newMatches.push(users[i])
									}
									// If new match request//
									else if (users[i].accepted == false && users[i].seen == false && users[i].sender == false) {
										newMatchRequests.push(users[i])
									}
									// If new match request//
									else if (users[i].accepted == false && users[i].sender == true) {
										sentRequests.push(users[i])
									}
								}
								AM.getMessageNotifications({receiver: req.session.user.user}, function(e, messageNotifications){
									if (e) res.render('404', { title: 'Page Not Found'})
									else {
										//-Load MyMatches //
										res.render('MyMatches', {
											allRequests				: users,
											messageNotifications : messageNotifications,
											matchNotifications 		: matchNotifications,
											acceptedRequests	: acceptedRequests,
											newMatches				: newMatches,
											newMatchRequests	: newMatchRequests,
											sentRequests			: sentRequests,
											user 							: o,
											udata 						: req.session.user
										});
									}
								});
							}
						});
					}
				});
			}
		});
	}
});

//-Add match request to matches table /////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post('/add-match-request/:username', function(req, res) {
	if (req.session.user == null){
		//-if user is not logged-in redirect back to login page //
		res.redirect('/');
	}
	else {
		//- Check user exists//
		AM.checkUser({user : req.params.username
		}, function(e, o){
			//-if no object returned, user does not exist, throw 404 //
			if (o === null){
				res.render('404', { title: 'Page Not Found'});
			} else {
				//- If user is not sending the reques to themself //
				if (req.session.user.user !== req.params.user){
					if (req.params.username !== '' || typeof req.params.username !== 'undefined' ){
						AM.addmatchrequest({
							matchuser		: req.session.user.user,
							receiver 		: req.params.username
						}, function(e, obj){
							if (e) res.send('error', 400)
							else{
								res.redirect('/');
							}
						});
					}
				}
				else {
					res.redirect('/');
				}
			}
		});
	}
});

//-Add match request to matches table /////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post('/decline-match-request/:username', function(req, res) {
	if (req.session.user == null){
		//-if user is not logged-in redirect back to login page //
		res.redirect('/');
	}
	else {
		//- Check user exists//
		AM.checkUser({user : req.params.username
		}, function(e, o){
			//-if no object returned, user does not exist, throw 404 //
			if (o === null){
				res.render('404', { title: 'Page Not Found'});
			} else {
				//- If user is not sending the reques to themself //
				if (req.session.user.user !== req.params.user){
					if (req.params.username !== '' || typeof req.params.username !== 'undefined' ){
						AM.declineMatchRequest({
							matchuser		: req.session.user.user,
							receiver 		: req.params.username
						}, function(e, obj){
							if (e) res.send('error', 400)
							else{
								res.redirect('/');
							}
						});
					}
				}
				else {
					res.redirect('/');
				}
			}
		});
	}
});

//- Load Photo page /////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/:username/MyPhotos', function(req, res) {
	//-if user is not logged-in redirect back to login page //
	if (req.session.user == null){
		res.redirect('/');
	}
	else {
		//- Check user exists//
		AM.checkUser({user : req.params.username
		}, function(e, o){
			//-if no object returned, user does not exist, throw 404 //
			if (o === null){
				res.render('404', { title: 'Page Not Found'});
			} else {
				//function to get user photos //
				AM.getUserPhotos({userid : o._id.toString()}, function(e, photos){
					if (e){ res.render('404', { title: 'Page Not Found'});}
					else{
						//- Get user nofications //
						AM.getMatchRequests({matchuser: req.session.user.user}, function(e, matchRequests){
							if (e) res.send('error', 400)
							else {
								var matchNotifications = [];
								for (var i = 0; i < matchRequests.length; i++) {
									if (matchRequests[i].seen == false) {
										matchNotifications.push(matchRequests[i])
									}
								}
								AM.getMessageNotifications({receiver: req.session.user.user}, function(e, messageNotifications){
									if (e) res.render('404', { title: 'Page Not Found'})
									else {
										//-Load Profile
										res.render('MyPhotos', {
											title : 'Photos',
											messageNotifications : messageNotifications,
											matchNotifications : matchNotifications,
											photos : photos,
											user : o,
											udata : req.session.user
										});
									}
								});
							}
						});
					}
				});
			}
		});
	}
});

//- Handle Posted photo uploads /////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post('/add-photo', function(req, res) {

	//-if user is not logged-in redirect back to login page //
	if (req.session.user == null){
		res.redirect('/');
	}
	var fstream;

	//- Use busboy //
	req.pipe(req.busboy);
	req.busboy.on('file', function (fieldname, file, filename) {
		if (filename !== ''){

			//- Specify image directory //
			var filename = Math.floor(Date.now() / 100) + filename;
			fstream = fs.createWriteStream(__dirname + '/../public/img/userPhotos/' + filename);
			file.pipe(fstream);

			try{
				//- Create thumbnail //
				lwip.open(__dirname+'/../public/img/userPhotos/' + filename, function(err, image){
					if (err) res.send('error-updating-profile', 400);
					else if (image !== '') {

						//- If image is wider than tall //
						if (image.width() > image.height()){
							//- Crop by image height //
							image.crop(image.height(),image.height(), function(err, image) {
								if (err) res.send('error-updating-profile', 400);
								//- Save cropped image in thumbnail file //
								else { image.writeFile(__dirname + '/../public/img/userPhotos/thumbs/' + filename, function(err){
									if (err) res.send('error-updating-profile', 400);
								});
							}
						});
					}

					//- If image is taller than wide
					else {
						//- Crop by image width //
						image.crop(image.width(),image.width(), function(err,image) {
							if (err) res.send('error-updating-profile', 400);
							//- Save cropped image in thumbnail file //
							else { image.writeFile(__dirname + '/../public/img/userPhotos/thumbs/' + filename, function(err){
								if (err) res.send('error-updating-profile', 400);
							});
						}
					});
				}
			}
			else {
				res.send('error-updating-profile', 400);
			}
		});
		if (res.headersSent == true){}
		else {
			//- Get user's photos to assign new profile photo //
			AM.getUserPhotos({userid : req.session.user._id.toString()}, function(e, photos){
				if (e) res.render('404', { title: 'Page Not Found'});

				//- If this is the user's first photo uploaded, set added photo as profile photo //
				else if (photos.length == 0) {
					AM.setProfilePhoto({
						name 		: filename,
						user		: req.session.user.user,
						userid 	: req.session.user._id.toString()
					}, function(e, o){
						if (e) res.render('404', { title: 'Page Not Found'});
						req.session.user.profilePhoto = filename;
					});
				}
			});
		}
		if (res.headersSent == true){}
		else {
			//- Add photo path and user relation to userphotos table //
			AM.addUserPhoto({
				name 			: filename,
				profile		: false,
				userid		: req.session.user._id
			}, function(e, o){
				if (e) res.render('404', { title: 'Page Not Found'});
				else if (res.headersSent){}
				else res.redirect('/'+req.session.user.user+'/MyPhotos');
			});
		}
	}
	catch (err) {
		fs.unlink('./app/public/img/userPhotos/' + filename, function (err) {
			if (err) res.send('error-updating-profile', 400);
			else{
				var error = true;
				res.redirect('/'+req.session.user.user+'/MyPhotos');
			}
		});
	}
}
//- If no file selected //
else res.redirect('/'+req.session.user.user+'/MyPhotos');
});
});

//- Set profile Photo /////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/update-profile-photo/:photoName', function(req, res) {
	//-if user is not logged-in redirect back to login page //
	if (req.session.user == null){
		res.redirect('/');
	}
	else {
		//- Check photo exists //
		AM.checkPhoto({
			userid : req.session.user._id.toString(),
			name : req.params.photoName
		}, function(e, o){
			//-if no object returned, photo does not exist, throw 404 //
			if (o === null){
				res.render('404', { title: 'Page Not Found'});
			} else {
				AM.setProfilePhoto({
					name 		: req.params.photoName,
					user		: req.session.user.user,
					userid 	: req.session.user._id.toString()
				}, function(e, o){
					if (e) res.render('404', { title: 'Page Not Found'});
					else if (o) {
						req.session.user.profilePhoto = o.name;
						//-Load Profile
						res.redirect('/' + req.session.user.user + '/MyPhotos');
					}
				});
			}
		});
	}
});

//-Remove photo from user photos /////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/remove-photo/:photoname', function(req, res) {
	if (req.session.user == null){
		//-if user is not logged-in redirect back to login page //
		res.redirect('/');
	}
	else {
		//- Check photo exists //
		AM.checkPhoto({
			userid : req.session.user._id.toString(),
			name : req.params.photoName
		}, function(e, o){
			if (e) res.render('404', { title: 'Page Not Found'});
			else {
		//- Remove photo from directory //
		AM.removeUserPhoto({
			name : req.params.photoname,
			userid : req.session.user._id
		}, function(e, o){
			//-if no object returned, user does not exist, throw 404 //
			if (o === null){
				res.render('404', { title: 'Page Not Found'});
			} else{
				//- Remove photo from directory
				fs.unlink('./app/public/img/userPhotos/' + req.params.photoname, function (err) {
					if (err) res.render('404', { title: 'Page Not Found'});
					else fs.unlink('./app/public/img/userPhotos/thumbs/' + req.params.photoname, function (err) {
						//- If profile photo is deleted, assign new profile photo //
						if (req.params.photoname = req.session.user.profilePhoto) {
							//- Get user's photos to assign new profile photo //
							AM.getUserPhotos({userid : req.session.user._id.toString()}, function(e, photos){
								if (e){ res.render('404', { title: 'Page Not Found'});}
								//- If user has no photos reset profile photo to 'user.jpg' //
								else if (photos.length == 0) {
									AM.setProfilePhoto({
										name 		: 'user.jpg',
										user		: req.session.user.user,
										userid 	: req.session.user._id.toString()
									}, function(e, user){

										if (e) res.render('404', { title: 'Page Not Found'});
									});
									req.session.user.profilePhoto = 'user.jpg';
								}
								//- If user has photos, assign profile photo as first in collection //
								else if (photos.length > 0) {
									AM.setProfilePhoto({
										name 		: photos[0].name,
										user		: req.session.user.user,
										userid 	: req.session.user._id.toString()
									}, function(e, user){
										if (e) res.render('404', { title: 'Page Not Found'});
									});
									req.session.user.profilePhoto = photos[0].name;
								}
							});
						}
					});
				});
				res.redirect('/' + req.session.user.user + '/MyPhotos');
			}
		});
	}
	});
	}
});


//-Load User films /////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/:username/MyFilms', function(req, res) {
	//-if user is not logged-in redirect back to login page //
	if (req.session.user == null){
		res.redirect('/');
	}
	else {
		//- Check user exists//
		AM.checkUser({user : req.params.username
		}, function(e, o){
			//-if no object returned, user does not exist, throw 404 //
			if (o === null){
				res.render('404', { title: 'Page Not Found'});
			} else {
				//function to get user filmlist //
				AM.getUserFilms({userid : o._id.toString(), CinemaID: o.CinemaID}, function(e, obj){
					if (e){ res.send('error', 400);}
					else if (obj === null){
						res.render('404', { title: 'Page Not Found'});
					}
					else{
						//- Get user nofications //
						AM.getMatchRequests({matchuser: req.session.user.user}, function(e, matchRequests){
							if (e) res.send('error', 400)
							else {
								var matchNotifications = [];
								for (var i = 0; i < matchRequests.length; i++) {
									if (matchRequests[i].seen == false) {
										matchNotifications.push(matchRequests[i])
									}
								}
								AM.getMessageNotifications({receiver: req.session.user.user}, function(e, messageNotifications){
									if (e) res.render('404', { title: 'Page Not Found'})
									else {
										//-Load Profile
										res.render('MyFilms', {
											messageNotifications : messageNotifications,
											matchNotifications : matchNotifications,
											myfilms : obj,
											user 		: o,
											udata 	: req.session.user
										});
									}
								});
							}
						});
					}
				});
			}
		});
	}
});

//- Load film page /////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/film/:edi', function(req, res) {
	if (req.session.user == null){
		//-if user is not logged-in redirect back to login page //
		res.redirect('/');
	}   		//- Load account Page //
	else {
		AM.getFilms({CinemaID : req.session.user.CinemaID}, function(e, films){
			if (e){
				//-if error updating//
				res.send('error', 400);
			}	else if (films){
				//- get edi's of films at user's cinema to check if viewed film is available //
				var filmsedi = [];
				for (var i = 0; i < films.length; i++) {
					filmsedi.push(films[i].edi);
				}
				AM.getSingleFilm({edi : req.params.edi}, function(e, obj){
					if (e){
						//-if error updating//
						res.send('error', 400);
					}	if (obj == null) {
						res.render('404', { title: 'Page Not Found'});
					}
					else{
						//function to get user filmlist //
						AM.getUserFilms({userid : req.session.user._id.toString(), CinemaID: req.session.user.CinemaID}, function(e, userfilms){
							if (e){ res.send('error', 400);}
							else if (userfilms) {
								//- array of user film titles //
								var userfilmsedi = [];
								for (var i = 0; i < userfilms.length; i++) {
									userfilmsedi.push(userfilms[i].edi);
								}
								//- Get user nofications //
								AM.getMatchRequests({matchuser: req.session.user.user}, function(e, matchRequests){
									if (e) res.send('error', 400)
									else {
										var matchNotifications = [];
										for (var i = 0; i < matchRequests.length; i++) {
											if (matchRequests[i].seen == false) {
												matchNotifications.push(matchRequests[i])
											}
										}
										AM.getMessageNotifications({receiver: req.session.user.user}, function(e, messageNotifications){
											if (e) res.render('404', { title: 'Page Not Found'})
											else {
												res.render('view-film', {
													title 		: 'Film',
													messageNotifications : messageNotifications,
													matchNotifications : matchNotifications,
													userfilms : userfilmsedi,
													films			: filmsedi,
													film 			: obj,
													udata 		: req.session.user
												});
											}
										});
									}
								});
							}
						});
					}
				});
			}
		});
	}
});

//-Add film to userfilms /////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/add-film/:edi', function(req, res) {
	if (req.session.user == null){
		//-if user is not logged-in redirect back to login page //
		res.redirect('/');
	}
	//- Check if film exists//
	//- Load account Page //
	else {
		//- Checks if film exists exists at selected cinema//
		AM.checkFilm({
			edi : req.params.edi,
			CinemaID : req.session.user.CinemaID
		}, function(e, o){
			//-if no object returned, user does not exist, throw 404 //
			if (o === null){
				res.render('404', { title: 'Page Not Found'});
			} else{
				AM.addUserFilm({
					userid 		: req.session.user._id,
					user			: req.session.user.user,
					edi 			: o.edi,
					title 		: o.title,
					poster 		: o.poster,
					timestamp	: Math.floor(Date.now() / 1000),
					CinemaID 	: req.session.user.CinemaID
				}, function(e, obj){
					if (e) res.send('error', 400)
					else{
						//- Adds 1 to the film's viewers number //
						AM.alterFilmViewers({
							edi   		: o.edi,
							CinemaID 	: req.session.user.CinemaID,
							viewers 		: '1'
						}, function(e, obj){
							if (e) res.send('error', 400)
							else{
								res.redirect('/' + req.session.user.user + '/');
							}
						});
					}
				});
			}
		});
	}
});

//-Remove film from myfilms /////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/remove-film/:edi', function(req, res) {
	if (req.session.user == null){
		//-if user is not logged-in redirect back to login page //
		res.redirect('/');
	}
	//- Check if film exists//
	//- Load account Page //
	else {
		//- Checks if film exists exists at selected cinema//
		AM.checkFilm({
			edi : req.params.edi,
			CinemaID : req.session.user.CinemaID
		}, function(e, o){
			//-if no object returned, user does not exist, throw 404 //
			if (o === null){
				res.render('404', { title: 'Page Not Found'});
			} else{
				AM.RemoveUserFilm({
					userid 		: req.session.user._id,
					edi 			: o.edi,
					CinemaID 	: req.session.user.CinemaID
				},function(e, obj){
					if (e) res.send('error', 400)
					else if (obj) {
						//- Subtracts 1 from the film's viewers number //
						AM.alterFilmViewers({
							edi   		: o.edi,
							CinemaID 	: req.session.user.CinemaID,
							viewers 		: '-1'
						}, function(e, obj){
							if (e) res.send('error', 400)
							else{
								res.redirect(req.get('referer'));
							}
						});
					}
				});
			}
		});
	}
});

//- Redirect if leaf removed from URL //
app.get(('/:username/MyMessages/', '/:username/MyMessages'), function(req, res) {
	if (req.session.user == null){
		//-if user is not logged-in redirect back to login page //
		res.redirect('/');
	}
	else res.redirect('/' + req.session.user.user + '/MyMessages/all')
});

//-Load MyMessages /////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/:username/MyMessages/:user', function(req, res) {
	//-if user is not logged-in redirect back to login page //
	if (req.session.user == null){
		res.redirect('/');
	}
	//- Redirect if url is changed or own username is input //
	else if(req.session.user.user !== req.params.username || req.params.user == req.session.user.user) {
		res.redirect('/' + req.session.user.user + '/MyMessages/All');
	}
	else {
		//- Checks if user is viewing all messages or messages from one user //
		var user = req.params.user;
		if (req.params.user == 'All') {
			user = req.params.username
		}
		//- Check user exists//
		AM.checkUser({user : user
		}, function(e, o){
			//-if no object returned, user does not exist, throw 404 //
			if (o === null){
				res.redirect('/' + req.session.user.user + '/MyMessages/All');
			} else {
				AM.dismissMessageNotifications({receiver: req.session.user.user, sender: user}, function(e, dis){
					if (e) return;
					else {
						AM.getMatchRequests({matchuser: req.session.user.user}, function(e, matchRequests){
							if (e) res.render('404', { title: 'Page Not Found'})
							else {
								//- Create array of all usernames from match requests //
								var matchUsernames = [];
								var matchNotifications = [];
								for (var i = 0; i < matchRequests.length; i++) {
									if (matchRequests[i].seen == false) {
										matchNotifications.push(matchRequests[i])
									}
									matchUsernames.push(matchRequests[i].receiver)
								}
								//- Get user accounts from list of IDs //
								AM.getUsersByID({users:matchUsernames}, function(e, users){
									if (e) res.render('404', { title: 'Page Not Found'})
									else {
										//- Combine matchRequests and user objects //
										for (var i = 0; i < users.length; i++) {
											for (var x = 0; x < matchRequests.length; x++) {
												if (users[i].user == matchRequests[x].receiver) {
													for(var key in matchRequests[x]) {
														if (matchRequests[x].hasOwnProperty(key)) {
															users[i][key] = matchRequests[x][key];
														}
													}
												}
											}
										}
										//- Create array of accepted matches, new matches & match requests //
										var acceptedRequests = [];
										for (var i = 0; i < users.length; i++) {
											//- If match is seen //
											if (users[i].accepted == true && users[i].seen == true) {
												acceptedRequests.push(users[i])
											}
										}
										var matched = true
										if (matchUsernames.indexOf(o.user)==-1){
											matched = false
										}
										AM.getMessageNotifications({receiver: req.session.user.user}, function(e, messageNotifications){
											if (e) res.render('404', { title: 'Page Not Found'})
											else {
												//- Get message session for the user
												AM.getMessageSessions({user: req.session.user.user}, function(e, messageSessions){
													if (e) res.render('404', { title: 'Page Not Found'})
													else {
														for (var i = 0; i < messageSessions.length; i++) {
															if (messageSessions[i].user1 !== req.session.user.user) {
																messageSessions[i].name = messageSessions[i].user1
															}
															else {
																messageSessions[i].name = messageSessions[i].user2
															}
														}
														//-Load MyMatches //
														res.render('MyMessages', {
															matches				: acceptedRequests,
															matched				: matched,
															messageNotifications : messageNotifications,
															matchNotifications : matchNotifications,
															messageSessions : messageSessions,
															user 					: o,
															udata 				: req.session.user
														});
													}
												});
											}
										});
									}
								});
							}
						});
					}
				});
			}
		});
	}
});

//-Add match request to matches table /////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post('/dismissMatchNotifications', function(req, res) {
	if (req.session.user == null){
		//-if user is not logged-in redirect back to login page //
		res.redirect('/');
	}
	else {
		AM.dismissMatchNotifications({
			matchuser		: req.session.user.user
		}, function(e, obj){
			if (e) res.send('error', 400)
			else{
			}
		});
	}
});

//- Password reset /////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post('/lost-password', function(req, res){
	//-look up the user's account via their email //
	AM.getUserByEmail(req.param('email'), function(o){
		if (o){
			EM.dispatchResetPasswordLink(o, function(e, m){
				//-this callback takes a moment to return //
				if (!e) {
					res.send(o);
				}	else{
					res.send('email-server-error', 400);
					for (k in e) console.log('error : ', k, e[k]);
				}
			});
		}	else{
			res.send('email-not-found', 400);
		}
	});
});

//- Update password /////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post('/reset-password', function(req, res) {
	var nPass = req.param('pass');
	//-retrieve the user's email from the session to lookup their account and reset password //
	var email = req.session.reset.email;
	//-destory the session immediately after retrieving the stored email //
	req.session.destroy();
	AM.updatePassword(email, nPass, function(e, o){
		if (o){
			res.send('ok', 200);
		}	else{
			res.send('unable to update password', 400);
		}
	})
});
//- Throw 404 for unkown URLs //
app.get('*', function(req, res) {
	res.render('404', { title: 'Page Not Found'});
});

};
