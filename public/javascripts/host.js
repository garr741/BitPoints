var decks = {
	'standard': [
		{ value: NaN, estimate: '?' },
		{ value: 0, estimate: '0' },
		{ value: 0.5, estimate: '&frac12;' },
		{ value: 1, estimate: '1' },
		{ value: 2, estimate: '2' },
		{ value: 3, estimate: '3' },
		{ value: 5, estimate: '5' },
		{ value: 8, estimate: '8' },
		{ value: 13, estimate: '13' },
		{ value: 20, estimate: '20' },
		{ value: 40, estimate: '40' },
		{ value: 100, estimate: '100' },
		{ value: Infinity, estimate: '&infin;' },
		{ value: NaN, estimate: '<i class="fa fa-coffee"></i>' },
		{ value: NaN, estimate: 'ಠ_ಠ'}
	],
	'fibonacci': [
		{ value: NaN, estimate: '?' },
		{ value: 0, estimate: '0' },
		{ value: 1, estimate: '1' },
		{ value: 2, estimate: '2' },
		{ value: 3, estimate: '3' },
		{ value: 5, estimate: '5' },
		{ value: 8, estimate: '8' },
		{ value: 13, estimate: '13' },
		{ value: 21, estimate: '21' },
		{ value: 34, estimate: '34' },
		{ value: 55, estimate: '55' },
		{ value: 89, estimate: '89' },
		{ value: Infinity, estimate: '&infin;' },
		{ value: NaN, estimate: '<i class="fa fa-coffee"></i>' },
		{ value: NaN, estimate: 'ಠ_ಠ'}
	],
	'letters': [
		{ value: 0, estimate: 'A' },
		{ value: 1, estimate: 'B' },
		{ value: 2, estimate: 'C' },
		{ value: 3, estimate: 'D' },
		{ value: 4, estimate: 'E' },
		{ value: 5, estimate: 'F' },
		{ value: NaN, estimate: '?' },
		{ value: NaN, estimate: '<i class="fa fa-coffee"></i>' }
	],
	'tshirt': [
		{ value: 0, estimate: 'XS' },
		{ value: 1, estimate: 'S' },
		{ value: 2, estimate: 'M' },
		{ value: 3, estimate: 'L' },
		{ value: 4, estimate: 'XL' },
		{ value: NaN, estimate: '?' },
		{ value: Infinity, estimate: '&infin;' },
		{ value: NaN, estimate: '<i class="fa fa-coffee"></i>' }
	]
};

var deckLabels = {
	'standard':  'Standard',
	'fibonacci': 'Fibonacci',
	'letters':   'Letters',
	'tshirt':    'T-Shirt'
};

var socket = io.connect(window.location.protocol + '//' + window.location.host);
var roomId = BP.room.roomId;
var title = BP.room.title;
var votes = {};
var voters = {};
var voteData = {};
var voting = false;

// 0 - start, 1 - betting open, 2 - reveal
var roundStatus = 0;

var userTemp =  '<li data-name="{{name}}" data-uid="{{uid}}">'+
				'<div title="Don\'t count this voter\'s estimates" class="ಠ_ಠ"><i class="fa fa-eye"></i></div>'+
				'<div title="Remove this voter from room" class="kickVoter">&times;</div>'+
				'<img class="voterImage" src="{{avatar}}" />'+
				'<h3 class="voterName">{{name}}</h3>'+
				'<div class="bp-vote-display">'+
					'<span class="bp-scramble">0</span>'+
					'<span class="bp-vote-final"></span>'+
				'</div>'+
			'</li>';

var ticketTemp = '<a href="{{url}}" class="key" target="_blank">{{key}}</a>: <span class="title">{{title}}</span>';

var getDeck = function() {
	return decks[$('input[name=deckType]:checked').val() || 'fibonacci'];
};

var getDeckKey = function() {
	return $('input[name=deckType]:checked').val() || 'fibonacci';
};

var autoRevealEnabled = function() {
	return $('#autoReveal').is(':checked');
};

var getNearestCard = function(average, deck) {
	var compareArr = [];
	BP.each(deck, function(card) {
		if(!isNaN(card.value)) {
			compareArr.push(card);
		}
	});

	var curr = compareArr[0];
	var diff = Math.abs(average - curr.value);
	BP.each(compareArr, function(compareVal) {
		var newdiff = Math.abs(average - compareVal.value);
		if (newdiff < diff) {
			diff = newdiff;
			curr = compareVal;
		}
	});

	return curr;
};

var getNumVotes = function() {
	var count = 0;
	BP.each(votes, function() { count++; });
	return count;
};

