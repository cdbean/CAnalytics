$.get(CASES_URL, function(res) {
	var cases_user = res.cases_user;
	var cases_other = res.cases_other;

	var placeholder = '<div class="col-sm-12"><h3><small>No case available</small</h3></div>';
	var template = '<div class="col-sm-6 col-md-3 case">';
	template += '<div class="thumbnail">';
	template += '<h4 class="caption"></h4>';
	template += '<p class="desc"></p>';
	template += '<a href="#" class="btn btn-primary btn-block enter" role="button" data-toggle="modal">Enter</a>'
	template += '</div></div>';

	if (cases_user.length === 0) {
		// if no cases available
		$(placeholder).appendTo('#user_cases');
		// var html = $(template).appendTo('#user_cases');
		// html.find('h4.caption').text('No cases available').css('color', '#eee');
		// html.find('a.enter').addClass('hidden');

	} else {
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
		$(placeholder).appendTo('#other_cases');

		// var html = $(template).appendTo('#other_cases');
		// html.find('h4.caption').text('No cases available').css('color', '#eee');
		// html.find('a.enter').addClass('hidden');
	} else {
		cases_other.forEach(function(d) {
			var case_html = $(template).appendTo('#other_cases');
			case_html.find('h4.caption').text(d.name);
			case_html.find('p.desc').text(d.description);
			case_html.find('.enter').attr('data-target', '#other_case_diag');
			case_html.data('case', d);
		});
	}
});

$('#user_case_diag').on('show.bs.modal', function(event) {
	var source = $(event.relatedTarget).parents('.case');
	var case_d = source.data('case');
	if (!case_d) return;
	$(this).find('.modal-title #case_name').text(case_d.name);


	var options = '';
	case_d.groups.forEach(function(g) {
		options += '<option value="' + g.id + '"">' + g.name + '</option>';
	})
	$(this).find('#group_selector').empty().append(options);
	$(this).data('case', case_d);
});