
$(document).ready(function(){

	var lv = new LoginValidator();
	var lc = new LoginController();

//-main login form //

	$('#login-form').ajaxForm({
		beforeSubmit : function(formData, jqForm, options){
			if (lv.validateForm() == false){
				return false;
			} 	else{
			//-append 'remember-me' option to formData to write local cookie //
				formData.push({name:'remember-me', value:$("input:checkbox:checked").length == 1})
				return true;
			}
		},
		success	: function(responseText, status, xhr, $form){
			if (status == 'success') window.location.href = '/home';
		},
		error : function(e){
            lv.showLoginError('Login Failure', 'Please check your username and/or password');
		}
	});
	$('#user-tf').focus();

//-login retrieval form via email //

	var ev = new EmailValidator();

	$('#get-credentials-form').ajaxForm({
		type: 'POST',
		url: '/lost-password',
		success	: function(responseText){
			ev.showEmailAlert('');
			ev.showEmailSuccess("Success! Instructions on how to reset your password have been sent to your email address.");
		},
		error : function(){
			ev.showEmailAlert("Error: No account is linked with this email address. Please try again.");
		}
	});

})
