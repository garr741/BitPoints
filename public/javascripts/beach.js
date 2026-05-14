// /beach — castaway page form handling + small flourishes

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
		var ud = BP.localStorage.get('user-data') || {};
		if (ud.name)  $('#name').val(ud.name);
		if (ud.email) $('#email').val(ud.email);

		$('#create').on('submit', function(e) {
			e.preventDefault();
			var $f = $(this);
			if (!validate($f)) return;
			// Wax-seal press: shrink the button briefly to simulate the press
			var $btn = $f.find('.beach-wax-btn');
			$btn.css({transition: 'transform 180ms ease', transform: 'translate(3px, 3px) rotate(2deg) scale(0.96)'});
			setTimeout(function() {
				document.location = '/create/?title=' + encodeURIComponent($('#title').val());
			}, 320);
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
	});
}());
