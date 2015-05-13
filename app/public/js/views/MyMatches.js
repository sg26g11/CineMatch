
$(document).ready(function(){

	var pc = new profileController();
	var hc = new accountController();

	//- Process accept request button click //
	$('.AcceptRequest').click(function(e){
		//- Show appropriate options //
		$('#matched'+this.value).show();
		$('#requestReceived'+this.value).hide();

		//- Use ajax to add the request //
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
			$('#declined'+this.value).show();
			$('#requestReceived'+this.value).hide();

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
})