var getInviteUrl = function() {
	return window.location.protocol + '//' + (BP.appHost || window.location.host) + '/' + BP.inviteId;
};

var processVotes = function() {
	voteData = {
		votes: votes,
		average: -1,
		trueAverage: -1,
		min: -1,
		max: -1,
		allVotesEqual: true,
		lastVote: -1,
		total: 0,
		numVotes: 0,
		spread: 0,
		distribution: []
	};

	var deck = getDeck();
	var minCardIdx = 0, maxCardIdx = 0;
	var bucket = {};

	BP.each(votes, function(vote) {
		if(!isNaN(vote)) {
			voteData.total += vote;
			if(voteData.lastVote === -1){
				voteData.lastVote = vote;
				voteData.min = vote;
				voteData.max = vote;
			}
			if(voteData.lastVote !== vote){ voteData.allVotesEqual = false; }
			if(voteData.max < vote){ voteData.max = vote; }
			if(voteData.min > vote){ voteData.min = vote; }
			voteData.numVotes++;
			bucket[vote] = (bucket[vote] || 0) + 1;
		}
	});

	BP.each(deck, function(card, i) {
		if(card.value === voteData.min) { minCardIdx = i; }
		if(card.value === voteData.max) { maxCardIdx = i; }
	});

	voteData.spread = maxCardIdx - minCardIdx;
	voteData.average = voteData.numVotes === 0 ? 0 : voteData.total / voteData.numVotes;
	voteData.nearestCard = getNearestCard(voteData.average, deck);

	if (voteData.average > 0.5) {
		voteData.trueAverage = voteData.average;
		voteData.average = Math.round(voteData.average);
	}

	// Distribution — one entry per numeric card in deck, ordered as deck is
	BP.each(deck, function(card) {
		if(!isNaN(card.value) && card.value !== Infinity) {
			voteData.distribution.push({
				estimate: card.estimate,
				value: card.value,
				count: bucket[card.value] || 0
			});
		}
	});
};

