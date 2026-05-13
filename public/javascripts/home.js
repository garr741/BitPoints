var validateForm = function(form) {
	var requiredFields = form.find('[data-required=true]');

	form.removeClass('error');

	requiredFields.each(function() {
		var field = $(this),
			val = field.val();
		if($.trim(val).length < 1) {
			field.addClass('error');
			form.addClass('error');
		} else {
			field.removeClass('error');
		}
	});

	return !form.hasClass('error');
};

var page = new BP.Page({

	domEvents: {
		'submit #join': 'joinRoom',
		'submit #create': 'createRoom',
		'click #notifications': 'allowNotifications',
		'focus #title': 'showRoomOptions',
		'click .bp-tab': 'switchTab'
	},

	DOM: {
		name: '#name',
		email: '#email',
		roomId: '#room-id',
		join: '#join',
		title: '#title',
		create: '#create',
		roomOptions: '.roomOptions',
		notifications: '#notifications',
		tabs: '.bp-tab',
		panels: '.bp-tab-panel'
	},

	initialize: function() {
		var userData = BP.localStorage.get('user-data');
		if(userData) {
			this.$name.val(userData.name);
			this.$email.val(userData.email);

			// If room ID is hidden, just join the room
			if(this.$roomId.attr('type') === 'hidden') {
				this.$join.trigger('submit');
			}
		}
		if(!BP.Notification.supported) {
			this.$notifications.closest('label').hide();
		} else {
			if(BP.localStorage.get('useNotifications')) {
				this.$notifications.trigger('click');
			}
		}

		// If a room id is prefilled (e.g. from invite), auto-show the Join tab
		if(this.$roomId.val() && this.$roomId.attr('type') !== 'hidden') {
			this.activateTab('join');
		}
	},

	switchTab: function(e, $el) {
		this.activateTab($el.data('target'));
	},

	activateTab: function(target) {
		this.$tabs.removeClass('is-active').attr('aria-selected', 'false');
		this.$tabs.filter('[data-target="' + target + '"]').addClass('is-active').attr('aria-selected', 'true');
		this.$panels.removeClass('is-active');
		this.$panels.filter('[data-panel="' + target + '"]').addClass('is-active');
	},

	joinRoom: function(e, $el) {
		if(validateForm($el)) {
			BP.localStorage.set('user-data',{
				name: this.$name.val(),
				email: this.$email.val()
			});
			document.location = '/join/' + this.$roomId.val() + '?name=' + this.$name.val() + '&email=' + this.$email.val();
		}
		e.preventDefault();
	},

	createRoom: function(e, $el) {
		if(validateForm($el)) {
			document.location = '/create/?title=' + this.$title.val();
		}
		e.preventDefault();
	},

	showRoomOptions: function() {
		this.$roomOptions.addClass('visible');
	},

	allowNotifications: function(e, $el) {
		var hasPermission = BP.Notification.hasPermission(),
			wantsNotifications = $el.is(':checked');

		BP.localStorage.set('useNotifications',wantsNotifications);

		if(wantsNotifications && !hasPermission) {
			BP.Notification.requestPermission();
		}
	}
});

page.init();
