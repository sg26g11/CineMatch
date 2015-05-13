
function AccountValidator(){

//-build array maps of the form inputs & control groups //

	this.formFields = [$('#name-tf'), $('#age-tf'), $('#gender-tf'), $('#preference-tf'), $('#cinema-tf'), $('#email-tf'), $('#user-tf'), $('#pass-tf'), $('#check-tf')];
	this.controlGroups = [$('#name-cg'), $('#age-cg'), $('#gender-cg'), $('#preference-cg'), $('#cinema-cg'), $('#email-cg'), $('#user-cg'), $('#pass-cg'), $('#check-cg')];

//-bind the form-error modal window to this controller to display any errors //

	this.alert = $('.modal-form-errors');
	this.alert.modal({ show : false, keyboard : true, backdrop : true});

	//- Check if name is greater than 3 characters //
	this.validateName = function(s)
	{
		return s.length >= 3;
	}
	//- Check name for special chars //
	this.validateNameChars = function(s)
	{
		return /^[ a-zA-Z]+$/.test(s);
	}

	//- Checks password length //
	this.validatePassword = function(s)
	{
	//-if user is logged in and hasn't changed their password, return ok
		if ($('#userId').val() && s===''){
			return true;
		}	else{
			return s.length >= 6;
		}
	}

	this.validateEmail = function(e)
	{
		var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
		return re.test(e);
	}

	this.showErrors = function(a)
	{
		$('.modal-form-errors .modal-body p').text('Please correct the following problems :');
		var ul = $('.modal-form-errors .modal-body ul');
			ul.empty();
		for (var i=0; i < a.length; i++) ul.append('<li>'+a[i]+'</li>');
		this.alert.modal('show');
	}

}

AccountValidator.prototype.showInvalidEmail = function()
{
	this.controlGroups[5].addClass('error');
	this.showErrors(['That email address is already in use.']);
}

AccountValidator.prototype.showInvalidUserName = function()
{
	this.controlGroups[6].addClass('error');
	this.showErrors(['That username is already in use.']);
}

AccountValidator.prototype.validateForm = function()
{
	var e = [];
	for (var i=0; i < this.controlGroups.length; i++) this.controlGroups[i].removeClass('error');
	//-Check if name has been entered //
	if (this.validateName(this.formFields[0].val()) == false) {
		this.controlGroups[0].addClass('error'); e.push('Please Enter Your Name');
	}
	else if (this.validateNameChars(this.formFields[0].val()) == false) {
		this.controlGroups[0].addClass('error'); e.push('Name must not contain special characters.');
	}
	//-Check Name Length //
	if (this.formFields[0].val().length > 50) {
		this.controlGroups[0].addClass('error'); e.push('Name Character Limit set at 50.');
	}
	if (this.formFields[1].val() == 'Please Select..') {
		this.controlGroups[1].addClass('error'); e.push('Please Select Your Age');
	}
	if (this.formFields[2].val() == 'Please Select..') {
		this.controlGroups[2].addClass('error'); e.push('Please Select Your Gender');
	}
	if (this.formFields[3].val() == 'Please Select..') {
		this.controlGroups[3].addClass('error'); e.push('Please Select Your Preference');
	}
	if (this.formFields[4].val() == 'Please Select..') {
		this.controlGroups[4].addClass('error'); e.push('Please Select Your Local Cinema');
	}
	if (this.formFields[8].val() == null) {
		if (this.validateEmail(this.formFields[5].val()) == false) {
			this.controlGroups[5].addClass('error'); e.push('Please Enter A Valid Email');
		}
		if (this.validateName(this.formFields[6].val()) == false) {
			this.controlGroups[6].addClass('error');
			e.push('Please Choose A Username');
		}
		if (this.validatePassword(this.formFields[7].val()) == false) {
			this.controlGroups[7].addClass('error');
			e.push('Password Should Be At Least 6 Characters');
		}
	}
	if (e.length) this.showErrors(e);
	return e.length === 0;
}
