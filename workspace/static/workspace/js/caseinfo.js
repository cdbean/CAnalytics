$.widget('viz.vizcaseinfo', $.viz.vizbase, {
  options: {
  },

  _create: function() {
    this._super('_create');
    this.element.addClass('caseinfo');
    this.options.extend.help = this.help;
    this.dateformat = d3.time.format('%b %d, %Y');

    this._setupUI();
  },

  _setupUI: function() {
  	var cinfo = wb.info.case;
  	var el = $('<div class="container"></div>').appendTo(this.element);
  	var casehtml = ' \
  		<div class="row"> \
  			<div class="col-sm-12"> \
		  		<h4 id="case-title">Case: <span id="case-title-body"></span></h4> \
		  	</div> \
		</div> \
		<div class="row"> \
			<div class="col-sm-2"><label id="desc-label">Description:</label></div> \
			<div class="col-sm-10"><span id="desc-body"></span></div> \
		</div> \
		<div class="row"> \
			<div class="col-sm-2"><label id="loc-label">Location:</label></div> \
			<div class="col-sm-10"><span id="loc-body"></span></div> \
		</div> \
		<div class="row"> \
			<div class="col-sm-2"><label id="start-label">Start date:</label></div> \
			<div class="col-sm-10"><span id="start-body"></span></div> \
		</div> \
		<div class="row"> \
			<div class="col-sm-2"><label id="end-label">End date:</label></div> \
			<div class="col-sm-10"><span id="end-body"></span></div> \
		</div> \
		<div class="row"> \
			<div class="col-sm-2"><label id="pin-label">PIN:</label></div> \
			<div class="col-sm-10"><span id="pin-body"></span></div> \
		</div> \
  	';
  	$(casehtml).appendTo(el)
  		.find('#case-title-body').text(cinfo.name).end()
  		.find('#desc-body').html(cinfo.description || 'No description').end()
  		.find('#loc-body').text(cinfo.address || 'Unknown').end()
  		.find('#start-body').text(this._dateformat(cinfo.start_date) || 'Unknown').end()
  		.find('#end-body').text(this._dateformat(cinfo.end_date) || 'Unknown').end()
  		.find('#pin-body').text(cinfo.pin);
  	var ginfo = wb.info.group;
  	var grouphtml = ' \
  		<div class="row"> \
  			<div class="col-sm-12"> \
		  		<h4 id="group-title">Current group: <span id="group-title-body"></span></h4> \
		  	</div> \
		</div> \
		<div class="row"> \
			<div class="col-sm-2"><label id="gpin-label">PIN:</label></div> \
			<div class="col-sm-10"><span id="gpin-body"></span></div> \
		</div> \
		<div class="row"> \
			<div class="col-sm-2"><label id="members-label">Members:</label></div> \
			<div class="col-sm-10"><span id="members-body"></span></div> \
		</div> \
  	';
  	$(grouphtml).appendTo(el)
  		.find('#group-title-body').text(ginfo.name).end()
  		.find('#gpin-body').text(ginfo.pin).end()
  		.find('#members-body').html(function() {
  			return d3.values(wb.info.users).map(function(d) {
  				return '<a class="member" style="color:' + d.color + '" href="#">' + d.name + '</a>';
  			});
  		});
  	var othergroups = wb.info.othergroups;
  	var otherghtml = '\
  		<div class="row"> \
  			<div class="col-sm-12"> \
		  		<h5>Switch to other groups</h5> \
		  	</div> \
		</div> \
		<div class="row"> \
			<div class="col-sm-12"> \
				<span id="othergroups"></span> \
			</div> \
		</div> \
  	';
  	$(otherghtml).appendTo(el)
  		.find('#othergroups').html(function() {
  			return othergroups.map(function(d) {
  				var url = GLOBAL_URL.case_page.replace('9999', CASE).replace('0', d.id);
  				return '<a class="group" href="' + url +'">' + d.name + '</a>';
  			});
  		});
  },

  _dateformat: function(d) {
  	try {
  		return this.dateformat(d);
  	} catch (e) {
  		return '';
  	}
  },

  reload: function() {

  },

  updateData: function() {

  },
  updateView: function() {

  },

  update: function() {
  },

  help: function() {
  }
});
