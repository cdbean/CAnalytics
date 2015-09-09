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
	for (var i = 0; i < case_d.groups.length; i++) {
		options += '<option value="' + case_d.groups[i].id + '">' + case_d.groups[i].name + '</option>';
	}
	options += '<option value="0">Create new group</option>';
	$(this).find('#group_selector').empty().append(options).selectpicker('refresh');
	$(this).data('case', case_d);
});

$('.modal').on('submit', 'form', function(event) {
	var el = event.delegateTarget;
	var case_d = $(el).data('case');
	$(this).find('#case').val(case_d.id);
});

$('#user_case_diag #group_selector').change(function(e) {
	if ($(this).val() == 0) {
		$('#user_case_diag #group_name_group').removeClass('hidden');
		$('#user_case_diag #group_pin_group').removeClass('hidden');
	} else {
		$('#user_case_diag #group_name_group').addClass('hidden');
		$('#user_case_diag #group_pin_group').addClass('hidden');
	}
});

$('#other_case_diag #group_selector').change(function(e) {
	if ($(this).val() == 0) {
		$('#other_case_diag #group_name_group').removeClass('hidden');
		$('#other_case_diag #group_pin_help').text('Invite group members to this case using this PIN.');
	} else {
		$('#other_case_diag #group_name_group').addClass('hidden');
		$('#other_case_diag #group_pin_help').text('You need the PIN to join this group. Ask group creator if you do not know it.');
	}
});

