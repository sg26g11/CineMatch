
$(document).ready(function(){

	var hc = new accountController();
	var av = new AccountValidator();

	$('#account-form').ajaxForm({
		beforeSubmit : function(formData, jqForm, options){
			if (av.validateForm() == false){
				return false;
			} 	else{
			//-push the disabled username field onto the form data array //
				formData.push({name:'user', value:$('#user-tf').val()})
				return true;
			}
		},
		success	: function(responseText, status, xhr, $form){
			if (status == 'success') hc.onUpdateSuccess();
		},
		error : function(e){
			if (e.responseText == 'email-taken'){
			    av.showInvalidEmail();
			}	else if (e.responseText == 'username-taken'){
			    av.showInvalidUserName();
			}
		}
	});
	$('#name-tf').focus();

	//- Process add film click and access the correct url to add the film //
	$('.add-film').click(function(e){
		//- Show 'remove' and 'added' button, hide 'add' button //
		$('#Remove'+this.value).show();
		$('#Added'+this.value).show();
		$('#Add'+this.value).hide();

		//- Use ajax to add the film //
		$.ajax({
		      url: '/add-film/'+this.value,
		      context: document.body,
		      success: function(){
		      }
		    });
		return false;
	});

	$('.dropdown-toggle').dropdown();

	//- Process add film click and access the correct url to add the film //
	$('.remove-film').click(function(e){
		//- Hide 'remove' and 'added' button, show 'add' button //
		$('#Remove'+this.value).hide();
		$('#Added'+this.value).hide();
		$('#Add'+this.value).show();
		//- Use Ajax to remove the film
		$.ajax({
					url: '/remove-film/'+this.value,
					context: document.body,
					success: function(){
					}
				});
		return false;
	});

	//- Go to myFilms Page on button click //
		$('.film-added').click(function(){ window.location.href = this.value;});
//-customize the account settings form //

	$('#account-form h1').text('Account Settings');
	$('#account-form #sub1').text('Here are the current settings for your account.');
	$('#user-tf').attr('disabled', 'disabled');
	$('#account-form-btn1').html('Cancel');
	$('#account-form-btn2').html('Update');
	$('#account-form-btn2').addClass('btn-primary');
})
