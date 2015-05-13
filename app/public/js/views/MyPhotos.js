
$(document).ready(function(){

	//- Edit Photos button click function //
	$('#editShow').click(function(e){
		//- Show and hide appropriate buttons //
		$('.remove').show();
		$('.profilePhoto').show();
		$('#editHide').show();
		$('#editShow').hide();
	});

	//- Cancel edit photos button cicked function //
	$('#editHide').click(function(e){
		//- Show and hide appropriate buttons //
		$('.remove').hide();
		$('.profilePhoto').hide();
		$('#editHide').hide();
		$('#editShow').show();
	});

	$('a popup img').click(function () {
		var $img = $(this);
		$('.modal-alert').modal({ show : false, keyboard : true, backdrop : true });
		$('.modal-alert').html($img.clone().height(490).width(480)).fadeIn();
		$('.modal-alert').modal('show');
	});
})
