
$(document).ready(function(){

	var hc = new accountController();
	var pc = new profileController();


	//- Process add film click and access the correct url to add the film //
	$('#matchRequestButton').click(function(e){
		//- Show 'remove' and 'added' button, hide 'add' button //
		$('#requestSent').show();
		$('#matchRequest').hide();

		//- Use ajax to add the film //
		$.ajax({
					method: 'POST',
					url: '/add-match-request/'+this.value,
					context: document.body,
					success: function(){
					}
				});
		return false;
	});

	//- Process add film click and access the correct url to add the film //
	$('#AcceptRequest').click(function(e){
		//- Show 'remove' and 'added' button, hide 'add' button //
		$('#matched').show();
		$('#requestReceived').hide();

		//- Use ajax to add the film //
		$.ajax({
					method: 'POST',
					url: '/add-match-request/'+this.value,
					context: document.body,
					success: function(){
					}
				});
		return false;
	});

	//- Process decline request click //
	$('.DeclineRequest').click(function(e){
		//- Show appropriate options //
		$('.declined').show();
		$('#requestReceived').hide();

		//- Use ajax to decline the request //
		$.ajax({
					method: 'POST',
					url: '/decline-match-request/'+this.value,
					context: document.body,
					success: function(){
					}
				});
		return false;
	});

	$('a popup img').click(function () {
		var $img = $(this);
		$('.modal-alert').modal({ show : false, keyboard : true, backdrop : true });
		$('.modal-alert').html($img.clone().height(490).width(480)).fadeIn();
		$('.modal-alert').modal('show');
	});
})
