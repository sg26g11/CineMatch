var AM = require('./account-manager');
var http = require('http');
exports.parseCinemas = function (XMLData) {

	var StartTime = Math.floor(Date.now() / 1000)

	//- Define URL of cineworld XML file //
	XmlURL = "http://www.cineworld.co.uk/syndication/all-performances.xml";

	//- Start http request for the xml file //
	http.get(XmlURL, function(res) {
		var xml ='';
		res.on('data', function (chunk) {
			//- Apppend chunk onto xml variable //
			xml += chunk;
		});
		res.on('end', function() {
			//- On success call load xml function //
			loadXMLDoc(xml);
      });
	}).on('error', function(e) {
		console.log("Got error: " + e.message);
	});

		//- Load and save XML data to database //
		function loadXMLDoc(xml) {
			var fs = require('fs');
			var xml2js = require('xml2js');
			var json;
			try {
				var parser = new xml2js.Parser();
				parser.parseString(xml, function (err, result) {

					//- Creates an array of cinema javascript objects//
					var cinemas = result.cinemas.cinema;

					//- Loop through javascript objects, adding to database
					for (var i = 0; i < cinemas.length; i++) {
						AM.addCinema ({
							CinemaID	: cinemas[i]['$']['id'],
							name 			: cinemas[i]['$']['name'],
							phone 		: cinemas[i]['$']['phone'],
							address	 	: cinemas[i]['$']['address'],
							postcode 	: cinemas[i]['$']['postcode'],
							root 			: cinemas[i]['$']['root'],
							url				: cinemas[i]['$']['url']
						}, function(e, o){
							if (e){
								//-if error updating//
								console.log(e)
							}
						});
						//-Creates film array relating to the cinema in the current loop //
						var dupCheck = [];
						var films = cinemas[i]['films'][0]['film'];
						//- Add each film from the list to the database //
						for (var x = 0; x < films.length; x++) {
							//- If film is not already in list //
							if (dupCheck.indexOf(films[x]['$']['title']+cinemas[i]['$']['id'])==-1) {
							//- Add film to duplicate check //
							dupCheck.push(films[x]['$']['title']+cinemas[i]['$']['id']);
							AM.addFilm({
								title			:  films[x]['$']['title'],
								rating		:  films[x]['$']['rating'],
								release		:  films[x]['$']['release'],
								length		:  films[x]['$']['length'],
								poster		:  films[x]['$']['poster'],
								director	:  films[x]['$']['director'],
								synopsis	:  films[x]['$']['synopsis'],
								edi				:  films[x]['$']['edi'],
								cast			:  films[x]['$']['cast'],
								CinemaID	:	 cinemas[i]['$']['id'],
								timestamp	:  Math.floor(Date.now() / 1000),
								viewers		:  0
							}, function(e, o){
								if (e){
									//-if error updating//
									console.log(e)
								}
							});
						}
						}
					}
				});
				//-
				var EndTime = Math.floor(Date.now() / 1000)
				var ElapsedTime = EndTime-StartTime;
				console.log("XML data at "+XmlURL+" was read and updated with no errors.");
				console.log('Completion Time: ' + ElapsedTime + 'seconds.\n\n')
			} catch (ex) {console.log(ex)}
		}

};
