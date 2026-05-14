// /trial — motel page form wiring + small interactive flourishes

(function() {
	function validate(form) {
		var ok = true;
		form.find('[data-required=true]').each(function() {
			var $f = $(this);
			if (!$.trim($f.val()).length) {
				$f.addClass('error');
				ok = false;
			} else {
				$f.removeClass('error');
			}
		});
		return ok;
	}

	$(function() {
		// Restore name/email if we have them
		var ud = BP.localStorage.get('user-data') || {};
		if (ud.name)  $('#name').val(ud.name);
		if (ud.email) $('#email').val(ud.email);

		$('#create').on('submit', function(e) {
			e.preventDefault();
			var $f = $(this);
			if (!validate($f)) return;
			// Quick "ding" — shake the bell, then go
			var $bell = $f.find('.trial-bell-icon');
			$bell.css('transition', 'transform 0.4s ease');
			$bell.css('transform', 'rotate(-22deg) scale(1.2)');
			setTimeout(function() {
				$bell.css('transform', 'rotate(18deg) scale(1.1)');
			}, 200);
			setTimeout(function() {
				document.location = '/create/?title=' + encodeURIComponent($('#title').val());
			}, 440);
		});

		$('#join').on('submit', function(e) {
			e.preventDefault();
			var $f = $(this);
			if (!validate($f)) return;
			BP.localStorage.set('user-data', {
				name: $('#name').val(),
				email: $('#email').val()
			});
			document.location = '/join/' + encodeURIComponent($('#room-id').val()) +
				'?name=' + encodeURIComponent($('#name').val()) +
				'&email=' + encodeURIComponent($('#email').val());
		});

		// Occasionally flicker a random sign bulb out for a beat (motel-sign chaos)
		var $bulbs = $('.trial-bulb');
		if ($bulbs.length) {
			setInterval(function() {
				var $b = $bulbs.eq(Math.floor(Math.random() * $bulbs.length));
				var orig = $b.css('opacity');
				$b.css({opacity: 0.15, transition: 'opacity 120ms'});
				setTimeout(function() {
					$b.css({opacity: '', transition: ''});
				}, 480 + Math.random() * 600);
			}, 1700);
		}
	});
}());
