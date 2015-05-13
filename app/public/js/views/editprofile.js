
$(document).ready(function(){
	//-customize the edit profile form //
	$('#account-form h1').text('Update Your Profile');
	$('#account-form #sub1').text('To let others know more about you, please consider updating your profile:');
	$('#account-form #sub2').text('Account Details:');
	$('#account-form-btn1').html('Cancel');
	$('#account-form-btn2').addClass('btn-primary');
	$('#account-form-btn1').click(function(){ window.location.href = '/';});
})
