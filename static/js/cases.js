$.get(CASES_URL, function(res) {
	var cases_user = res.cases_user;
	var cases_other = res.cases_other;

	var template = '<div class="col-sm-6 col-md-3 case">';
	template += '<div class="thumbnail">';
	template += '<h4 class="caption"></h4>';
	template += '<p class="desc"></p>';
	template += '<a href="#" class="btn btn-primary btn-block enter" role="button" data-toggle="modal">Enter</a>'
	template += '</div></div>';

	if (cases_user.length === 0) {
		// if no cases available
		$('#user_cases .placeholder').find('small').text('No case available');
	} else {
		$('#user_cases .placeholder').addClass('hidden');
		cases_user.forEach(function(d) {
			var case_html = $(template).appendTo('#user_cases');
			case_html.find('h4.caption').text(d.name);
			case_html.find('p.desc').text(d.description);
			case_html.find('.enter').attr('data-target', '#user_case_diag');
			case_html.data('case', d);
		});
	}
	if (cases_other.length === 0) {
		// if no cases available
		$('#other_cases .placeholder').find('small').text('No case available');
	} else {
		$('#other_cases .placeholder').addClass('hidden');
		cases_other.forEach(function(d) {
			var case_html = $(template).appendTo('#other_cases');
			case_html.find('h4.caption').text(d.name);
			case_html.find('p.desc').text(d.description);
			case_html.find('.enter').attr('data-target', '#other_case_diag');
			case_html.data('case', d);
		});
	}
});

$('.modal').on('show.bs.modal', function(event) {
	var source = $(event.relatedTarget).parents('.case');
	var case_d = source.data('case');
	if (!case_d) return;
	$(this).find('.modal-title #case_name').text(case_d.name);


	var options = '<option>Select a group</option>';
	options += '<optgroup label="Your groups">';
	for (var i = 0; i < case_d.usergroups.length; i++) {
		options += '<option class="usergroup" value="' + case_d.usergroups[i].id + '">' + case_d.usergroups[i].name + '</option>';
	}
	options += '</optgroup>';
	options += '<optgroup label="Other groups">';
	for (var i = 0; i < case_d.othergroups.length; i++) {
		options += '<option class="othergroup" value="' + case_d.othergroups[i].id + '">' + case_d.othergroups[i].name + '</option>';
	}
	options += '</optgroup>';
	options += '<option value="0">Create new group</option>';
	$(this).find('#group_selector').empty().append(options).selectpicker('refresh');
	// put case id in input
	$(this).data('case', case_d);
	$(this).find('#case').val(case_d.id);
	// change the placeholder of remote validation url
	var gname = $(this).find('#group_name');
	var remote = gname.data('remote');
	remote = remote.replace('0', case_d.id);
	gname.data('remote', remote);
});


$('#user_case_diag #group_selector').change(function(e) {
	if ($(this).val() == 0) {
		$('#user_case_diag #group_name_group').removeClass('hidden').find('input').prop('required', true);
		$('#user_case_diag #group_pin_group').removeClass('hidden').find('input').prop('required', true);
		$('#user_case_diag #group_pin_help').text('Invite group members to this case using this PIN.');
	} else if ($(this).find('option:selected').hasClass('othergroup')) {
		$('#user_case_diag #group_name_group').addClass('hidden').find('input').prop('required', false);
		$('#user_case_diag #group_pin_group').removeClass('hidden').find('input').prop('required', true);
		$('#user_case_diag #group_pin_help').text('You need the PIN to join this group. Ask group creator if you do not know it.');
	} else {
		$('#user_case_diag #group_name_group').addClass('hidden').find('input').prop('required', false);
		$('#user_case_diag #group_pin_group').addClass('hidden').find('input').prop('required', false);
	}
});

$('#other_case_diag #group_selector').change(function(e) {
	if ($(this).val() == 0) {
		$('#other_case_diag #group_name_group').removeClass('hidden').find('input').prop('required', true);
		$('#other_case_diag #group_pin_help').text('Invite group members to this case using this PIN.');
	} else {
		$('#other_case_diag #group_name_group').addClass('hidden').find('input').prop('required', false);
		$('#other_case_diag #group_pin_help').text('You need the PIN to join this group. Ask group creator if you do not know it.');
	}
});

$('form').validator({
	custom: {
		unique: function($el) {
			var key = $el.attr('name');
			var val = $el.val().trim();
			var remote = $el.data('unique');
			var req = {case: this.$element.find('#case').val()};
			req[key] = val;
			var p = Promise.resolve(
				$.get(remote, req, function() {

				})
			).then(function(res) {
				if (res === 'validate') return true;
				return false;
			});
			return p;
		},
	},
	errors: {
		unique: 'The name has been taken. Try giving another one'
	}
})