var page = new BP.Page({

	socket: socket,

	domRoot: 'body',

	socketEvents: {
		'newVoter': 'addVoter',
		'voterLeave': 'removeVoter',
		'updateTicket': 'updateTicket',
		'newVote': 'acceptVote'
	},

	domEvents: {
		'change input[name=deckType]':  'updateDeckSelection',
		'click .ಠ_ಠ':                   'ಠ_ಠ',
		'click .kickVoter':              'kickVoter',
		'click #toggleRound':            'toggleRound',
		'click .bp-deck-trigger':        'toggleDeckMenu',
		'click .bp-share-copy':          'copyInviteLink',
		'click .bp-share-cta-copy':      'copyInviteLink'
	},

	DOM: {
		users:          '#users',
		ticket:         '#ticket',
		recommendation: '#recommendation',
		recValue:       '.bp-rec-value',
		recLabel:       '.bp-rec-label',
		recSubtext:     '.bp-rec-subtext',
		progress:       '.bp-progress',
		progressNow:    '.bp-progress-now',
		progressTot:    '.bp-progress-total',
		progressFill:   '.bp-progress-fill',
		distribution:   '#distribution',
		resultsRow:     '.bp-results-row',
		resultsStats:   '.bp-results-stats',
		shareCta:       '.bp-share-cta',
		deckValue:      '.bp-deck-value',
		deckMenu:       '.bp-deck-menu',
		deckTrigger:    '.bp-deck-trigger'
	},

	initialize: function() {
		socket.emit('createRoom', {roomId: roomId, title: title});
		this.scrambles = {};

		$(document).on('click.bp-deck', this.handleDocumentClick.bind(this));

		this.updateProgress();
		this.updateShareCtaVisibility();
	},

	// ── Scramble (pending-vote gibberish cycle) ──────────────────
	startScramble: function(uid) {
		var self = this;
		this.stopScramble(uid);
		var $disp = self.$('li[data-uid="'+uid+'"] .bp-vote-display');
		$disp.addClass('is-active');
		this.scrambles[uid] = setInterval(function() {
			var $el = self.$('li[data-uid="'+uid+'"] .bp-scramble');
			if ($el.length === 0) {
				self.stopScramble(uid);
				return;
			}
			$el.text(Math.floor(Math.random() * 100));
		}, 70);
	},

	stopScramble: function(uid) {
		if (this.scrambles[uid]) {
			clearInterval(this.scrambles[uid]);
			delete this.scrambles[uid];
		}
		this.$('li[data-uid="'+uid+'"] .bp-vote-display').removeClass('is-active');
	},

	// ── Share / Copy / QR ────────────────────────────────────────
	copyInviteLink: function(e, $el) {
		e.preventDefault();
		var url = getInviteUrl();

		var done = function(ok) {
			var $btn = $el;
			var orig = $btn.html();
			$btn.addClass(ok ? 'is-copied' : 'is-failed');
			if ($btn.hasClass('bp-share-cta-copy')) {
				$btn.text(ok ? 'Copied ✓' : 'Copy failed');
			} else {
				$btn.find('i').attr('class', ok ? 'fa fa-check' : 'fa fa-times');
			}
			setTimeout(function() {
				$btn.removeClass('is-copied is-failed');
				if ($btn.hasClass('bp-share-cta-copy')) {
					$btn.text('Copy link');
				} else {
					$btn.html(orig);
				}
			}, 1600);
		};

		if (navigator.clipboard && navigator.clipboard.writeText) {
			navigator.clipboard.writeText(url).then(function() { done(true); }, function() { done(false); });
		} else {
			// Fallback: select an off-screen input
			var $tmp = $('<input type="text">').val(url).css({position:'fixed', top:'-100px'}).appendTo('body');
			$tmp.select();
			try { done(document.execCommand('copy')); } catch (err) { done(false); }
			$tmp.remove();
		}
	},

	// ── Deck switcher ────────────────────────────────────────────
	toggleDeckMenu: function(e, $el) {
		e.preventDefault();
		e.stopPropagation();
		var isOpen = this.$deckMenu.hasClass('is-open');
		this.$deckMenu.toggleClass('is-open');
		$el.attr('aria-expanded', !isOpen);
	},

	handleDocumentClick: function(e) {
		if (!$(e.target).closest('.bp-deck-switch').length) {
			this.$deckMenu.removeClass('is-open');
			this.$deckTrigger.attr('aria-expanded', 'false');
		}
	},

	updateDeckSelection: function() {
		this.$deckValue.text(deckLabels[getDeckKey()]);
		this.$deckMenu.removeClass('is-open');
		this.$deckTrigger.attr('aria-expanded', 'false');
		socket.emit('deckChange', getDeck());
	},

	// ── Voter / room flow ────────────────────────────────────────
	addVoter: function(data) {
		voters[data.uid] = data;
		data.name = $('<span></span>').html(data.name).text();
		var html = BP.template(userTemp, data);
		$(html).appendTo(this.$users);
		// Only scramble if a round is currently open; otherwise display is idle/empty
		if (voting) {
			this.startScramble(data.uid);
		}
		this.updateDeckSelection();
		this.updateProgress();
		this.updateShareCtaVisibility();
		socket.emit('updateVoters', {roomId: roomId, voters: voters});

		if (voting) {
			socket.emit('newRound', {roomId: roomId, ticket: BP.currentTicket});
		} else {
			socket.emit('roundEnd', {roomId: roomId});
		}
	},

	removeVoter: function(data) {
		this.stopScramble(data.uid);
		delete votes[data.uid];
		delete voters[data.uid];
		this.$('li[data-uid="' + data.uid + '"]').remove();
		this.updateProgress();
		this.updateShareCtaVisibility();
		socket.emit('updateVoters', {roomId: roomId, voters: voters});
	},

	updateTicket: function(data) {
		BP.currentTicket = data;
		this.$ticket.html(BP.template(ticketTemp, data));
	},

	acceptVote: function(data) {
		if(roundStatus !== 1) return;

		var $voter = this.$('li[data-uid="'+data.uid+'"]'),
			$disp = $voter.find('.bp-vote-display'),
			$final = $disp.find('.bp-vote-final');

		this.stopScramble(data.uid);
		$disp.data('finalHTML', data.cardValue);
		$final.html('<i class="fa fa-check"></i>');
		$disp.removeClass('is-revealed bp-celebrate').addClass('is-voted');

		if(!$voter.data('observer'))
			votes[data.uid] = data.value;

		var nonObservers = this.$users.find('li:not([data-observer=true])').length;
		var numVotes = getNumVotes();

		this.updateProgress();

		// Auto-reveal when everyone's voted
		if(autoRevealEnabled() && numVotes > 0 && numVotes === nonObservers) {
			setTimeout(function() {
				if(roundStatus === 1) {
					$('#toggleRound').trigger('click');
				}
			}, 350);
		}
	},

	// ── Progress, distribution, share-CTA visibility ─────────────
	updateProgress: function() {
		var nonObservers = this.$users.find('li:not([data-observer=true])').length;
		var numVotes = getNumVotes();
		var pct = nonObservers === 0 ? 0 : Math.round((numVotes / nonObservers) * 100);

		this.$progressNow.text(numVotes);
		this.$progressTot.text(nonObservers);
		this.$progressFill.css('width', pct + '%');

		if(voting && nonObservers > 0) {
			this.$progress.addClass('is-active');
		} else {
			this.$progress.removeClass('is-active');
		}
	},

	updateShareCtaVisibility: function() {
		var hasVoters = this.$users.children().length > 0;
		this.$shareCta.toggleClass('is-hidden', hasVoters);
	},

	renderDistribution: function() {
		if(!voteData.distribution || voteData.distribution.length === 0 || voteData.numVotes < 1) {
			this.$distribution.empty().removeClass('is-visible');
			return;
		}

		var nonObservers = this.$users.find('li:not([data-observer=true])').length;

		var present = [];
		var maxCount = 0;
		BP.each(voteData.distribution, function(d) {
			if(d.count > 0) {
				present.push(d);
				if(d.count > maxCount) maxCount = d.count;
			}
		});
		if(present.length === 0) {
			this.$distribution.empty().removeClass('is-visible');
			return;
		}

		var minVal = voteData.min;
		var maxVal = voteData.max;

		// Heights normalize so the tallest bar fills the chart — preserves ratio
		// (2 votes is twice the height of 1). Floor at 28% so single votes remain
		// visually substantial, not hairline. Absolute count is shown above each bar
		// and the "X of N voted" label provides room-size context.
		var html = '<div class="bp-distribution-inner">';
		html += '<div class="bp-distribution-label">';
		html += '<span>Distribution</span>';
		html += '<span class="bp-distribution-count">' + voteData.numVotes + ' of ' + nonObservers + ' voted</span>';
		html += '</div>';
		html += '<div class="bp-distribution-bars">';
		BP.each(present, function(d) {
			var rawPct = (d.count / maxCount) * 100;
			// Lift the floor so a 1 vs 2 split reads as ~50% vs 100%, not 28% vs 56%
			var heightPct = Math.round(28 + (rawPct * 0.72));
			var isMin = d.value === minVal;
			var isMax = d.value === maxVal;
			var classes = 'bp-dist-bar';
			if(isMin) classes += ' is-min';
			if(isMax) classes += ' is-max';
			html += '<div class="' + classes + '" style="--h:' + heightPct + '%">';
			html += '<div class="bp-dist-count">' + d.count + '</div>';
			html += '<div class="bp-dist-fill"></div>';
			html += '<div class="bp-dist-label">' + d.estimate + '</div>';
			html += '</div>';
		});
		html += '</div></div>';

		this.$distribution.html(html).addClass('is-visible');
	},

	hideDistribution: function() {
		this.$distribution.empty().removeClass('is-visible');
	},

	// ── Voter row actions ────────────────────────────────────────
	ಠ_ಠ: function(e, $el) {
		$el.parent().attr('data-observer', $el.parent().attr('data-observer') !== 'true');
		this.updateProgress();
	},

	kickVoter: function(e, $el) {
		socket.emit('kickVoter', {roomId: roomId, uid: $el.parent().data('uid')});
	},

	// ── Round control ────────────────────────────────────────────
	startNewRound: function(e, $el) {
		voting = true;
		this.$recommendation.removeClass('is-discuss is-value');
		this.$recValue.empty();
		this.$recSubtext.empty();
		this.$resultsRow.removeClass('is-visible');
		this.hideDistribution();
		$el.text('Reveal Cards');
		$('html').addClass('voting');

		votes = {};

		// Reset every voter's display and restart their scramble
		var self = this;
		this.$users.find('li').each(function() {
			var uid = $(this).data('uid');
			var $disp = $(this).find('.bp-vote-display');
			$disp.removeClass('is-voted is-revealed bp-celebrate').removeData('finalHTML');
			$disp.find('.bp-vote-final').empty();
			self.startScramble(uid);
		});

		this.updateProgress();

		window.setTimeout(function(){
			socket.emit('newRound', {roomId: roomId, ticket: BP.currentTicket});
		}, 200);
	},

	endCurrentRound: function(e, $el) {
		voting = false;
		$el.text('Begin Estimating');
		$('html').removeClass('voting');

		// Reveal each locked-in value
		var self = this;
		this.$users.find('li').each(function() {
			var $disp = $(this).find('.bp-vote-display');
			var finalHTML = $disp.data('finalHTML');
			if (finalHTML !== undefined && finalHTML !== null) {
				$disp.find('.bp-vote-final').html(finalHTML);
				$disp.removeClass('is-voted').addClass('is-revealed');
			} else {
				// No vote cast — stop scramble and clear any frozen text
				self.stopScramble($(this).data('uid'));
				$disp.find('.bp-scramble').text('');
			}
		});

		processVotes();
		this.updateProgress();

		var outcomeText, nearestText = '';

		if(voteData.numVotes > 1) {
			console.log(votes);
			console.log(voteData);

			outcomeText = voteData.average;
			nearestText = voteData.nearestCard ? voteData.nearestCard.estimate : String(voteData.average);

			// Single authoritative recommendation. Wide spread → DISCUSS instead of a number.
			if (voteData.spread > 3) {
				this.$recommendation.removeClass('is-value').addClass('is-discuss');
				this.$recLabel.text('Let’s');
				this.$recValue.html('Discuss');
				this.$recSubtext.text('Spread is wide — talk it through, then re-vote.');
			} else {
				this.$recommendation.removeClass('is-discuss').addClass('is-value');
				this.$recLabel.text('Should be');
				this.$recValue.html(nearestText);
				this.$recSubtext.empty();
			}

			this.renderDistribution();
			this.$resultsRow.addClass('is-visible');

			if(voteData.numVotes >= 2 && voteData.allVotesEqual){
				this.$users.find('.bp-vote-display.is-revealed').addClass('bp-celebrate');
				this.launchConfetti();
				this.showMarginalia();
			}
		}

		socket.emit('roundEnd',{
			roomId: roomId,
			roundData: voteData,
			outcome: outcomeText,
			nearestCard: nearestText
		});
	},

	// ── Consensus celebration: canvas confetti ───────────────────
	launchConfetti: function() {
		if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		if (typeof window.confetti !== 'function') return;

		// Editorial palette only — no rainbow.
		var colors = ['#5b3df0', '#117a9c', '#e1457c', '#15192a'];
		var defaults = {
			spread: 70,
			ticks: 220,
			gravity: 0.9,
			decay: 0.93,
			startVelocity: 38,
			zIndex: 9999,
			colors: colors,
			scalar: 0.95,
			shapes: ['square']
		};

		// Two side cannons firing inward — classic "joy burst" feel.
		var left = Object.assign({}, defaults, {
			particleCount: 80,
			origin: { x: 0.15, y: 0.75 },
			angle: 60
		});
		var right = Object.assign({}, defaults, {
			particleCount: 80,
			origin: { x: 0.85, y: 0.75 },
			angle: 120
		});
		window.confetti(left);
		window.confetti(right);

		// A small overhead drift for atmosphere
		setTimeout(function() {
			if (typeof window.confetti === 'function') {
				window.confetti(Object.assign({}, defaults, {
					particleCount: 40,
					origin: { x: 0.5, y: 0 },
					angle: 270,
					spread: 120,
					startVelocity: 18,
					gravity: 0.55
				}));
			}
		}, 240);
	},

	// ── Consensus celebration: handwritten marginalia note ───────
	showMarginalia: function() {
		var phrases = ['ship it.', 'bingo.', 'spot on.', 'unanimous.', 'say less.', 'perfect', 'in sync', '🔥', '😎'];
		var phrase  = phrases[Math.floor(Math.random() * phrases.length)];
		var tilt    = (Math.random() * 4 + 2) * (Math.random() < 0.5 ? -1 : 1); // ±2–6°

		$('body > .bp-marginalia').remove();

		var svg =
			'<svg class="bp-marginalia-underline" viewBox="0 0 80 12" preserveAspectRatio="none" aria-hidden="true">' +
				'<path d="M2,7 Q20,2 40,6 T78,5" />' +
			'</svg>';

		var $note = $(
			'<div class="bp-marginalia" style="--tilt:' + tilt.toFixed(2) + 'deg;">' +
				'<span class="bp-marginalia-text">' + phrase + '</span>' +
				svg +
			'</div>'
		);

		$('body').append($note);

		// Trigger entrance after insertion so CSS transition runs
		window.requestAnimationFrame(function() {
			$note.addClass('is-in');
		});

		setTimeout(function() {
			$note.addClass('is-out');
			setTimeout(function() { $note.remove(); }, 600);
		}, 3500);
	},

	toggleRound: function(e, $el) {
		roundStatus = (roundStatus % 2) + 1;
		if(roundStatus === 1) {
			this.startNewRound(e, $el);
		} else if(roundStatus === 2) {
			this.endCurrentRound(e, $el);
		}
	}
});

page.init();
