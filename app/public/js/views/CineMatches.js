
$(document).ready(function(){

	var pc = new profileController();
	var hc = new accountController();

	//- Process send request button click //
	$('.matchRequestButton').click(function(e){
		//- Show 'remove' and 'added' button, hide 'add' button //
		$('#requestSent'+this.value).show();
		$('#matchRequest'+this.value).hide();

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
	$('.AcceptRequest').click(function(e){
		//- Show 'remove' and 'added' button, hide 'add' button //
		$('#matched'+this.value).show();
		$('#requestReceived'+this.value).hide();

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
})
